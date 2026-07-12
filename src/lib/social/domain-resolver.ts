// Bulk company-name -> domain resolver. TypeScript port of cps/domains.py.
// Strategy per name (stops at first hit): Clearbit autocomplete -> DuckDuckGo
// HTML -> Bing HTML. Strips legal/geo noise, filters directory/social domains,
// scores name↔domain similarity for a confidence label.

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

// Domains that are never a company's own site.
const JUNK = new Set([
  "facebook.com", "linkedin.com", "twitter.com", "x.com", "instagram.com",
  "youtube.com", "wikipedia.org", "bloomberg.com", "crunchbase.com",
  "dnb.com", "zoominfo.com", "glassdoor.com", "indeed.com", "yelp.com",
  "marinetraffic.com", "vesselfinder.com", "shipspotting.com", "equasis.org",
  "opencorporates.com", "tradeindia.com", "indiamart.com", "exportersindia.com",
  "yellowpages.com", "europages.com", "kompass.com", "manta.com",
  "amazon.com", "google.com", "bing.com", "duckduckgo.com", "maps.google.com",
  "researchgate.net", "scribd.com", "slideshare.net", "issuu.com",
]);

const LEGAL =
  /\b(ltd|limited|inc|incorporated|llc|llp|pvt|private|co|company|corp|corporation|gmbh|bv|nv|plc|pte|sa|srl|ag|as|group|holdings?|intl|international|shipping|marine|maritime|logistics|services?)\b/gi;

// Trailing legal/geographic noise to strip.
const STOP = new Set([
  "SA", "CV", "RL", "SC", "SPR", "SAPI", "SAB", "SADECV", "SDERL", "EN",
  "DE", "S", "A", "C", "V", "R", "L", "MEXICO", "MEXICANA", "MX",
  "CORP", "CORPORATION", "INC", "INCORPORATED", "LLC", "LLP", "LTD",
  "LIMITED", "CO", "COMPANY", "COMPANIA", "GROUP", "GRUPO", "INTL",
  "INTERNATIONAL", "AND",
]);

export type DomainResult = { company: string; domain: string; source: string; confidence: string };

function cleanQuery(name: string): string {
  const toks = name.toUpperCase().replace(/[.,/&()]/g, " ").split(/\s+/).filter(Boolean);
  while (toks.length && STOP.has(toks[toks.length - 1])) toks.pop();
  return toks.length ? toks.join(" ") : name.trim();
}

function cleanDomain(url: string): string {
  if (!url) return "";
  if (url.startsWith("//")) url = "http:" + url;
  if (!url.includes("://")) url = "http://" + url;
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
  return host.startsWith("www.") ? host.slice(4) : host;
}

function isJunk(domain: string): boolean {
  if (!domain || !domain.includes(".")) return true;
  if (/\.(gov|gob|edu|mil|ac)(\.|$)/.test(domain)) return true;
  for (const j of JUNK) if (domain === j || domain.endsWith("." + j)) return true;
  return false;
}

const normName = (s: string) => s.toLowerCase().replace(LEGAL, " ").replace(/[^a-z0-9]+/g, "");

function bigrams(s: string): Map<string, number> {
  const m = new Map<string, number>();
  for (let i = 0; i < s.length - 1; i++) {
    const bg = s.slice(i, i + 2);
    m.set(bg, (m.get(bg) ?? 0) + 1);
  }
  return m;
}

// Dice bigram coefficient — stands in for difflib.SequenceMatcher.ratio.
function dice(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const A = bigrams(a);
  const B = bigrams(b);
  let inter = 0;
  let total = 0;
  for (const [bg, c] of A) {
    total += c;
    if (B.has(bg)) inter += Math.min(c, B.get(bg)!);
  }
  for (const c of B.values()) total += c;
  return total ? (2 * inter) / total : 0;
}

function score(name: string, domain: string): number {
  if (!domain) return 0;
  const a = normName(name);
  const b = normName(domain.split(".")[0]);
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.85;
  return dice(a, b);
}

function label(query: string, domain: string): string {
  const s = score(query, domain);
  return s >= 0.75 ? "high" : s >= 0.45 ? "medium" : "low";
}

async function get(url: string, ms = 12000): Promise<string | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctrl.signal, redirect: "follow", headers: { "user-agent": UA, accept: "*/*" } });
    if (!r.ok) return null;
    return await r.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function clearbitOnce(query: string): Promise<[string, number]> {
  const txt = await get(`https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(query)}`, 8000);
  if (!txt) return ["", -1];
  let data: { name?: string; domain?: string }[];
  try {
    data = JSON.parse(txt);
  } catch {
    return ["", -1];
  }
  let best = "";
  let bestS = -1;
  for (const item of data ?? []) {
    const d = cleanDomain(item.domain ?? "");
    if (isJunk(d)) continue;
    const s = Math.max(score(query, d), dice(normName(query), normName(item.name ?? "")));
    if (s > bestS) {
      best = d;
      bestS = s;
    }
  }
  return [best, bestS];
}

async function clearbit(query: string): Promise<string> {
  const [best] = await clearbitOnce(query);
  if (best) return best;
  const words = query.split(/\s+/);
  if (words.length > 2) {
    const [b2, s2] = await clearbitOnce(words.slice(0, 2).join(" "));
    if (b2 && s2 >= 0.6) return b2;
  }
  return "";
}

function firstGood(hosts: string[]): string {
  for (const h of hosts) {
    const d = cleanDomain(h);
    if (!isJunk(d)) return d;
  }
  return "";
}

async function duckduckgo(name: string): Promise<string> {
  const html = await get(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(name + " official website")}`);
  if (!html) return "";
  let hosts = [...html.matchAll(/uddg=([^&"]+)/g)].map((m) => {
    try {
      return decodeURIComponent(m[1]);
    } catch {
      return "";
    }
  });
  if (!hosts.length) hosts = [...html.matchAll(/class="result__a"[^>]*href="([^"]+)"/g)].map((m) => m[1]);
  return firstGood(hosts);
}

async function bing(name: string): Promise<string> {
  const html = await get(`https://www.bing.com/search?q=${encodeURIComponent(name + " official website")}`);
  if (!html) return "";
  const hosts = [...html.matchAll(/<li class="b_algo"[\s\S]*?<a[^>]+href="(https?:\/\/[^"]+)"/g)].map((m) => m[1]);
  return firstGood(hosts);
}

export async function resolveDomain(name: string): Promise<DomainResult> {
  const q = cleanQuery(name);
  const steps: [string, (q: string) => Promise<string>][] = [
    ["clearbit", clearbit],
    ["duckduckgo", duckduckgo],
    ["bing", bing],
  ];
  for (const [src, fn] of steps) {
    try {
      const d = await fn(q);
      if (d) return { company: name, domain: d, source: src, confidence: label(q, d) };
    } catch {
      /* never lose the batch over one bad name */
    }
  }
  return { company: name, domain: "", source: "", confidence: "" };
}

/** Resolve many names with bounded concurrency. */
export async function resolveDomains(names: string[], concurrency = 6): Promise<DomainResult[]> {
  const results: DomainResult[] = new Array(names.length);
  let next = 0;
  async function worker() {
    while (next < names.length) {
      const i = next++;
      results[i] = await resolveDomain(names[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, names.length) }, worker));
  return results;
}
