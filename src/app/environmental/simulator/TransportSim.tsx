"use client";

import "leaflet/dist/leaflet.css";
import type * as LeafletNS from "leaflet";
import { useEffect, useMemo, useRef, useState } from "react";
import { positionAt, routeDistanceNm, haversineNm, type Pt } from "@/lib/voyage";
import { greatCircle } from "@/lib/greatcircle";
import { COUNTRIES, portByCode } from "@/lib/ports";
import { fmtNum } from "@/lib/format";
import { logVoyageEmission } from "../actions";
import type { SimProfile, Fault } from "@/lib/sim/types";

type L = typeof LeafletNS;

const TICK_MS = 100;
const SIM_HOURS_PER_REAL_SEC = 8;

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
function baselineFor(totalNm: number, speedKn: number, p: SimProfile) {
  const hours = totalNm / speedKn;
  const fuel = p.fuelPerHour(speedKn) * hours;
  const days = hours / 24;
  return { days, fuel, co2T: fuel * p.co2PerFuel, costUsd: fuel * p.fuelPrice + p.charterPerDay * days };
}
function worstFor(totalNm: number, p: SimProfile) {
  const sog = p.cruiseKn * 0.6;
  const sailH = totalNm / sog;
  const sailFuel = p.fuelPerHour(p.cruiseKn, 1.8) * sailH;
  const downH = p.worstDowntimeHours;
  const downFuel = (p.auxFuelPerDay * downH) / 24;
  const days = (sailH + downH) / 24;
  const fuel = sailFuel + downFuel;
  const cargoLoss = p.cargoValue * 0.2;
  return {
    days,
    fuel,
    co2T: fuel * p.co2PerFuel,
    costUsd: fuel * p.fuelPrice + p.charterPerDay * days + p.worstExtraCostUsd + cargoLoss,
  };
}

type PlacedEvent = { id: number; def: Fault; lat: number; lng: number; radiusNm: number };
type Snapshot = { progressNm: number; elapsedHours: number; fuel: number; co2T: number; costUsd: number; currentSpeed: number; downtimeLeft: number };
const ZERO: Snapshot = { progressNm: 0, elapsedHours: 0, fuel: 0, co2T: 0, costUsd: 0, currentSpeed: 0, downtimeLeft: 0 };

