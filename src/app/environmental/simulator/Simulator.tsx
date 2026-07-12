"use client";

import "leaflet/dist/leaflet.css";
import type * as LeafletNS from "leaflet";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ROUTES,
  SHIP,
  EVENT_TYPES,
  baselineVoyage,
  worstCase,
  positionAt,
  routeDistanceNm,
  fuelTPerHour,
  type Pt,
  type EventType,
} from "@/lib/voyage";
import { fmtNum } from "@/lib/format";
import { logVoyageEmission } from "../actions";

type L = typeof LeafletNS;

// ---------- constants ----------
const TICK_MS = 100;
const SIM_HOURS_PER_REAL_SEC = 8; // 1x speed: 8 voyage-hours per real second
const AUX_FUEL_T_PER_DAY = 2; // generators while the ship is stopped
const STORM_SPAN = 0.05; // storms affect ~5% of the route length
const REROUTE_DELAY_H = 48;
const ONE_OFF = new Set(["ENGINE_FAILURE", "FREIGHT_LOSS", "PIRACY_REROUTE"]);

// ---------- pure helpers ----------
// The path already sailed: full waypoints passed so far, plus the current point.
function traversed(waypoints: Pt[], nm: number): Pt[] {
  const out: Pt[] = [waypoints[0]];
  let travelled = 0;
  for (let i = 1; i < waypoints.length; i++) {
    const legNm = distNm(waypoints[i - 1], waypoints[i]);
    if (travelled + legNm < nm) {
      out.push(waypoints[i]);
      travelled += legNm;
    } else {
      out.push(positionAt(waypoints, nm));
      return out;
    }
  }
  return out;
}
function distNm(a: Pt, b: Pt): number {
  // small local haversine for the covered-path walk
  const R = 3440.065;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}
