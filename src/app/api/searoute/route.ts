import searoute from "searoute-js";

export const dynamic = "force-dynamic";

const point = (lng: number, lat: number) => ({
  type: "Feature" as const,
  properties: {},
  geometry: { type: "Point" as const, coordinates: [lng, lat] as [number, number] },
});

// Shortest realistic maritime route between two ports (offline, no API key).
// searoute-js snaps land/coast points to the nearest sea lane and returns a
// LineString in [lng, lat]; we hand back [lat, lng] waypoints for Leaflet.
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

    const route = searoute(point(fromLng, fromLat), point(toLng, toLat));
    const coords = route?.geometry?.coordinates ?? [];
    const all: [number, number][] = coords.map((c) => [c[1], c[0]]);

    // keep the path editable: cap to ~40 waypoints
    const MAX = 40;
    let waypoints = all;
    if (all.length > MAX) {
      const stride = Math.ceil(all.length / MAX);
      waypoints = all.filter((_, i) => i % stride === 0 || i === all.length - 1);
    }

    return Response.json({
      waypoints,
      lengthNm: Math.round(route?.properties?.length ?? 0),
      count: waypoints.length,
    });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "searoute failed" }, { status: 500 });
  }
}
