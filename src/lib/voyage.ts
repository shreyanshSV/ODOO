// Pure voyage model: geometry, emissions and cost for a cargo-ship route.
// No imports, no DB, no React — safe to run in a hot animation loop.

export type Pt = [number, number]; // [lat, lng]

export const SHIP = {
  name: "Panamax Container (≈4,500 TEU)",
  cruiseKn: 20,
  fuelTPerDayAtCruise: 120, // tonnes HFO/day at cruise
  co2PerTonneFuel: 3.114, // tonnes CO2 per tonne HFO
  fuelUsdPerTonne: 620,
  charterUsdPerDay: 30000,
  cargoValueUsd: 60_000_000,
};

export type RouteDef = { key: string; label: string; waypoints: Pt[] };

// Waypoints picked to roughly hug open water; good enough for a map polyline,
// not for navigation. Mumbai -> New York either via Suez or round the Cape.
export const ROUTES: Record<string, RouteDef> = {
  suez: {
    key: "suez",
    label: "Suez Canal route",
    waypoints: [
      [18.95, 72.84], // Mumbai
      [14.5, 63.0], // Arabian Sea
      [12.8, 50.0], // approach Gulf of Aden
      [12.6, 44.5], // Bab-el-Mandeb
      [17.0, 40.5], // southern Red Sea
      [24.5, 35.5], // northern Red Sea
      [30.0, 32.5], // Suez
      [33.0, 28.0], // eastern Med
      [35.5, 13.0], // central Med (south of Sicily)
      [36.5, 2.0], // western Med
      [35.95, -5.6], // Gibraltar
      [36.5, -25.0], // N. Atlantic
      [39.0, -55.0], // W. Atlantic
      [40.5, -74.0], // New York
    ],
  },
  cape: {
    key: "cape",
    label: "Cape of Good Hope route",
    waypoints: [
      [18.95, 72.84], // Mumbai
      [11.0, 66.0], // Arabian Sea
      [0.0, 60.0], // central Indian Ocean
      [-12.0, 55.0], // Indian Ocean
      [-25.0, 52.0], // east of Madagascar
      [-34.0, 40.0], // SE Indian Ocean
      [-37.0, 27.0], // Agulhas approach
      [-34.8, 20.0], // Cape of Good Hope
      [-30.0, 10.0], // S. Atlantic
      [-20.0, -3.0], // S. Atlantic
      [-5.0, -18.0], // equatorial Atlantic
      [12.0, -38.0], // N. Atlantic
      [30.0, -58.0], // W. Atlantic
      [40.5, -74.0], // New York
    ],
  },
};

const EARTH_RADIUS_NM = 3440.065; // mean earth radius in nautical miles
const toRad = (deg: number): number => (deg * Math.PI) / 180;

