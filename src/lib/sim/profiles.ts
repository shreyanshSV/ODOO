import type { SimProfile, Fault } from "./types";

const pow = (base: number, cruise: number, exp: number) => (k: number, ff = 1) =>
  base * (k / cruise) ** exp * ff;

// ---------- SHIP ----------
const SHIP_FAULTS: Fault[] = [
  { type: "STORM", label: "Severe Storm", icon: "⛈️", color: "#56a2e8", kind: "ongoing", description: "Heavy seas: slower and burns more fuel punching through swell.", speedFactor: 0.6, fuelFactor: 1.5, downtimeHours: 0, extraCostUsd: 0, cargoLossFrac: 0, radiusNm: 220 },
  { type: "ENGINE_FAILURE", label: "Engine Failure", icon: "⚙️", color: "#f17634", kind: "oneoff", description: "Main engine down: ~5 days adrift for repairs.", speedFactor: 1, fuelFactor: 1, downtimeHours: 120, extraCostUsd: 500_000, cargoLossFrac: 0, radiusNm: 130 },
  { type: "FREIGHT_LOSS", label: "Freight Loss", icon: "📦", color: "#b86200", kind: "oneoff", description: "Containers lost overboard: ~20% of cargo value.", speedFactor: 1, fuelFactor: 1, downtimeHours: 0, extraCostUsd: 0, cargoLossFrac: 0.2, radiusNm: 130 },
  { type: "PIRACY", label: "Piracy / Convoy", icon: "🏴‍☠️", color: "#ff8383", kind: "oneoff", description: "High-risk waters: convoy delay + security costs.", speedFactor: 1, fuelFactor: 1, downtimeHours: 48, extraCostUsd: 300_000, cargoLossFrac: 0, radiusNm: 180 },
  { type: "FOULING", label: "Hull Fouling", icon: "🐚", color: "#6e757c", kind: "ongoing", description: "Marine growth: ongoing ~25% fuel penalty from drag.", speedFactor: 0.95, fuelFactor: 1.25, downtimeHours: 0, extraCostUsd: 0, cargoLossFrac: 0, radiusNm: 260 },
];

// ---------- AIR ----------
const AIR_FAULTS: Fault[] = [
  { type: "HEADWIND", label: "Jet-stream Headwind", icon: "🌬️", color: "#56a2e8", kind: "ongoing", description: "Strong headwind: lower ground speed, more fuel per mile.", speedFactor: 0.8, fuelFactor: 1.3, downtimeHours: 0, extraCostUsd: 0, cargoLossFrac: 0, radiusNm: 300 },
  { type: "THUNDERSTORM", label: "Thunderstorm Cells", icon: "⛈️", color: "#b595ff", kind: "ongoing", description: "Deviating around convective cells: slower, more burn.", speedFactor: 0.85, fuelFactor: 1.4, downtimeHours: 0, extraCostUsd: 0, cargoLossFrac: 0, radiusNm: 240 },
  { type: "ENGINE_ISSUE", label: "Technical / Divert", icon: "⚙️", color: "#f17634", kind: "oneoff", description: "Technical issue: divert to alternate, ~6h delay + costs.", speedFactor: 1, fuelFactor: 1, downtimeHours: 6, extraCostUsd: 250_000, cargoLossFrac: 0, radiusNm: 160 },
  { type: "ATC_HOLDING", label: "ATC Holding", icon: "🛬", color: "#6e757c", kind: "ongoing", description: "Circling in a hold: little progress, heavy fuel burn.", speedFactor: 0.35, fuelFactor: 1.7, downtimeHours: 0, extraCostUsd: 0, cargoLossFrac: 0, radiusNm: 150 },
  { type: "ASH_CLOSURE", label: "Volcanic Ash / Closure", icon: "🌋", color: "#ff8383", kind: "ongoing", description: "Airspace closed: long reroute at reduced efficiency.", speedFactor: 0.7, fuelFactor: 1.35, downtimeHours: 0, extraCostUsd: 0, cargoLossFrac: 0, radiusNm: 280 },
];

