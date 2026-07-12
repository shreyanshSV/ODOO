import type { Pt } from "@/lib/voyage";

// A hazard the vehicle can hit. "ongoing" applies while inside its zone;
// "oneoff" fires once when the vehicle first enters the zone.
export type Fault = {
  type: string;
  label: string;
  icon: string;
  color: string;
  description: string;
  kind: "ongoing" | "oneoff";
  speedFactor: number; // ongoing: multiply speed over ground
  fuelFactor: number; // ongoing: multiply fuel/hour
  downtimeHours: number; // oneoff: time stopped
  extraCostUsd: number; // oneoff: one-off cost
  cargoLossFrac: number; // oneoff: fraction of cargo value lost
  radiusNm: number; // zone radius
};

export type SimProfile = {
  id: "ship" | "air" | "ground";
  label: string;
  vehicle: string;
  emoji: string;
  routing: "sea" | "air" | "road";

  cruiseKn: number;
  speedMinKn: number;
  speedMaxKn: number;

  // fuel in the profile's own unit (t HFO, t Jet-A, L diesel) per hour
  fuelPerHour: (commandedKn: number, fuelFactor?: number) => number;
  fuelUnit: string;
  co2PerFuel: number; // tonnes CO2 per fuel unit
  fuelPrice: number; // $ per fuel unit
  charterPerDay: number; // $/day operating cost
  cargoValue: number; // $ for freight-loss faults
  auxFuelPerDay: number; // fuel/day while stopped

  worstDowntimeHours: number;
  worstExtraCostUsd: number;

  // display conversions from the internal nm/kn
  distPerNm: number;
  distUnit: string;
  speedPerKn: number;
  speedUnit: string;

  faults: Fault[];
  liveFlights?: boolean;
  liveVessels?: boolean;
};

export type { Pt };