export function haversineNm(a: Pt, b: Pt): number {
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_NM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function routeDistanceNm(waypoints: Pt[]): number {
  let total = 0;
  for (let i = 1; i < waypoints.length; i++) {
    total += haversineNm(waypoints[i - 1], waypoints[i]);
  }
  return total;
}

// Interpolate the point sitting `nm` along the polyline. Clamped to the ends.
// ponytail: linear lat/lng lerp per leg — cheap and visually fine at leg scale;
// swap for slerp if long ocean legs ever look bent on the map.
export function positionAt(waypoints: Pt[], nm: number): Pt {
  if (waypoints.length === 0) return [0, 0];
  if (waypoints.length === 1 || nm <= 0) return waypoints[0];

  let travelled = 0;
  for (let i = 1; i < waypoints.length; i++) {
    const a = waypoints[i - 1];
    const b = waypoints[i];
    const leg = haversineNm(a, b);
    if (travelled + leg >= nm) {
      const f = leg === 0 ? 0 : (nm - travelled) / leg;
      return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
    }
    travelled += leg;
  }
  return waypoints[waypoints.length - 1]; // clamp past the end
}

// Fuel burn scales with the cube of speed (classic ship propulsion law).
export function fuelTPerDay(speedKn: number): number {
  return SHIP.fuelTPerDayAtCruise * (speedKn / SHIP.cruiseKn) ** 3;
}

export function fuelTPerHour(speedKn: number, fuelFactor?: number): number {
  return (fuelTPerDay(speedKn) / 24) * (fuelFactor ?? 1);
}

export type EventEffect = {
  speedFactor: number; // multiply speed (e.g. storm 0.6)
  fuelFactor: number; // multiply fuel/hour (e.g. storm 1.5)
  downtimeHours: number; // ship stopped, still burns aux fuel + charter
  extraCostUsd: number; // repair/insurance/security one-off
  cargoLossFrac: number; // fraction of cargoValueUsd lost
  forcesCape: boolean; // reroute via Cape (piracy)
};

export type EventType = {
  type: string;
  label: string;
  icon: string;
  description: string;
  effect: EventEffect;
};

export const EVENT_TYPES: EventType[] = [
  {
    type: "STORM",
    label: "Severe Storm",
    icon: "⛈️",
    description: "Heavy weather: slow down and burn more fuel punching through swell.",
    effect: {
      speedFactor: 0.6,
      fuelFactor: 1.5,
      downtimeHours: 0,
      extraCostUsd: 0,
      cargoLossFrac: 0,
      forcesCape: false,
    },
  },
  {
    type: "ENGINE_FAILURE",
    label: "Engine Failure",
    icon: "⚙️",
    description: "Main engine down: ~5 days adrift for repairs while charter keeps running.",
    effect: {
      speedFactor: 1,
      fuelFactor: 1,
      downtimeHours: 120,
      extraCostUsd: 500_000,
      cargoLossFrac: 0,
      forcesCape: false,
    },
  },
  {
    type: "FREIGHT_LOSS",
    label: "Freight Loss",
    icon: "📦",
    description: "Containers lost overboard: ~20% of cargo value written off.",
    effect: {
      speedFactor: 1,
      fuelFactor: 1,
      downtimeHours: 0,
      extraCostUsd: 0,
      cargoLossFrac: 0.2,
      forcesCape: false,
    },
  },
  {
    type: "PIRACY_REROUTE",
    label: "Piracy Reroute",
    icon: "🏴‍☠️",
    description: "High-risk waters: reroute around the Cape plus security costs.",
    effect: {
      speedFactor: 1,
      fuelFactor: 1,
      downtimeHours: 0,
      extraCostUsd: 300_000,
      cargoLossFrac: 0,
      forcesCape: true,
    },
  },
  {
    type: "FOULING",
    label: "Hull Fouling",
    icon: "🐚",
    description: "Marine growth on the hull: ongoing ~25% fuel penalty for added drag.",
    effect: {
      speedFactor: 0.95,
      fuelFactor: 1.25,
      downtimeHours: 0,
      extraCostUsd: 0,
      cargoLossFrac: 0,
      forcesCape: false,
    },
  },
];

export type VoyageTotals = {
  days: number;
  distanceNm: number;
  fuelT: number;
  co2T: number;
  costUsd: number;
};

function getRoute(routeKey: string): RouteDef {
  const route = ROUTES[routeKey];
  if (!route) throw new Error(`Unknown route key: ${routeKey}`);
  return route;
}

export function baselineVoyage(routeKey: string, speedKn: number): VoyageTotals {
  const distanceNm = routeDistanceNm(getRoute(routeKey).waypoints);
  const days = distanceNm / speedKn / 24;
  const fuelT = fuelTPerDay(speedKn) * days;
  const co2T = fuelT * SHIP.co2PerTonneFuel;
  const costUsd = fuelT * SHIP.fuelUsdPerTonne + SHIP.charterUsdPerDay * days;
  return { days, distanceNm, fuelT, co2T, costUsd };
}

// Pessimistic upper bound: piracy forces the (longer) Cape route, storm-grade
// speed/fuel penalty over the whole leg, plus an engine-failure downtime and
// the repair/insurance/cargo-loss hit. Deterministic — no randomness.
const AUX_FUEL_T_PER_DAY = 2; // generators/boilers while stopped
const WORST_SPEED_FACTOR = 0.6;
const WORST_FUEL_FACTOR = 1.6;

export function worstCase(routeKey: string): VoyageTotals {
  const piracy = EVENT_TYPES.find((e) => e.type === "PIRACY_REROUTE");
  const effectiveKey = piracy?.effect.forcesCape ? "cape" : routeKey;
  const distanceNm = routeDistanceNm(getRoute(effectiveKey).waypoints);

  // Sailing under storm-grade penalties.
  const speedKn = SHIP.cruiseKn * WORST_SPEED_FACTOR;
  const sailHours = distanceNm / speedKn;
  const sailDays = sailHours / 24;
  const sailFuel = fuelTPerHour(speedKn, WORST_FUEL_FACTOR) * sailHours;

  // Engine-failure downtime: no propulsion fuel, only aux burn + charter.
  const engine = EVENT_TYPES.find((e) => e.type === "ENGINE_FAILURE");
  const downHours = engine?.effect.downtimeHours ?? 0;
  const downDays = downHours / 24;
  const downFuel = (AUX_FUEL_T_PER_DAY * downHours) / 24;

  const days = sailDays + downDays;
  const fuelT = sailFuel + downFuel;
  const co2T = fuelT * SHIP.co2PerTonneFuel;

  const extraCostUsd = 500_000 + 300_000; // repair + insurance
  const cargoLossUsd = SHIP.cargoValueUsd * 0.2;
  const costUsd =
    fuelT * SHIP.fuelUsdPerTonne +
    SHIP.charterUsdPerDay * days +
    extraCostUsd +
    cargoLossUsd;

  return { days, distanceNm, fuelT, co2T, costUsd };
}