// ---------- GROUND ----------
const GROUND_FAULTS: Fault[] = [
  { type: "TRAFFIC_JAM", label: "Traffic Jam", icon: "🚦", color: "#f17634", kind: "ongoing", description: "Gridlock: crawling and idling burns fuel for little distance.", speedFactor: 0.35, fuelFactor: 1.6, downtimeHours: 0, extraCostUsd: 0, cargoLossFrac: 0, radiusNm: 45 },
  { type: "STEEP_GRADE", label: "Mountain Pass", icon: "⛰️", color: "#b595ff", kind: "ongoing", description: "Steep climb: much higher fuel burn for the grade.", speedFactor: 0.65, fuelFactor: 1.7, downtimeHours: 0, extraCostUsd: 0, cargoLossFrac: 0, radiusNm: 60 },
  { type: "BREAKDOWN", label: "Breakdown", icon: "🛠️", color: "#ff8383", kind: "oneoff", description: "Mechanical failure: ~12h roadside + repair costs.", speedFactor: 1, fuelFactor: 1, downtimeHours: 12, extraCostUsd: 8_000, cargoLossFrac: 0, radiusNm: 40 },
  { type: "ROADBLOCK", label: "Roadblock / Border", icon: "🚧", color: "#6e757c", kind: "oneoff", description: "Checkpoint/border: ~6h stopped, idling.", speedFactor: 1, fuelFactor: 1, downtimeHours: 6, extraCostUsd: 1_000, cargoLossFrac: 0, radiusNm: 35 },
  { type: "BAD_WEATHER", label: "Storm / Flooding", icon: "🌧️", color: "#56a2e8", kind: "ongoing", description: "Heavy rain/flooding: slow going, elevated burn.", speedFactor: 0.6, fuelFactor: 1.3, downtimeHours: 0, extraCostUsd: 0, cargoLossFrac: 0, radiusNm: 70 },
];

export const SHIP_PROFILE: SimProfile = {
  id: "ship",
  label: "Ship",
  vehicle: "Panamax Container (≈4,500 TEU)",
  emoji: "🚢",
  routing: "sea",
  cruiseKn: 20,
  speedMinKn: 8,
  speedMaxKn: 26,
  fuelPerHour: pow(5, 20, 3), // 120 t/day at cruise
  fuelUnit: "t HFO",
  co2PerFuel: 3.114,
  fuelPrice: 620,
  charterPerDay: 30_000,
  cargoValue: 60_000_000,
  auxFuelPerDay: 2,
  worstDowntimeHours: 120,
  worstExtraCostUsd: 800_000,
  distPerNm: 1,
  distUnit: "nm",
  speedPerKn: 1,
  speedUnit: "kn",
  faults: SHIP_FAULTS,
  liveFlights: true,
  liveVessels: true,
};

export const AIR_PROFILE: SimProfile = {
  id: "air",
  label: "Air",
  vehicle: "Boeing 777F Freighter",
  emoji: "✈️",
  routing: "air",
  cruiseKn: 480,
  speedMinKn: 320,
  speedMaxKn: 520,
  fuelPerHour: pow(7, 480, 1.6), // ~7 t Jet-A/hour at cruise
  fuelUnit: "t Jet-A",
  co2PerFuel: 3.16,
  fuelPrice: 900,
  charterPerDay: 300_000,
  cargoValue: 20_000_000,
  auxFuelPerDay: 1.5,
  worstDowntimeHours: 14,
  worstExtraCostUsd: 500_000,
  distPerNm: 1,
  distUnit: "nm",
  speedPerKn: 1,
  speedUnit: "kn",
  faults: AIR_FAULTS,
  liveFlights: true,
};

export const GROUND_PROFILE: SimProfile = {
  id: "ground",
  label: "Ground",
  vehicle: "Heavy Diesel Truck (40 t)",
  emoji: "🚛",
  routing: "road",
  cruiseKn: 43, // ~80 km/h
  speedMinKn: 22, // ~40 km/h
  speedMaxKn: 54, // ~100 km/h
  fuelPerHour: pow(28, 43, 2), // ~28 L/hour at cruise (~35 L/100km)
  fuelUnit: "L diesel",
  co2PerFuel: 0.00268, // t CO2 per litre
  fuelPrice: 1.3,
  charterPerDay: 1_500,
  cargoValue: 500_000,
  auxFuelPerDay: 60, // idling
  worstDowntimeHours: 14,
  worstExtraCostUsd: 10_000,
  distPerNm: 1.852,
  distUnit: "km",
  speedPerKn: 1.852,
  speedUnit: "km/h",
  faults: GROUND_FAULTS,
};

export const PROFILES: Record<string, SimProfile> = {
  ship: SHIP_PROFILE,
  air: AIR_PROFILE,
  ground: GROUND_PROFILE,
};
