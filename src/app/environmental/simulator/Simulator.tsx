"use client";

import "leaflet/dist/leaflet.css";
import type * as LeafletNS from "leaflet";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ROUTES,
  SHIP,
  EVENT_TYPES,
  positionAt,
  routeDistanceNm,
  fuelTPerHour,
  haversineNm,
  type Pt,
  type EventType,
} from "@/lib/voyage";
import { COUNTRIES, portByCode } from "@/lib/ports";
import { fmtNum } from "@/lib/format";
import { logVoyageEmission } from "../actions";

type L = typeof LeafletNS;

// ---------- constants ----------
const TICK_MS = 100;
const SIM_HOURS_PER_REAL_SEC = 8;
const AUX_FUEL_T_PER_DAY = 2;
const REROUTE_DELAY_H = 48;
const ONE_OFF = new Set(["ENGINE_FAILURE", "FREIGHT_LOSS", "PIRACY_REROUTE"]);
const RADIUS_BY_TYPE: Record<string, number> = {
  STORM: 220,
  FOULING: 260,
  ENGINE_FAILURE: 130,
  FREIGHT_LOSS: 130,
  PIRACY_REROUTE: 180,
};
const COLOR_BY_TYPE: Record<string, string> = {
  STORM: "#56a2e8",
  ENGINE_FAILURE: "#f17634",
  FREIGHT_LOSS: "#b86200",
  PIRACY_REROUTE: "#ff8383",
  FOULING: "#6e757c",
};