function nearestFraction(waypoints: Pt[], totalNm: number, lat: number, lng: number): number {
  const N = 240;
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i <= N; i++) {
    const f = i / N;
    const p = positionAt(waypoints, f * totalNm);
    const d = (p[0] - lat) ** 2 + (p[1] - lng) ** 2;
    if (d < bestD) {
      bestD = d;
      best = f;
    }
  }
  return best;
}
function fmtUsd(n: number): string {
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}k`;
  return `$${Math.round(n)}`;
}

type PlacedEvent = { id: number; type: string; atFraction: number; def: EventType };
type Snapshot = {
  progressNm: number;
  elapsedHours: number;
  fuelT: number;
  co2T: number;
  costUsd: number;
  currentSpeed: number;
  downtimeLeft: number;
};
const ZERO: Snapshot = {
  progressNm: 0,
  elapsedHours: 0,
  fuelT: 0,
  co2T: 0,
  costUsd: 0,
  currentSpeed: 0,
  downtimeLeft: 0,
};

export function Simulator() {
  // ----- controls (React state) -----
  const [routeKey, setRouteKey] = useState<"suez" | "cape">("suez");
  const [speedKn, setSpeedKn] = useState(20);
  const [multiplier, setMultiplier] = useState(1);
  const [running, setRunning] = useState(false);
  const [armed, setArmed] = useState<string | null>(null);
  const [events, setEvents] = useState<PlacedEvent[]>([]);
  const [showFlights, setShowFlights] = useState(false);
  const [showVessels, setShowVessels] = useState(false);
  const [display, setDisplay] = useState<Snapshot>(ZERO);
  const [log, setLog] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  const route = ROUTES[routeKey];
  const totalNm = useMemo(() => routeDistanceNm(route.waypoints), [route]);
  const baseline = useMemo(() => baselineVoyage(routeKey, speedKn), [routeKey, speedKn]);
  const worst = useMemo(() => worstCase(routeKey), [routeKey]);

  // ----- refs shared with the animation loop -----
  const containerRef = useRef<HTMLDivElement | null>(null);
  const Lref = useRef<L | null>(null);
  const mapRef = useRef<LeafletNS.Map | null>(null);
  const routeLineRef = useRef<LeafletNS.Polyline | null>(null);
  const coveredRef = useRef<LeafletNS.Polyline | null>(null);
  const shipRef = useRef<LeafletNS.Marker | null>(null);
  const eventLayerRef = useRef<LeafletNS.LayerGroup | null>(null);
  const flightLayerRef = useRef<LeafletNS.LayerGroup | null>(null);
  const vesselLayerRef = useRef<LeafletNS.LayerGroup | null>(null);

  const simRef = useRef({ ...ZERO, prevFraction: 0, triggered: new Set<number>() });
  const inputsRef = useRef({ waypoints: route.waypoints, totalNm, speedKn, multiplier, events });
  const runningRef = useRef(false);
  const completedRef = useRef(false);
  const armedRef = useRef<string | null>(null);
  const idRef = useRef(1);
  const refreshFlightsRef = useRef<() => void>(() => {});
  const refreshVesselsRef = useRef<() => void>(() => {});
  const resetRef = useRef<() => void>(() => {});

  const pushLog = (m: string) => setLog((prev) => [m, ...prev].slice(0, 24));

  // keep inputs in sync for the loop
  useEffect(() => {
    inputsRef.current = { waypoints: route.waypoints, totalNm, speedKn, multiplier, events };
  }, [route, totalNm, speedKn, multiplier, events]);
  useEffect(() => {
    armedRef.current = armed;
  }, [armed]);

  const emoji = (html: string) =>
    Lref.current!.divIcon({ html: `<div style="font-size:20px;line-height:20px">${html}</div>`, className: "", iconSize: [22, 22], iconAnchor: [11, 11] });

  // ----- map init + animation loop (mount once) -----
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    let cancelled = false;

    (async () => {
      const mod = await import("leaflet");
      const Lmod = (mod.default ?? mod) as unknown as L;
      if (cancelled || !containerRef.current) return;
      Lref.current = Lmod;

      const map = Lmod.map(containerRef.current, { center: [25, -20], zoom: 3, worldCopyJump: true, minZoom: 2 });
      mapRef.current = map;
      Lmod.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: "&copy; OpenStreetMap &copy; CARTO",
        subdomains: "abcd",
        maxZoom: 19,
      }).addTo(map);

      routeLineRef.current = Lmod.polyline(route.waypoints, { color: "#33383d", weight: 2, dashArray: "4 6" }).addTo(map);
      coveredRef.current = Lmod.polyline([], { color: "#39994b", weight: 3 }).addTo(map);
      eventLayerRef.current = Lmod.layerGroup().addTo(map);
      flightLayerRef.current = Lmod.layerGroup().addTo(map);
      vesselLayerRef.current = Lmod.layerGroup().addTo(map);

      const first = route.waypoints[0];
      const last = route.waypoints[route.waypoints.length - 1];
      Lmod.marker(first, { icon: emoji("🇮🇳") }).addTo(map).bindTooltip("Mumbai");
      Lmod.marker(last, { icon: emoji("🇺🇸") }).addTo(map).bindTooltip("New York");
      shipRef.current = Lmod.marker(first, { icon: emoji("🚢") }).addTo(map).bindTooltip("Cargo ship");
      map.fitBounds(routeLineRef.current.getBounds().pad(0.15));

      // place events by clicking the map when a fault is armed
      map.on("click", (e: LeafletNS.LeafletMouseEvent) => {
        const type = armedRef.current;
        if (!type) return;
        const inp = inputsRef.current;
        const f = nearestFraction(inp.waypoints, inp.totalNm, e.latlng.lat, e.latlng.lng);
        addEvent(type, f);
        setArmed(null);
      });

      const addEvent = (type: string, atFraction: number) => {
        const def = EVENT_TYPES.find((x) => x.type === type);
        if (!def) return;
        const id = idRef.current++;
        const pos = positionAt(inputsRef.current.waypoints, atFraction * inputsRef.current.totalNm);
        Lmod.marker(pos, { icon: emoji(def.icon) })
          .addTo(eventLayerRef.current!)
          .bindTooltip(`${def.label} @ ${Math.round(atFraction * 100)}%`);
        setEvents((prev) => [...prev, { id, type, atFraction, def }]);
        pushLog(`${def.icon} ${def.label} placed at ${Math.round(atFraction * 100)}% of route`);
      };

      // ---- the tick ----
      const tick = () => {
        if (!runningRef.current) return;
        const inp = inputsRef.current;
        const s = simRef.current;
        const dtH = SIM_HOURS_PER_REAL_SEC * inp.multiplier * (TICK_MS / 1000);
        const fraction = s.progressNm / inp.totalNm;

        // one-off faults when the ship crosses their marker
        for (const ev of inp.events) {
          if (ONE_OFF.has(ev.type) && !s.triggered.has(ev.id) && s.prevFraction < ev.atFraction && fraction >= ev.atFraction) {
            s.triggered.add(ev.id);
            if (ev.type === "ENGINE_FAILURE") {
              s.downtimeLeft += ev.def.effect.downtimeHours;
              s.costUsd += ev.def.effect.extraCostUsd;
              pushLog(`⚙️ Engine failure — ${Math.round(ev.def.effect.downtimeHours / 24)}d adrift, +${fmtUsd(ev.def.effect.extraCostUsd)} repairs`);
            } else if (ev.type === "FREIGHT_LOSS") {
              const loss = ev.def.effect.cargoLossFrac * SHIP.cargoValueUsd;
              s.costUsd += loss;
              pushLog(`📦 Freight lost — ${fmtUsd(loss)} cargo written off`);
            } else if (ev.type === "PIRACY_REROUTE") {
              s.downtimeLeft += REROUTE_DELAY_H;
              s.costUsd += ev.def.effect.extraCostUsd;
              pushLog(`🏴‍☠️ Piracy risk — convoy/reroute delay, +${fmtUsd(ev.def.effect.extraCostUsd)} security`);
            }
          }
        }

        // ongoing faults (storm patch / persistent fouling)
        let speedFactor = 1;
        let fuelFactor = 1;
        for (const ev of inp.events) {
          const on =
            ev.type === "STORM"
              ? fraction >= ev.atFraction && fraction <= ev.atFraction + STORM_SPAN
              : ev.type === "FOULING"
                ? fraction >= ev.atFraction
                : false;
          if (on) {
            speedFactor *= ev.def.effect.speedFactor;
            fuelFactor *= ev.def.effect.fuelFactor;
          }
        }

        const charterPerHour = SHIP.charterUsdPerDay / 24;
        if (s.downtimeLeft > 0) {
          const fuel = (AUX_FUEL_T_PER_DAY / 24) * dtH;
          s.fuelT += fuel;
          s.co2T += fuel * SHIP.co2PerTonneFuel;
          s.costUsd += fuel * SHIP.fuelUsdPerTonne + charterPerHour * dtH;
          s.elapsedHours += dtH;
          s.downtimeLeft = Math.max(0, s.downtimeLeft - dtH);
          s.currentSpeed = 0;
        } else {
          const spd = inp.speedKn * speedFactor;
          let dist = spd * dtH;
          if (s.progressNm + dist > inp.totalNm) dist = inp.totalNm - s.progressNm;
          s.progressNm += dist;
          const fuel = fuelTPerHour(spd, fuelFactor) * dtH;
          s.fuelT += fuel;
          s.co2T += fuel * SHIP.co2PerTonneFuel;
          s.costUsd += fuel * SHIP.fuelUsdPerTonne + charterPerHour * dtH;
          s.elapsedHours += dtH;
          s.currentSpeed = spd;
        }
        s.prevFraction = s.progressNm / inp.totalNm;

        const pos = positionAt(inp.waypoints, s.progressNm);
        shipRef.current?.setLatLng(pos);
        coveredRef.current?.setLatLngs(traversed(inp.waypoints, s.progressNm) as [number, number][]);

        if (s.progressNm >= inp.totalNm && !completedRef.current) {
          completedRef.current = true;
          runningRef.current = false;
          setRunning(false);
          pushLog("🏁 Voyage complete — arrived New York");
        }

        setDisplay({
          progressNm: s.progressNm,
          elapsedHours: s.elapsedHours,
          fuelT: s.fuelT,
          co2T: s.co2T,
          costUsd: s.costUsd,
          currentSpeed: s.currentSpeed,
          downtimeLeft: s.downtimeLeft,
        });
      };

      // ---- reset (also used by button / route change) ----
      resetRef.current = () => {
        simRef.current = { ...ZERO, prevFraction: 0, triggered: new Set<number>() };
        completedRef.current = false;
        runningRef.current = false;
        setRunning(false);
        setDisplay(ZERO);
        shipRef.current?.setLatLng(inputsRef.current.waypoints[0]);
        coveredRef.current?.setLatLngs([]);
      };

      // ---- live overlays ----
      const addPlane = (a: { callsign: string; lat: number; lon: number; track: number; altFt: number; speedKn: number }) => {
        const icon = Lmod.divIcon({
          html: `<div style="font-size:16px;transform:rotate(${a.track}deg)">✈️</div>`,
          className: "",
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        });
        Lmod.marker([a.lat, a.lon], { icon })
          .addTo(flightLayerRef.current!)
          .bindTooltip(`${a.callsign} · ${Math.round(a.altFt)} ft · ${Math.round(a.speedKn)} kn`);
      };
      const addVessel = (v: { name: string; lat: number; lon: number; type: string; speedKn: number }) => {
        Lmod.marker([v.lat, v.lon], { icon: emoji(v.type === "Tanker" ? "🛢️" : "🚢") })
          .addTo(vesselLayerRef.current!)
          .bindTooltip(`${v.name} · ${v.type} · ${Math.round(v.speedKn)} kn`);
      };
      refreshFlightsRef.current = async () => {
        try {
          const c = positionAt(inputsRef.current.waypoints, simRef.current.progressNm);
          const res = await fetch(`/api/flights?lat=${c[0].toFixed(2)}&lon=${c[1].toFixed(2)}&dist=250`);
          const data = await res.json();
          flightLayerRef.current?.clearLayers();
          for (const a of data.aircraft ?? []) addPlane(a);
          if ((data.aircraft ?? []).length) pushLog(`✈️ ${data.aircraft.length} live aircraft near the ship (${data.source})`);
        } catch {
          /* offline / rate limited — ignore */
        }
      };
      refreshVesselsRef.current = async () => {
        try {
          const c = positionAt(inputsRef.current.waypoints, simRef.current.progressNm);
          const res = await fetch(`/api/vessels?lat=${c[0].toFixed(2)}&lon=${c[1].toFixed(2)}&dist=300`);
          const data = await res.json();
          vesselLayerRef.current?.clearLayers();
          for (const v of data.vessels ?? []) addVessel(v);
        } catch {
          /* ignore */
        }
      };

      interval = setInterval(tick, TICK_MS);
      setReady(true);
    })();

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // redraw + reset when the route changes
  useEffect(() => {
    if (!ready || !routeLineRef.current || !mapRef.current) return;
    routeLineRef.current.setLatLngs(route.waypoints);
    mapRef.current.fitBounds(routeLineRef.current.getBounds().pad(0.15));
    eventLayerRef.current?.clearLayers();
    setEvents([]);
    resetRef.current();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeKey, ready]);

  // flight overlay polling
  useEffect(() => {
    if (!ready) return;
    if (!showFlights) {
      flightLayerRef.current?.clearLayers();
      return;
    }
    refreshFlightsRef.current();
    const id = setInterval(() => refreshFlightsRef.current(), 20000);
    return () => clearInterval(id);
  }, [showFlights, ready]);

  // vessel overlay polling
  useEffect(() => {
    if (!ready) return;
    if (!showVessels) {
      vesselLayerRef.current?.clearLayers();
      return;
    }
    refreshVesselsRef.current();
    const id = setInterval(() => refreshVesselsRef.current(), 20000);
    return () => clearInterval(id);
  }, [showVessels, ready]);

  // ----- derived display -----
  const fraction = totalNm > 0 ? display.progressNm / totalNm : 0;
  const days = display.elapsedHours / 24;
  const play = () => {
    if (completedRef.current) resetRef.current();
    runningRef.current = true;
    setRunning(true);
  };
  const pause = () => {
    runningRef.current = false;
    setRunning(false);
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {/* Map */}
      <div className="lg:col-span-2">
        <div ref={containerRef} className="h-[520px] w-full overflow-hidden rounded-xl border border-border" />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button onClick={running ? pause : play} className={running ? "btn-ghost" : "btn-primary"}>
            {running ? "⏸ Pause" : completedRef.current ? "↻ Replay" : "▶ Sail"}
          </button>
          <button onClick={() => resetRef.current()} className="btn-ghost">↺ Reset</button>
          <div className="ml-2 flex items-center gap-1 text-xs text-faint">Speed:</div>
          {[1, 3, 10].map((m) => (
            <button key={m} onClick={() => setMultiplier(m)} className={`rounded-lg px-2.5 py-1 text-sm ${multiplier === m ? "bg-env text-bg" : "btn-ghost"}`}>
              {m}×
            </button>
          ))}
          <input
            type="number"
            min={1}
            max={100}
            value={multiplier}
            onChange={(e) => setMultiplier(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
            className="input w-20"
            aria-label="Custom time multiplier"
          />
          <label className="ml-2 flex items-center gap-1.5 text-xs text-faint">
            <input type="checkbox" checked={showFlights} onChange={(e) => setShowFlights(e.target.checked)} /> ✈️ Live flights
          </label>
          <label className="flex items-center gap-1.5 text-xs text-faint">
            <input type="checkbox" checked={showVessels} onChange={(e) => setShowVessels(e.target.checked)} /> 🚢 Vessels
          </label>
        </div>

        {/* Route + speed */}
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="panel-2 p-3">
            <div className="label">Route (Mumbai → New York)</div>
            <div className="flex gap-2">
              {(["suez", "cape"] as const).map((k) => (
                <button key={k} onClick={() => setRouteKey(k)} className={`flex-1 rounded-lg px-3 py-1.5 text-sm ${routeKey === k ? "bg-env text-bg" : "btn-ghost"}`}>
                  {ROUTES[k].label}
                </button>
              ))}
            </div>
          </div>
          <div className="panel-2 p-3">
            <div className="label">Cruise speed: {speedKn} kn</div>
            <input type="range" min={8} max={26} value={speedKn} onChange={(e) => setSpeedKn(Number(e.target.value))} className="w-full accent-env" />
            <div className="mt-1 text-xs text-faint">{SHIP.name} · fuel burn scales with speed³</div>
          </div>
        </div>
      </div>

      {/* Right column: dashboard + faults + log */}
      <div className="space-y-4">
        {/* Live dashboard */}
        <div className="panel p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink">Live Voyage Dashboard</h2>
            <span className="text-xs text-faint">{Math.round(fraction * 100)}% · {display.downtimeLeft > 0 ? "⚓ stopped" : `${Math.round(display.currentSpeed)} kn`}</span>
          </div>
          <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-panel2">
            <div className="h-full rounded-full bg-env" style={{ width: `${Math.round(fraction * 100)}%` }} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Tile label="Sim time" value={`${days.toFixed(1)} d`} />
            <Tile label="Distance" value={`${fmtNum(display.progressNm)} / ${fmtNum(totalNm)} nm`} />
            <Tile label="Fuel burned" value={`${fmtNum(display.fuelT)} t`} accent="text-env" />
            <Tile label="CO₂ emitted" value={`${fmtNum(display.co2T)} t`} accent="text-env" />
            <Tile label="Cost" value={fmtUsd(display.costUsd)} accent="text-social" />
            <Tile label="vs baseline CO₂" value={`+${fmtNum(Math.max(0, display.co2T - baseline.co2T))} t`} accent="text-warn" />
          </div>
          {completedRef.current && display.co2T > 0 && (
            <form action={logVoyageEmission} className="mt-3">
              <input type="hidden" name="co2Kg" value={Math.round(display.co2T * 1000)} />
              <input type="hidden" name="fuelT" value={Math.round(display.fuelT)} />
              <input type="hidden" name="reference" value={`Voyage Mumbai→New York (${routeKey}) — ${SHIP.name}`} />
              <button className="btn-primary w-full">Log this voyage → Carbon Transactions</button>
            </form>
          )}
        </div>

        {/* Baseline vs worst-case */}
        <div className="panel p-4">
          <h2 className="mb-2 text-sm font-semibold text-ink">Scenario bounds</h2>
          <div className="space-y-1.5 text-xs">
            <Row label="Baseline (clear run)" co2={baseline.co2T} cost={baseline.costUsd} days={baseline.days} />
            <Row label="Worst case (all faults)" co2={worst.co2T} cost={worst.costUsd} days={worst.days} danger />
          </div>
          <p className="mt-2 text-[11px] text-faint">Worst case assumes storm-grade drag, engine downtime, piracy reroute via the Cape, plus repair, insurance & 20% cargo loss.</p>
        </div>

        {/* Fault injection */}
        <div className="panel p-4">
          <h2 className="mb-1 text-sm font-semibold text-ink">Inject a maritime fault</h2>
          <p className="mb-2 text-[11px] text-faint">Pick a fault, then click the route on the map to place it. The ship reacts as it passes.</p>
          <div className="grid grid-cols-1 gap-1.5">
            {EVENT_TYPES.map((ev) => (
              <button
                key={ev.type}
                onClick={() => setArmed(armed === ev.type ? null : ev.type)}
                className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left text-xs transition-colors ${armed === ev.type ? "border-env bg-env/10 text-ink" : "border-border bg-panel2 text-muted hover:text-ink"}`}
              >
                <span className="text-base">{ev.icon}</span>
                <span className="flex-1">
                  <span className="font-medium text-ink">{ev.label}</span>
                  <span className="block text-[10px] text-faint">{ev.description}</span>
                </span>
              </button>
            ))}
          </div>
          {events.length > 0 && (
            <button onClick={() => { setEvents([]); eventLayerRef.current?.clearLayers(); }} className="btn-ghost mt-2 w-full text-xs">
              Clear {events.length} placed fault{events.length > 1 ? "s" : ""}
            </button>
          )}
        </div>

        {/* Event log */}
        <div className="panel p-4">
          <h2 className="mb-2 text-sm font-semibold text-ink">Event log</h2>
          {log.length ? (
            <ul className="max-h-40 space-y-1 overflow-y-auto text-xs text-muted">
              {log.map((l, i) => (
                <li key={i}>{l}</li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-faint">Press Sail to start the voyage.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function Tile({ label, value, accent = "text-ink" }: { label: string; value: string; accent?: string }) {
  return (
    <div className="panel-2 p-2.5">
      <div className="text-[11px] text-faint">{label}</div>
      <div className={`mt-0.5 text-sm font-semibold ${accent}`}>{value}</div>
    </div>
  );
}

function Row({ label, co2, cost, days, danger = false }: { label: string; co2: number; cost: number; days: number; danger?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={danger ? "text-danger" : "text-muted"}>{label}</span>
      <span className="text-faint">
        {fmtNum(days, 0)} d · {fmtNum(co2)} t · {fmtUsd(cost)}
      </span>
    </div>
  );
}
