export const dynamic = "force-dynamic";

// Live aircraft proxy over the free, keyless ADS-B feeds.
// Primary: adsb.lol; fallback: adsb.fi. Both share the same {ac:[...]} shape.

interface RawAircraft {
  hex?: string;
  flight?: string;
  lat?: number;
  lon?: number;
  track?: number;
  alt_baro?: number | string; // can be the string "ground"
  gs?: number;
}

interface Aircraft {
  id: string;
  callsign: string;
  lat: number;
  lon: number;
  track: number;
  altFt: number;
  speedKn: number;
}

const MAX_AIRCRAFT = 200;

const FEEDS: { source: string; url: (lat: string, lon: string, dist: string) => string }[] = [
  {
    source: "adsb.lol",
    url: (lat, lon, dist) => `https://api.adsb.lol/v2/lat/${lat}/lon/${lon}/dist/${dist}`,
  },
  {
    source: "adsb.fi",
    url: (lat, lon, dist) => `https://opendata.adsb.fi/api/v2/lat/${lat}/lon/${lon}/dist/${dist}`,
  },
];

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalize(ac: RawAircraft[]): Aircraft[] {
  const out: Aircraft[] = [];
  for (const a of ac) {
    const lat = num(a.lat);
    const lon = num(a.lon);
    if (lat === null || lon === null) continue; // skip entries without numeric position
    out.push({
      id: a.hex ?? `${lat},${lon}`,
      callsign: (a.flight ?? "").trim() || "N/A",
      lat,
      lon,
      track: num(a.track) ?? 0,
      altFt: num(a.alt_baro) ?? 0, // "ground" -> 0
      speedKn: num(a.gs) ?? 0,
    });
    if (out.length >= MAX_AIRCRAFT) break;
  }
  return out;
}

export async function GET(req: Request): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const lat = searchParams.get("lat") ?? "25";
  const lon = searchParams.get("lon") ?? "-40";
  const dist = searchParams.get("dist") ?? "250";

  for (const feed of FEEDS) {
    try {
      const res = await fetch(feed.url(lat, lon, dist), {
        headers: { accept: "application/json" },
        cache: "no-store",
      });
      if (!res.ok) continue;
      const data: { ac?: RawAircraft[] } = await res.json();
      const aircraft = normalize(Array.isArray(data.ac) ? data.ac : []);
      return Response.json({ source: feed.source, count: aircraft.length, aircraft });
    } catch {
      // try next feed
    }
  }

  return Response.json({ error: "No ADS-B feed reachable", source: "none", count: 0, aircraft: [] });
}
