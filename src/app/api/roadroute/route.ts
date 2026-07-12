export const dynamic = "force-dynamic";

// Free, keyless road routing via the public OSRM demo server.
// Returns [lat, lng] waypoints for Leaflet plus the road distance in km.
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

    const url = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`;
    const res = await fetch(url, { headers: { "user-agent": "ecosphere-sim" } });
    const data = await res.json();
    if (data.code !== "Ok" || !data.routes?.length) {
      return Response.json({ waypoints: [], km: 0, count: 0, error: data.code ?? "no road route" });
    }

    const coords = (data.routes[0].geometry?.coordinates ?? []) as [number, number][];
    const all: [number, number][] = coords.map((c) => [c[1], c[0]]);

    const MAX = 40;
    let waypoints = all;
    if (all.length > MAX) {
      const stride = Math.ceil(all.length / MAX);
      waypoints = all.filter((_, i) => i % stride === 0 || i === all.length - 1);
    }

    return Response.json({
      waypoints,
      km: Math.round((data.routes[0].distance ?? 0) / 1000),
      count: waypoints.length,
    });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "roadroute failed" }, { status: 500 });
  }
}
