declare module "searoute-js" {
  interface SearoutePoint {
    type: "Feature";
    properties: Record<string, unknown>;
    geometry: { type: "Point"; coordinates: [number, number] };
  }
  interface SearouteLine {
    type: "Feature";
    properties: { length?: number; units?: string };
    geometry: { type: "LineString"; coordinates: [number, number][] };
  }
  export default function searoute(
    origin: SearoutePoint,
    destination: SearoutePoint,
    units?: string
  ): SearouteLine;
}