export function TransportSim({ profile, departments }: { profile: SimProfile; departments: { id: string; name: string }[] }) {
  const [startCode, setStartCode] = useState("IN");
  const [destCode, setDestCode] = useState("US");
  const [customWaypoints, setCustomWaypoints] = useState<Pt[]>([]);
  const [drawMode, setDrawMode] = useState(false);
  const [autoLoading, setAutoLoading] = useState(false);

  const [speedKn, setSpeedKn] = useState(profile.cruiseKn);
  const [multiplier, setMultiplier] = useState(1);
  const [running, setRunning] = useState(false);
  const [events, setEvents] = useState<PlacedEvent[]>([]);
  const [showFlights, setShowFlights] = useState(false);
  const [showVessels, setShowVessels] = useState(false);
  const [display, setDisplay] = useState<Snapshot>(ZERO);
  const [log, setLog] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  const waypoints = useMemo<Pt[]>(() => {
    const s = portByCode(startCode);
    const d = portByCode(destCode);
    if (!s || !d) return [];
    return [[s.lat, s.lng], ...customWaypoints, [d.lat, d.lng]];
  }, [startCode, destCode, customWaypoints]);

  const totalNm = useMemo(() => (waypoints.length >= 2 ? routeDistanceNm(waypoints) : 0), [waypoints]);
  const baseline = useMemo(() => baselineFor(totalNm || 1, speedKn, profile), [totalNm, speedKn, profile]);
  const worst = useMemo(() => worstFor(totalNm || 1, profile), [totalNm, profile]);
  const endpoints = useMemo(() => {
    const s = portByCode(startCode);
    const d = portByCode(destCode);
    return { start: s ? `${s.name} (${s.port})` : "—", dest: d ? `${d.name} (${d.port})` : "—" };
  }, [startCode, destCode]);

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
    drawModeRef.current = drawMode;
  }, [drawMode]);

  const emoji = (html: string, size = 20) =>
    Lref.current!.divIcon({ html: `<div style="font-size:${size}px;line-height:${size}px">${html}</div>`, className: "", iconSize: [size + 2, size + 2], iconAnchor: [(size + 2) / 2, (size + 2) / 2] });

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    let cancelled = false;

    (async () => {
      const mod = await import("leaflet");
      const Lmod = (mod.default ?? mod) as unknown as L;
      if (cancelled || !containerRef.current) return;
      Lref.current = Lmod;

      const map = Lmod.map(containerRef.current, { center: [25, 20], zoom: 3, worldCopyJump: true, minZoom: 2 });
      mapRef.current = map;
      Lmod.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", { attribution: "&copy; OpenStreetMap &copy; CARTO", subdomains: "abcd", maxZoom: 19 }).addTo(map);

      routeLineRef.current = Lmod.polyline([], { color: "#33383d", weight: 2, dashArray: "4 6" }).addTo(map);
      coveredRef.current = Lmod.polyline([], { color: "#39994b", weight: 3 }).addTo(map);
      wpLayerRef.current = Lmod.layerGroup().addTo(map);
      eventLayerRef.current = Lmod.layerGroup().addTo(map);
      flightLayerRef.current = Lmod.layerGroup().addTo(map);
      vesselLayerRef.current = Lmod.layerGroup().addTo(map);
      startMarkerRef.current = Lmod.marker([0, 0], { icon: emoji("🟢", 16) }).addTo(map);
      destMarkerRef.current = Lmod.marker([0, 0], { icon: emoji("🏁", 16) }).addTo(map);
      shipRef.current = Lmod.marker([0, 0], { icon: emoji(profile.emoji) }).addTo(map).bindTooltip(profile.vehicle);

      map.on("click", (e: LeafletNS.LeafletMouseEvent) => {
        if (!drawModeRef.current || runningRef.current) return;
        setCustomWaypoints((prev) => [...prev, [e.latlng.lat, e.latlng.lng]]);
      });

      const tick = () => {
        if (!runningRef.current) return;
        const inp = inputsRef.current;
        if (inp.totalNm <= 0) return;
        const s = simRef.current;
        const dtH = SIM_HOURS_PER_REAL_SEC * inp.multiplier * (TICK_MS / 1000);
        const shipPos = positionAt(inp.waypoints, s.progressNm);

        let speedFactor = 1;
        let fuelFactor = 1;
        for (const ev of inp.events) {
          if (haversineNm([ev.lat, ev.lng], shipPos) > ev.radiusNm) continue;
          if (ev.def.kind === "oneoff") {
            if (!s.triggered.has(ev.id)) {
              s.triggered.add(ev.id);
              s.downtimeLeft += ev.def.downtimeHours;
              s.costUsd += ev.def.extraCostUsd + ev.def.cargoLossFrac * profile.cargoValue;
              const bits = [
                ev.def.downtimeHours ? `${Math.round(ev.def.downtimeHours)}h delay` : "",
                ev.def.extraCostUsd ? `+${fmtUsd(ev.def.extraCostUsd)}` : "",
                ev.def.cargoLossFrac ? `${fmtUsd(ev.def.cargoLossFrac * profile.cargoValue)} cargo lost` : "",
              ].filter(Boolean);
              pushLog(`${ev.def.icon} ${ev.def.label} — ${bits.join(", ")}`);
            }
          } else {
            speedFactor *= ev.def.speedFactor;
            fuelFactor *= ev.def.fuelFactor;
          }
        }

        const charterPerHour = profile.charterPerDay / 24;
        if (s.downtimeLeft > 0) {
          const fuel = (profile.auxFuelPerDay / 24) * dtH;
          s.fuel += fuel;
          s.co2T += fuel * profile.co2PerFuel;
          s.costUsd += fuel * profile.fuelPrice + charterPerHour * dtH;
          s.elapsedHours += dtH;
          s.downtimeLeft = Math.max(0, s.downtimeLeft - dtH);
          s.currentSpeed = 0;
        } else {
          const spd = inp.speedKn * speedFactor;
          let dist = spd * dtH;
          if (s.progressNm + dist > inp.totalNm) dist = inp.totalNm - s.progressNm;
          s.progressNm += dist;
          const fuel = profile.fuelPerHour(inp.speedKn, fuelFactor) * dtH; // power at commanded speed × fault penalty
          s.fuel += fuel;
          s.co2T += fuel * profile.co2PerFuel;
          s.costUsd += fuel * profile.fuelPrice + charterPerHour * dtH;
          s.elapsedHours += dtH;
          s.currentSpeed = spd;
        }

        shipRef.current?.setLatLng(positionAt(inp.waypoints, s.progressNm));
        coveredRef.current?.setLatLngs(traversed(inp.waypoints, s.progressNm) as [number, number][]);
        if (s.progressNm >= inp.totalNm && !completedRef.current) {
          completedRef.current = true;
          runningRef.current = false;
          setRunning(false);
          pushLog("🏁 Arrived at destination");
        }
        setDisplay({ progressNm: s.progressNm, elapsedHours: s.elapsedHours, fuel: s.fuel, co2T: s.co2T, costUsd: s.costUsd, currentSpeed: s.currentSpeed, downtimeLeft: s.downtimeLeft });
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
        Lmod.marker([a.lat, a.lon], { icon }).addTo(flightLayerRef.current!).bindTooltip(`${a.callsign} · ${Math.round(a.altFt)} ft`);
      };
      const addVessel = (v: { name: string; lat: number; lon: number; type: string; speedKn: number }) => {
        Lmod.marker([v.lat, v.lon], { icon: emoji(v.type === "Tanker" ? "🛢️" : "🚢", 15) }).addTo(vesselLayerRef.current!).bindTooltip(`${v.name} · ${v.type}`);
      };
      refreshFlightsRef.current = async () => {
        try {
          const wps = inputsRef.current.waypoints;
          const c = wps.length ? positionAt(wps, simRef.current.progressNm) : [25, 20];
          const res = await fetch(`/api/flights?lat=${c[0].toFixed(2)}&lon=${c[1].toFixed(2)}&dist=250`);
          const data = await res.json();
          flightLayerRef.current?.clearLayers();
          for (const a of data.aircraft ?? []) addPlane(a);
        } catch {
          /* ignore */
        }
      };
      refreshVesselsRef.current = async () => {
        try {
          const wps = inputsRef.current.waypoints;
          const c = wps.length ? positionAt(wps, simRef.current.progressNm) : [25, 20];
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

  // redraw route + waypoint dots when geometry changes
  useEffect(() => {
    const L = Lref.current;
    if (!ready || !L || !mapRef.current || !routeLineRef.current) return;
    routeLineRef.current.setLatLngs(waypoints as [number, number][]);
    if (waypoints.length >= 2) {
      startMarkerRef.current?.setLatLng(waypoints[0]).bindTooltip(endpoints.start);
      destMarkerRef.current?.setLatLng(waypoints[waypoints.length - 1]).bindTooltip(endpoints.dest);
    }
    wpLayerRef.current?.clearLayers();
    customWaypoints.forEach((p, i) => {
      const dot = L.marker(p, { draggable: true, icon: L.divIcon({ html: `<div style="width:12px;height:12px;border-radius:50%;background:#39994b;border:2px solid #0b0b0b;box-shadow:0 0 4px #39994b"></div>`, className: "", iconSize: [12, 12], iconAnchor: [6, 6] }) }).addTo(wpLayerRef.current!);
      dot.on("dragend", () => {
        const ll = dot.getLatLng();
        setCustomWaypoints((prev) => prev.map((q, j) => (j === i ? [ll.lat, ll.lng] : q)));
      });
      dot.on("dblclick", () => setCustomWaypoints((prev) => prev.filter((_, j) => j !== i)));
    });
    if (!runningRef.current) {
      resetRef.current();
      if (waypoints.length >= 2) mapRef.current.fitBounds(routeLineRef.current.getBounds().pad(0.15));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waypoints, ready]);

  // draggable fault zones
  useEffect(() => {
    const L = Lref.current;
    if (!ready || !L || !eventLayerRef.current) return;
    const layer = eventLayerRef.current;
    layer.clearLayers();
    for (const ev of events) {
      const circle = L.circle([ev.lat, ev.lng], { radius: ev.radiusNm * 1852, color: ev.def.color, weight: 1, fillColor: ev.def.color, fillOpacity: 0.12 }).addTo(layer);
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

  useEffect(() => {
    if (!ready || !profile.liveFlights) return;
    if (!showFlights) {
      flightLayerRef.current?.clearLayers();
      return;
    }
    refreshFlightsRef.current();
    const id = setInterval(() => refreshFlightsRef.current(), 20000);
    return () => clearInterval(id);
  }, [showFlights, ready, profile.liveFlights]);
  useEffect(() => {
    if (!ready || !profile.liveVessels) return;
    if (!showVessels) {
      vesselLayerRef.current?.clearLayers();
      return;
    }
    refreshVesselsRef.current();
    const id = setInterval(() => refreshVesselsRef.current(), 20000);
    return () => clearInterval(id);
  }, [showVessels, ready, profile.liveVessels]);

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
    const def = profile.faults.find((f) => f.type === type);
    if (!def) return;
    const c = mapRef.current.getCenter();
    const id = idRef.current++;
    setEvents((prev) => [...prev, { id, def, lat: c.lat, lng: c.lng, radiusNm: def.radiusNm }]);
    pushLog(`${def.icon} ${def.label} dropped — drag it onto the path`);
  };

  const autoRoute = async () => {
    const s = portByCode(startCode);
    const d = portByCode(destCode);
    if (!s || !d || runningRef.current) return;
    setAutoLoading(true);
    try {
      let pts: Pt[] = [];
      if (profile.routing === "air") {
        pts = greatCircle([s.lat, s.lng], [d.lat, d.lng], 48);
        pushLog("🧭 Great-circle air route");
      } else {
        const path = profile.routing === "sea" ? "/api/searoute" : "/api/roadroute";
        const res = await fetch(`${path}?fromLat=${s.lat}&fromLng=${s.lng}&toLat=${d.lat}&toLng=${d.lng}`);
        const data = await res.json();
        if (Array.isArray(data.waypoints) && data.waypoints.length >= 2) {
          pts = data.waypoints;
          pushLog(`🧭 Auto ${profile.routing === "sea" ? "sea" : "road"} route — ${fmtNum((data.lengthNm ?? data.km ?? 0))} ${profile.routing === "sea" ? "nm" : "km"}`);
        } else {
          pushLog(`🧭 No ${profile.routing} route for this pair — try Draw path`);
        }
      }
      setCustomWaypoints(pts.length >= 2 ? pts.slice(1, -1) : []);
      setDrawMode(false);
    } catch {
      pushLog("🧭 Route lookup failed");
    } finally {
      setAutoLoading(false);
    }
  };

  // auto-compute a route whenever the endpoints (or mode) change
  useEffect(() => {
    if (runningRef.current) return;
    autoRoute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startCode, destCode, ready]);

  const fraction = totalNm > 0 ? display.progressNm / totalNm : 0;
  const days = display.elapsedHours / 24;
  const dist = (nm: number) => fmtNum(nm * profile.distPerNm);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <div ref={containerRef} className="h-[520px] w-full overflow-hidden rounded-xl border border-border" />

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button onClick={running ? pause : play} disabled={!canSail} className={running ? "btn-ghost" : "btn-primary"}>
            {running ? "⏸ Pause" : completedRef.current ? "↻ Replay" : `▶ Go`}
          </button>
          <button onClick={() => resetRef.current()} className="btn-ghost">↺ Reset</button>
          <span className="ml-1 text-xs text-faint">Time:</span>
          {[1, 3, 10].map((m) => (
            <button key={m} onClick={() => setMultiplier(m)} className={`rounded-lg px-2.5 py-1 text-sm ${multiplier === m ? "bg-env text-bg" : "btn-ghost"}`}>{m}×</button>
          ))}
          <input type="number" min={1} max={100} value={multiplier} onChange={(e) => setMultiplier(Math.max(1, Math.min(100, Number(e.target.value) || 1)))} className="input w-16" aria-label="Custom time multiplier" />
          {profile.liveFlights && (
            <label className="ml-1 flex items-center gap-1.5 text-xs text-faint">
              <input type="checkbox" checked={showFlights} onChange={(e) => setShowFlights(e.target.checked)} /> ✈️ Flights
            </label>
          )}
          {profile.liveVessels && (
            <label className="flex items-center gap-1.5 text-xs text-faint">
              <input type="checkbox" checked={showVessels} onChange={(e) => setShowVessels(e.target.checked)} /> 🚢 Vessels
            </label>
          )}
        </div>

        <div className="panel-2 mt-3 p-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label">From</label>
              <select value={startCode} onChange={(e) => setStartCode(e.target.value)} disabled={running} className="input">
                {COUNTRIES.map((c) => (<option key={c.code} value={c.code}>{c.name} — {c.port}</option>))}
              </select>
            </div>
            <div>
              <label className="label">To</label>
              <select value={destCode} onChange={(e) => setDestCode(e.target.value)} disabled={running} className="input">
                {COUNTRIES.map((c) => (<option key={c.code} value={c.code}>{c.name} — {c.port}</option>))}
              </select>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button onClick={autoRoute} disabled={running || autoLoading} className="rounded-lg bg-overall px-3 py-1.5 text-sm font-medium text-bg disabled:opacity-50">
              {autoLoading ? "🧭 Routing…" : `🧭 Auto ${profile.routing === "sea" ? "sea" : profile.routing === "air" ? "air" : "road"} route`}
            </button>
            <button onClick={() => setDrawMode((d) => !d)} disabled={running} className={`rounded-lg px-3 py-1.5 text-sm ${drawMode ? "bg-social text-bg" : "btn-ghost"}`}>
              {drawMode ? "✏️ Drawing… click the map" : "✏️ Draw path"}
            </button>
            <button onClick={() => setCustomWaypoints((p) => p.slice(0, -1))} disabled={running || !customWaypoints.length} className="btn-ghost text-sm">Undo point</button>
            <button onClick={() => setCustomWaypoints([])} disabled={running || !customWaypoints.length} className="btn-ghost text-sm">Clear path</button>
            <span className="text-xs text-faint">{customWaypoints.length} waypoint{customWaypoints.length === 1 ? "" : "s"}</span>
          </div>
        </div>

        <div className="panel-2 mt-3 p-3">
          <div className="label">Cruise speed: {Math.round(speedKn * profile.speedPerKn)} {profile.speedUnit}</div>
          <input type="range" min={profile.speedMinKn} max={profile.speedMaxKn} value={speedKn} onChange={(e) => setSpeedKn(Number(e.target.value))} className="w-full accent-env" />
          <div className="mt-1 text-xs text-faint">{profile.vehicle} · fuel burn rises with speed & faults</div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="panel p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink">Live Dashboard</h2>
            <span className="text-xs text-faint">{Math.round(fraction * 100)}% · {display.downtimeLeft > 0 ? "⛔ stopped" : `${Math.round(display.currentSpeed * profile.speedPerKn)} ${profile.speedUnit}`}</span>
          </div>
          <div className="mb-1 text-xs text-faint">{endpoints.start} → {endpoints.dest}</div>
          <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-panel2">
            <div className="h-full rounded-full bg-env" style={{ width: `${Math.round(fraction * 100)}%` }} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Tile label="Sim time" value={`${days.toFixed(1)} d`} />
            <Tile label="Distance" value={`${dist(display.progressNm)} / ${dist(totalNm)} ${profile.distUnit}`} />
            <Tile label="Fuel burned" value={`${fmtNum(display.fuel)} ${profile.fuelUnit}`} accent="text-env" />
            <Tile label="CO₂ emitted" value={`${fmtNum(display.co2T)} t`} accent="text-env" />
            <Tile label="Cost" value={fmtUsd(display.costUsd)} accent="text-social" />
            <Tile label="vs baseline CO₂" value={`+${fmtNum(Math.max(0, display.co2T - baseline.co2T))} t`} accent="text-warn" />
          </div>
          {completedRef.current && display.co2T > 0 && (
            <form action={logVoyageEmission} className="mt-3">
              <input type="hidden" name="co2Kg" value={Math.round(display.co2T * 1000)} />
              <input type="hidden" name="fuelT" value={Math.round(display.fuel)} />
              <input type="hidden" name="reference" value={`${profile.label} ${endpoints.start}→${endpoints.dest}`} />
              <div className="mb-2">
                <label className="label">Department (links to goals)</label>
                <select name="departmentId" className="input">
                  <option value="">— All goals —</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <button className="btn-primary w-full">Log this trip → Carbon Transactions &amp; Goals</button>
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
          <h2 className="mb-1 text-sm font-semibold text-ink">Drag-and-drop {profile.label.toLowerCase()} faults</h2>
          <p className="mb-2 text-[11px] text-faint">Drop a fault, then drag its zone onto the path. The {profile.emoji} reacts live as it passes through — even mid-trip. Double-click to remove.</p>
          <div className="grid grid-cols-1 gap-1.5">
            {profile.faults.map((f) => (
              <button key={f.type} onClick={() => dropFault(f.type)} className="flex items-center gap-2 rounded-lg border border-border bg-panel2 px-2.5 py-1.5 text-left text-xs text-muted hover:text-ink">
                <span className="text-base">{f.icon}</span>
                <span className="flex-1">
                  <span className="font-medium text-ink">Drop {f.label}</span>
                  <span className="block text-[10px] text-faint">{f.description}</span>
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
              {log.map((l, i) => (<li key={i}>{l}</li>))}
            </ul>
          ) : (
            <p className="text-xs text-faint">Pick From/To, then press Go.</p>
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
      <span className="text-faint">{fmtNum(days, 0)} d · {fmtNum(co2)} t · {fmtUsd(cost)}</span>
    </div>
  );
}
