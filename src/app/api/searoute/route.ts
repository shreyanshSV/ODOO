import searoute from "searoute-js";

export const dynamic = "force-dynamic";

const point = (lng: number, lat: number) => ({
  type: "Feature" as const,
  properties: {},
  geometry: { type: "Point" as const, coordinates: [lng, lat] as [number, number] },
});

type Line = ReturnType<typeof searoute>;

function attempt(fLng: number, fLat: number, tLng: number, tLat: number): Line | null {
  try {
    const r = searoute(point(fLng, fLat), point(tLng, tLat));
    if (r?.geometry?.coordinates && r.geometry.coordinates.length >= 2) return r;
  } catch {
    /* searoute throws for unroutable pairs — treat as null */
  }
  return null;
}

const DIRS: [number, number][] = [
  [0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1],
];
const OFFSETS = [0.5, 1, 1.5, 2, 3];

// Some port coords snap to a spot searoute's marine network can't reach.
// If the direct route fails, nudge the destination (then the origin) toward
// open water in a widening ring until a route is found.
function routeWithFallback(fLng: number, fLat: number, tLng: number, tLat: number): Line | null {
  let r = attempt(fLng, fLat, tLng, tLat);
  if (r) return r;
  for (const off of OFFSETS) for (const [dx, dy] of DIRS) {
    r = attempt(fLng, fLat, tLng + dx * off, tLat + dy * off);
    if (r) return r;
  }
  for (const off of OFFSETS) for (const [dx, dy] of DIRS) {
    r = attempt(fLng + dx * off, fLat + dy * off, tLng, tLat);
    if (r) return r;
  }
  return null;
}

// Shortest realistic maritime route between two ports (offline, no API key).
// Returns [lat, lng] waypoints for Leaflet.
export async function GET(req: Request): Promise<Response> {
  try {
    const u = new URL(req.url);
    const fromLat = Number(u.searchParams.get("fromLat"));
    const fromLng = Number(u.searchParams.get("fromLng"));
    const toLat = Number(u.searchParams.get("toLat"));
    const toLng = Number(u.searchParams.get("toLng"));
    if (![fromLat, fromLng, toLat, toLng].every(Number.isFinite)) {
      return Response.json({ error: "invalid coordinates" }, { status: 400 });
    }

    const route = routeWithFallback(fromLng, fromLat, toLng, toLat);
    if (!route) return Response.json({ waypoints: [], lengthNm: 0, count: 0, error: "no sea route" });

    const coords = route.geometry.coordinates;
    const all: [number, number][] = coords.map((c) => [c[1], c[0]]);

    const MAX = 40;
    let waypoints = all;
    if (all.length > MAX) {
      const stride = Math.ceil(all.length / MAX);
      waypoints = all.filter((_, i) => i % stride === 0 || i === all.length - 1);
    }

    return Response.json({
      waypoints,
      lengthNm: Math.round(route.properties.length ?? 0),
      count: waypoints.length,
    });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "searoute failed" }, { status: 500 });
  }
}
