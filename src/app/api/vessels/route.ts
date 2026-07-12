export const dynamic = "force-dynamic";

// No free, keyless live AIS/vessel API exists (MarineTraffic, aisstream, VesselFinder
// all require a key). So we return a deterministic set of plausible vessels spread
// around the requested point. simulated:true signals this to the client.
// ponytail: swap in a real AIS feed here if a keyless one ever appears.

interface Vessel {
  id: string;
  name: string;
  lat: number;
  lon: number;
  course: number;
  speedKn: number;
  type: "Cargo" | "Tanker";
}

const NM_PER_DEG_LAT = 60; // 1 degree latitude ~= 60 nautical miles

const FLEET: { name: string; type: "Cargo" | "Tanker" }[] = [
  { name: "MV Ever Ace", type: "Cargo" },
  { name: "Maersk Sealand", type: "Cargo" },
  { name: "MSC Gulsun", type: "Cargo" },
  { name: "MV Cosco Shipping", type: "Cargo" },
  { name: "MT Front Altair", type: "Tanker" },
  { name: "MV CMA CGM Marco Polo", type: "Cargo" },
  { name: "MT Seawise Giant", type: "Tanker" },
  { name: "MV Hapag Berlin", type: "Cargo" },
  { name: "MT Pacific Diamond", type: "Tanker" },
  { name: "MV Ocean Pioneer", type: "Cargo" },
];

function toNumber(value: string | null, fallback: number): number {
  const n = value === null ? NaN : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

// Deterministic spread: fan the fleet across the search area using indexed offsets,
// alternating eastbound (090) / westbound (270) headings.
function buildFleet(lat: number, lon: number, distNm: number): Vessel[] {
  const cosLat = Math.max(Math.cos((lat * Math.PI) / 180), 0.2); // guard near the poles
  const radiusNm = Math.min(Math.max(distNm, 20), 500) * 0.6; // stay well inside the requested radius

  return FLEET.map((v, i) => {
    const angle = (i / FLEET.length) * 2 * Math.PI; // even fan around the point
    const reach = ((i % 5) + 1) / 5; // 0.2..1.0 of the radius, deterministic
    const offNm = radiusNm * reach;
    const dLat = (offNm * Math.cos(angle)) / NM_PER_DEG_LAT;
    const dLon = (offNm * Math.sin(angle)) / (NM_PER_DEG_LAT * cosLat);
    const eastbound = i % 2 === 0;

    return {
      id: `SIM-${1000 + i}`,
      name: v.name,
      lat: Number((lat + dLat).toFixed(5)),
      lon: Number((lon + dLon).toFixed(5)),
      course: eastbound ? 90 : 270,
      speedKn: 10 + (i % 7) * 2, // 10..22 kn, deterministic
      type: v.type,
    };
  });
}

export async function GET(req: Request): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const lat = toNumber(searchParams.get("lat"), 25);
  const lon = toNumber(searchParams.get("lon"), -40);
  const dist = toNumber(searchParams.get("dist"), 250);

  try {
    const vessels = buildFleet(lat, lon, dist);
    return Response.json({
      source: "simulated",
      simulated: true,
      count: vessels.length,
      vessels,
    });
  } catch {
    return Response.json({ error: "Vessel generation failed", source: "simulated", simulated: true, count: 0, vessels: [] });
  }
}