// ---------- helpers ----------
function traversed(waypoints: Pt[], nm: number): Pt[] {
  const out: Pt[] = [waypoints[0]];
  let travelled = 0;
  for (let i = 1; i < waypoints.length; i++) {
    const legNm = haversineNm(waypoints[i - 1], waypoints[i]);
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
function fmtUsd(n: number): string {
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}k`;
  return `$${Math.round(n)}`;
}
function baselineFor(totalNm: number, speedKn: number) {
  const hours = totalNm / speedKn;
  const fuelT = fuelTPerHour(speedKn) * hours;
  const days = hours / 24;
  return { days, fuelT, co2T: fuelT * SHIP.co2PerTonneFuel, costUsd: fuelT * SHIP.fuelUsdPerTonne + SHIP.charterUsdPerDay * days };
}
function worstFor(totalNm: number) {
  const speed = SHIP.cruiseKn * 0.6;
  const sailH = totalNm / speed;
  const sailFuel = fuelTPerHour(speed, 1.6) * sailH;
  const downH = 120;
  const downFuel = (AUX_FUEL_T_PER_DAY * downH) / 24;
  const days = (sailH + downH) / 24;
  const fuelT = sailFuel + downFuel;
  const cargoLoss = SHIP.cargoValueUsd * 0.2;
  return {
    days,
    fuelT,
    co2T: fuelT * SHIP.co2PerTonneFuel,
    costUsd: fuelT * SHIP.fuelUsdPerTonne + SHIP.charterUsdPerDay * days + 800_000 + cargoLoss,
  };
}

type PlacedEvent = { id: number; type: string; def: EventType; lat: number; lng: number; radiusNm: number };
type Snapshot = {
  progressNm: number;
  elapsedHours: number;
  fuelT: number;
  co2T: number;
  costUsd: number;
  currentSpeed: number;
  downtimeLeft: number;
};
const ZERO: Snapshot = { progressNm: 0, elapsedHours: 0, fuelT: 0, co2T: 0, costUsd: 0, currentSpeed: 0, downtimeLeft: 0 };

export function Simulator() {
  const [mode, setMode] = useState<"preset" | "custom">("preset");
  const [presetKey, setPresetKey] = useState<"suez" | "cape">("suez");
  const [startCode, setStartCode] = useState("IN");
  const [destCode, setDestCode] = useState("US");
  const [customWaypoints, setCustomWaypoints] = useState<Pt[]>([]);
  const [drawMode, setDrawMode] = useState(false);
  const [autoLoading, setAutoLoading] = useState(false);

  const [speedKn, setSpeedKn] = useState(20);
  const [multiplier, setMultiplier] = useState(1);
  const [running, setRunning] = useState(false);
  const [events, setEvents] = useState<PlacedEvent[]>([]);
  const [showFlights, setShowFlights] = useState(false);
  const [showVessels, setShowVessels] = useState(false);
  const [display, setDisplay] = useState<Snapshot>(ZERO);
  const [log, setLog] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  const waypoints = useMemo<Pt[]>(() => {
    if (mode === "preset") return ROUTES[presetKey].waypoints;
    const s = portByCode(startCode);
    const d = portByCode(destCode);
    if (!s || !d) return [];
    return [[s.lat, s.lng], ...customWaypoints, [d.lat, d.lng]];
  }, [mode, presetKey, startCode, destCode, customWaypoints]);

  const totalNm = useMemo(() => (waypoints.length >= 2 ? routeDistanceNm(waypoints) : 0), [waypoints]);
  const baseline = useMemo(() => baselineFor(totalNm || 1, speedKn), [totalNm, speedKn]);
  const worst = useMemo(() => worstFor(totalNm || 1), [totalNm]);

  const endpoints = useMemo(() => {
    if (mode === "preset") return { start: "Mumbai (India)", dest: "New York (USA)" };
    const s = portByCode(startCode);
    const d = portByCode(destCode);
    return { start: s ? `${s.port} (${s.name})` : "—", dest: d ? `${d.port} (${d.name})` : "—" };
  }, [mode, startCode, destCode]);

  // ----- refs -----
  const containerRef = useRef<HTMLDivElement | null>(null);
  const Lref = useRef<L | null>(null);
  const mapRef = useRef<LeafletNS.Map | null>(null);
  const routeLineRef = useRef<LeafletNS.Polyline | null>(null);
  const coveredRef = useRef<LeafletNS.Polyline | null>(null);
  const shipRef = useRef<LeafletNS.Marker | null>(null);
  const startMarkerRef = useRef<LeafletNS.Marker | null>(null);
  const destMarkerRef = useRef<LeafletNS.Marker | null>(null);
  const wpLayerRef = useRef<LeafletNS.LayerGroup | null>(null);
  const eventLayerRef = useRef<LeafletNS.LayerGroup | null>(null);
  const flightLayerRef = useRef<LeafletNS.LayerGroup | null>(null);
  const vesselLayerRef = useRef<LeafletNS.LayerGroup | null>(null);

  const simRef = useRef({ ...ZERO, triggered: new Set<number>() });
  const inputsRef = useRef({ waypoints, totalNm, speedKn, multiplier, events });
  const runningRef = useRef(false);
  const completedRef = useRef(false);
  const modeRef = useRef(mode);
  const drawModeRef = useRef(drawMode);
  const idRef = useRef(1);
  const refreshFlightsRef = useRef<() => void>(() => {});
  const refreshVesselsRef = useRef<() => void>(() => {});
  const resetRef = useRef<() => void>(() => {});

  const pushLog = (m: string) => setLog((prev) => [m, ...prev].slice(0, 24));

  useEffect(() => {
    inputsRef.current = { waypoints, totalNm, speedKn, multiplier, events };
  }, [waypoints, totalNm, speedKn, multiplier, events]);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);
  useEffect(() => {
    drawModeRef.current = drawMode;
  }, [drawMode]);

  const emoji = (html: string, size = 20) =>
    Lref.current!.divIcon({ html: `<div style="font-size:${size}px;line-height:${size}px">${html}</div>`, className: "", iconSize: [size + 2, size + 2], iconAnchor: [(size + 2) / 2, (size + 2) / 2] });

  // ----- mount: map + animation loop -----
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

      routeLineRef.current = Lmod.polyline([], { color: "#33383d", weight: 2, dashArray: "4 6" }).addTo(map);
      coveredRef.current = Lmod.polyline([], { color: "#39994b", weight: 3 }).addTo(map);
      wpLayerRef.current = Lmod.layerGroup().addTo(map);
      eventLayerRef.current = Lmod.layerGroup().addTo(map);
      flightLayerRef.current = Lmod.layerGroup().addTo(map);
      vesselLayerRef.current = Lmod.layerGroup().addTo(map);

      startMarkerRef.current = Lmod.marker([0, 0], { icon: emoji("🟢", 16) }).addTo(map);
      destMarkerRef.current = Lmod.marker([0, 0], { icon: emoji("🏁", 16) }).addTo(map);
      shipRef.current = Lmod.marker([0, 0], { icon: emoji("🚢") }).addTo(map).bindTooltip("Cargo ship");

      // click on the sea to draw a custom path
      map.on("click", (e: LeafletNS.LeafletMouseEvent) => {
        if (modeRef.current !== "custom" || !drawModeRef.current || runningRef.current) return;
        setCustomWaypoints((prev) => [...prev, [e.latlng.lat, e.latlng.lng]]);
      });

      const tick = () => {
        if (!runningRef.current) return;
        const inp = inputsRef.current;
        if (inp.totalNm <= 0) return;
        const s = simRef.current;
        const dtH = SIM_HOURS_PER_REAL_SEC * inp.multiplier * (TICK_MS / 1000);

        const shipPos = positionAt(inp.waypoints, s.progressNm);

        // faults by proximity to the ship's current position
        let speedFactor = 1;
        let fuelFactor = 1;
        for (const ev of inp.events) {
          if (haversineNm([ev.lat, ev.lng], shipPos) > ev.radiusNm) continue;
          if (ONE_OFF.has(ev.type)) {
            if (!s.triggered.has(ev.id)) {
              s.triggered.add(ev.id);
              if (ev.type === "ENGINE_FAILURE") {
                s.downtimeLeft += ev.def.effect.downtimeHours;
                s.costUsd += ev.def.effect.extraCostUsd;
                pushLog(`⚙️ Engine failure — ${Math.round(ev.def.effect.downtimeHours / 24)}d adrift, +${fmtUsd(ev.def.effect.extraCostUsd)}`);
              } else if (ev.type === "FREIGHT_LOSS") {
                const loss = ev.def.effect.cargoLossFrac * SHIP.cargoValueUsd;
                s.costUsd += loss;
                pushLog(`📦 Freight lost — ${fmtUsd(loss)} cargo written off`);
              } else if (ev.type === "PIRACY_REROUTE") {
                s.downtimeLeft += REROUTE_DELAY_H;
                s.costUsd += ev.def.effect.extraCostUsd;
                pushLog(`🏴‍☠️ Piracy — convoy/reroute delay, +${fmtUsd(ev.def.effect.extraCostUsd)}`);
              }
            }
          } else {
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

        shipRef.current?.setLatLng(positionAt(inp.waypoints, s.progressNm));
        coveredRef.current?.setLatLngs(traversed(inp.waypoints, s.progressNm) as [number, number][]);

        if (s.progressNm >= inp.totalNm && !completedRef.current) {
          completedRef.current = true;
          runningRef.current = false;
          setRunning(false);
          pushLog("🏁 Voyage complete — arrived at destination");
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

      resetRef.current = () => {
        simRef.current = { ...ZERO, triggered: new Set<number>() };
        completedRef.current = false;
        runningRef.current = false;
        setRunning(false);
        setDisplay(ZERO);
        const wps = inputsRef.current.waypoints;
        if (wps.length) shipRef.current?.setLatLng(wps[0]);
        coveredRef.current?.setLatLngs([]);
      };

      const addPlane = (a: { callsign: string; lat: number; lon: number; track: number; altFt: number; speedKn: number }) => {
        const icon = Lmod.divIcon({ html: `<div style="font-size:16px;transform:rotate(${a.track}deg)">✈️</div>`, className: "", iconSize: [18, 18], iconAnchor: [9, 9] });
        Lmod.marker([a.lat, a.lon], { icon }).addTo(flightLayerRef.current!).bindTooltip(`${a.callsign} · ${Math.round(a.altFt)} ft · ${Math.round(a.speedKn)} kn`);
      };
      const addVessel = (v: { name: string; lat: number; lon: number; type: string; speedKn: number }) => {
        Lmod.marker([v.lat, v.lon], { icon: emoji(v.type === "Tanker" ? "🛢️" : "🚢", 15) }).addTo(vesselLayerRef.current!).bindTooltip(`${v.name} · ${v.type} · ${Math.round(v.speedKn)} kn`);
      };
      refreshFlightsRef.current = async () => {
        try {
          const wps = inputsRef.current.waypoints;
          const c = wps.length ? positionAt(wps, simRef.current.progressNm) : [25, -20];
          const res = await fetch(`/api/flights?lat=${c[0].toFixed(2)}&lon=${c[1].toFixed(2)}&dist=250`);
          const data = await res.json();
          flightLayerRef.current?.clearLayers();
          for (const a of data.aircraft ?? []) addPlane(a);
          if ((data.aircraft ?? []).length) pushLog(`✈️ ${data.aircraft.length} live aircraft near the ship (${data.source})`);
        } catch {
          /* ignore */
        }
      };
      refreshVesselsRef.current = async () => {
        try {
          const wps = inputsRef.current.waypoints;
          const c = wps.length ? positionAt(wps, simRef.current.progressNm) : [25, -20];
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

  // redraw route + waypoint dots + endpoints when the geometry changes
  useEffect(() => {
    const L = Lref.current;
    if (!ready || !L || !mapRef.current || !routeLineRef.current) return;
    routeLineRef.current.setLatLngs(waypoints as [number, number][]);
    if (waypoints.length >= 2) {
      startMarkerRef.current?.setLatLng(waypoints[0]).bindTooltip(endpoints.start);
      destMarkerRef.current?.setLatLng(waypoints[waypoints.length - 1]).bindTooltip(endpoints.dest);
    }
    // draggable custom waypoint dots
    wpLayerRef.current?.clearLayers();
    if (mode === "custom") {
      customWaypoints.forEach((p, i) => {
        const dot = L.marker(p, {
          draggable: true,
          icon: L.divIcon({ html: `<div style="width:12px;height:12px;border-radius:50%;background:#39994b;border:2px solid #0b0b0b;box-shadow:0 0 4px #39994b"></div>`, className: "", iconSize: [12, 12], iconAnchor: [6, 6] }),
        }).addTo(wpLayerRef.current!);
        dot.on("dragend", () => {
          const ll = dot.getLatLng();
          setCustomWaypoints((prev) => prev.map((q, j) => (j === i ? [ll.lat, ll.lng] : q)));
        });
        dot.on("dblclick", () => setCustomWaypoints((prev) => prev.filter((_, j) => j !== i)));
      });
    }
    if (!runningRef.current) {
      resetRef.current();
      if (waypoints.length >= 2) mapRef.current.fitBounds(routeLineRef.current.getBounds().pad(0.15));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waypoints, mode, ready]);

  // draggable fault zones (marker + radius circle)
  useEffect(() => {
    const L = Lref.current;
    if (!ready || !L || !eventLayerRef.current) return;
    const layer = eventLayerRef.current;
    layer.clearLayers();
    for (const ev of events) {
      const color = COLOR_BY_TYPE[ev.type] ?? "#6e757c";
      const circle = L.circle([ev.lat, ev.lng], { radius: ev.radiusNm * 1852, color, weight: 1, fillColor: color, fillOpacity: 0.12 }).addTo(layer);
      const marker = L.marker([ev.lat, ev.lng], { draggable: true, icon: emoji(ev.def.icon) }).addTo(layer).bindTooltip(`${ev.def.label} — drag me, double-click to remove`);
      marker.on("drag", () => circle.setLatLng(marker.getLatLng()));
      marker.on("dragend", () => {
        const ll = marker.getLatLng();
        setEvents((prev) => prev.map((e) => (e.id === ev.id ? { ...e, lat: ll.lat, lng: ll.lng } : e)));
      });
      marker.on("dblclick", () => setEvents((prev) => prev.filter((e) => e.id !== ev.id)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, ready]);

  // live overlays
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

  // ----- actions -----
  const canSail = totalNm > 0;
  const play = () => {
    if (!canSail) return;
    if (completedRef.current) resetRef.current();
    setDrawMode(false);
    runningRef.current = true;
    setRunning(true);
  };
  const pause = () => {
    runningRef.current = false;
    setRunning(false);
  };
  const dropFault = (type: string) => {
    if (!mapRef.current) return;
    const def = EVENT_TYPES.find((e) => e.type === type);
    if (!def) return;
    const c = mapRef.current.getCenter();
    const id = idRef.current++;
    setEvents((prev) => [...prev, { id, type, def, lat: c.lat, lng: c.lng, radiusNm: RADIUS_BY_TYPE[type] ?? 180 }]);
    pushLog(`${def.icon} ${def.label} dropped — drag it onto the ship's path`);
  };

  // Best-efficient sea route (avoids land, follows shipping lanes) via searoute-js.
  const autoRoute = async () => {
    const s = portByCode(startCode);
    const d = portByCode(destCode);
    if (!s || !d || runningRef.current) return;
    setAutoLoading(true);
    try {
      const res = await fetch(`/api/searoute?fromLat=${s.lat}&fromLng=${s.lng}&toLat=${d.lat}&toLng=${d.lng}`);
      const data = await res.json();
      if (Array.isArray(data.waypoints) && data.waypoints.length >= 2) {
        setCustomWaypoints(data.waypoints.slice(1, -1));
        setDrawMode(false);
        pushLog(`🧭 Auto sea route — ${fmtNum(data.lengthNm)} nm via ${data.count} waypoints`);
      } else {
        pushLog("🧭 No sea route found for this pair");
      }
    } catch {
      pushLog("🧭 Sea route lookup failed");
    } finally {
      setAutoLoading(false);
    }
  };

  // Auto-compute the sea route whenever a custom country pair is chosen.
  useEffect(() => {
    if (mode !== "custom" || runningRef.current) return;
    autoRoute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, startCode, destCode]);

  const fraction = totalNm > 0 ? display.progressNm / totalNm : 0;
  const days = display.elapsedHours / 24;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {/* Map + controls */}
      <div className="lg:col-span-2">
        <div ref={containerRef} className="h-[520px] w-full overflow-hidden rounded-xl border border-border" />

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button onClick={running ? pause : play} disabled={!canSail} className={running ? "btn-ghost" : "btn-primary"}>
            {running ? "⏸ Pause" : completedRef.current ? "↻ Replay" : "▶ Sail"}
          </button>
          <button onClick={() => resetRef.current()} className="btn-ghost">↺ Reset</button>
          <span className="ml-1 text-xs text-faint">Time:</span>
          {[1, 3, 10].map((m) => (
            <button key={m} onClick={() => setMultiplier(m)} className={`rounded-lg px-2.5 py-1 text-sm ${multiplier === m ? "bg-env text-bg" : "btn-ghost"}`}>
              {m}×
            </button>
          ))}
          <input type="number" min={1} max={100} value={multiplier} onChange={(e) => setMultiplier(Math.max(1, Math.min(100, Number(e.target.value) || 1)))} className="input w-16" aria-label="Custom time multiplier" />
          <label className="ml-1 flex items-center gap-1.5 text-xs text-faint">
            <input type="checkbox" checked={showFlights} onChange={(e) => setShowFlights(e.target.checked)} /> ✈️ Flights
          </label>
          <label className="flex items-center gap-1.5 text-xs text-faint">
            <input type="checkbox" checked={showVessels} onChange={(e) => setShowVessels(e.target.checked)} /> 🚢 Vessels
          </label>
        </div>

        {/* Voyage setup */}
        <div className="panel-2 mt-3 p-3">
          <div className="mb-2 flex gap-2">
            {(["preset", "custom"] as const).map((m) => (
              <button key={m} onClick={() => setMode(m)} disabled={running} className={`flex-1 rounded-lg px-3 py-1.5 text-sm ${mode === m ? "bg-env text-bg" : "btn-ghost"}`}>
                {m === "preset" ? "Preset: India → USA" : "Custom route"}
              </button>
            ))}
          </div>

          {mode === "preset" ? (
            <div className="flex gap-2">
              {(["suez", "cape"] as const).map((k) => (
                <button key={k} onClick={() => setPresetKey(k)} disabled={running} className={`flex-1 rounded-lg px-3 py-1.5 text-sm ${presetKey === k ? "bg-env text-bg" : "btn-ghost"}`}>
                  {ROUTES[k].label}
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label">From</label>
                  <select value={startCode} onChange={(e) => setStartCode(e.target.value)} disabled={running} className="input">
                    {COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>{c.name} — {c.port}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">To</label>
                  <select value={destCode} onChange={(e) => setDestCode(e.target.value)} disabled={running} className="input">
                    {COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>{c.name} — {c.port}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button onClick={autoRoute} disabled={running || autoLoading} className="rounded-lg bg-overall px-3 py-1.5 text-sm font-medium text-bg disabled:opacity-50">
                  {autoLoading ? "🧭 Routing…" : "🧭 Auto sea route"}
                </button>
                <button onClick={() => setDrawMode((d) => !d)} disabled={running} className={`rounded-lg px-3 py-1.5 text-sm ${drawMode ? "bg-social text-bg" : "btn-ghost"}`}>
                  {drawMode ? "✏️ Drawing… click the sea" : "✏️ Draw path"}
                </button>
                <button onClick={() => setCustomWaypoints((p) => p.slice(0, -1))} disabled={running || !customWaypoints.length} className="btn-ghost text-sm">Undo point</button>
                <button onClick={() => setCustomWaypoints([])} disabled={running || !customWaypoints.length} className="btn-ghost text-sm">Clear path</button>
                <span className="text-xs text-faint">{customWaypoints.length} waypoint{customWaypoints.length === 1 ? "" : "s"} · drag dots to adjust</span>
              </div>
            </div>
          )}
        </div>

        {/* Speed */}
        <div className="panel-2 mt-3 p-3">
          <div className="label">Cruise speed: {speedKn} kn</div>
          <input type="range" min={8} max={26} value={speedKn} onChange={(e) => setSpeedKn(Number(e.target.value))} className="w-full accent-env" />
          <div className="mt-1 text-xs text-faint">{SHIP.name} · fuel burn scales with speed³</div>
        </div>
      </div>

      {/* Dashboard + faults + log */}
      <div className="space-y-4">
        <div className="panel p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink">Live Voyage Dashboard</h2>
            <span className="text-xs text-faint">{Math.round(fraction * 100)}% · {display.downtimeLeft > 0 ? "⚓ stopped" : `${Math.round(display.currentSpeed)} kn`}</span>
          </div>
          <div className="mb-1 text-xs text-faint">{endpoints.start} → {endpoints.dest}</div>
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
              <input type="hidden" name="reference" value={`Voyage ${endpoints.start}→${endpoints.dest}`} />
              <button className="btn-primary w-full">Log this voyage → Carbon Transactions</button>
            </form>
          )}
        </div>

        <div className="panel p-4">
          <h2 className="mb-2 text-sm font-semibold text-ink">Scenario bounds</h2>
          <div className="space-y-1.5 text-xs">
            <Row label="Baseline (clear run)" co2={baseline.co2T} cost={baseline.costUsd} days={baseline.days} />
            <Row label="Worst case (all faults)" co2={worst.co2T} cost={worst.costUsd} days={worst.days} danger />
          </div>
        </div>

        <div className="panel p-4">
          <h2 className="mb-1 text-sm font-semibold text-ink">Drag-and-drop maritime faults</h2>
          <p className="mb-2 text-[11px] text-faint">Drop a fault, then drag its zone onto the route. The ship reacts live as it sails through — even mid-voyage. Double-click a marker to remove it.</p>
          <div className="grid grid-cols-1 gap-1.5">
            {EVENT_TYPES.map((ev) => (
              <button key={ev.type} onClick={() => dropFault(ev.type)} className="flex items-center gap-2 rounded-lg border border-border bg-panel2 px-2.5 py-1.5 text-left text-xs text-muted hover:text-ink">
                <span className="text-base">{ev.icon}</span>
                <span className="flex-1">
                  <span className="font-medium text-ink">Drop {ev.label}</span>
                  <span className="block text-[10px] text-faint">{ev.description}</span>
                </span>
              </button>
            ))}
          </div>
          {events.length > 0 && (
            <button onClick={() => setEvents([])} className="btn-ghost mt-2 w-full text-xs">Clear {events.length} fault zone{events.length > 1 ? "s" : ""}</button>
          )}
        </div>

        <div className="panel p-4">
          <h2 className="mb-2 text-sm font-semibold text-ink">Event log</h2>
          {log.length ? (
            <ul className="max-h-40 space-y-1 overflow-y-auto text-xs text-muted">
              {log.map((l, i) => (
                <li key={i}>{l}</li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-faint">Set a route, then press Sail.</p>
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
