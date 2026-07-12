import type { AIProvider, CompanyEnrichment } from "./types";

// Domains that are NOT a company's official site (directories / social media).
const SOCIAL_DIRECTORY = [
  "facebook.com", "linkedin.com", "twitter.com", "x.com", "instagram.com",
  "youtube.com", "wikipedia.org", "crunchbase.com", "bloomberg.com",
  "glassdoor.com", "indeed.com", "pinterest.com", "medium.com",
];

async function fetchText(url: string, ms = 6000): Promise<string | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: { "user-agent": "Mozilla/5.0 (compatible; EcoSphereBot/1.0)", accept: "text/html" },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJson<T>(url: string, ms = 4000): Promise<T | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { accept: "application/json" } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

const stripTags = (html: string) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

function metaDescription(html: string): string | null {
  const patterns = [
    /<meta[^>]+name=["']description["'][^>]*content=["']([^"']+)["']/i,
    /<meta[^>]+property=["']og:description["'][^>]*content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]*name=["']description["']/i,
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m) return m[1].trim();
  }
  return null;
}

const INDUSTRY_KEYWORDS: [string, string[]][] = [
  ["Software & Technology", ["software", "saas", "platform", "cloud", "developer", "api", "technology"]],
  ["Manufacturing", ["manufacturing", "factory", "production", "industrial", "machinery"]],
  ["Financial Services", ["bank", "banking", "insurance", "fintech", "payments", "investment"]],
  ["Retail & E-commerce", ["retail", "ecommerce", "e-commerce", "shopping", "consumer goods"]],
  ["Healthcare & Pharma", ["hospital", "clinic", "pharma", "medical", "biotech", "patient", "healthcare"]],
  ["Energy & Utilities", ["energy", "utility", "renewable", "solar", "electric", "oil", "gas"]],
  ["Logistics & Transport", ["logistics", "shipping", "freight", "transport", "supply chain", "delivery"]],
  ["Food & Beverage", ["food", "beverage", "restaurant", "grocery", "agriculture"]],
  ["Education", ["education", "university", "school", "learning", "edtech", "students"]],
  ["Telecommunications", ["telecom", "broadband", "5g", "carrier", "network operator"]],
  ["Automotive", ["automotive", "vehicle", "ev", "mobility"]],
  ["Construction & Real Estate", ["construction", "real estate", "property", "infrastructure"]],
];

// Whole-word match so short keywords (e.g. "ev") don't match inside longer
// words (e.g. "unil-EV-er"). Case-insensitive.
const wordRe = (k: string) => new RegExp(`\\b${k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");

function detectIndustry(corpus: string): string | null {
  let best: string | null = null;
  let bestCount = 0;
  for (const [industry, kws] of INDUSTRY_KEYWORDS) {
    const count = kws.reduce((n, k) => n + (wordRe(k).test(corpus) ? 1 : 0), 0);
    if (count > bestCount) {
      bestCount = count;
      best = industry;
    }
  }
  return bestCount >= 1 ? best : null;
}

const DEPT_BASE = ["Operations", "Sales", "Marketing", "Human Resources", "Finance", "Information Technology"];
const DEPT_BY_INDUSTRY: Record<string, string[]> = {
  "Software & Technology": ["Engineering", "Product", "Customer Success", "Design"],
  Manufacturing: ["Production", "Supply Chain", "Quality Assurance", "R&D"],
  "Financial Services": ["Risk & Compliance", "Investment", "Customer Service"],
  "Retail & E-commerce": ["Merchandising", "Supply Chain", "Store Operations"],
  "Healthcare & Pharma": ["Clinical", "R&D", "Regulatory Affairs"],
  "Energy & Utilities": ["Field Services", "Sustainability", "Engineering"],
  "Logistics & Transport": ["Fleet", "Warehouse", "Supply Chain"],
};
function departmentsFor(industry: string | null): string[] {
  const extra = industry ? DEPT_BY_INDUSTRY[industry] ?? [] : [];
  return Array.from(new Set([...extra, ...DEPT_BASE])).slice(0, 8);
}

const CSR_DEFAULT = ["Environment", "Community", "Education", "Health & Wellbeing", "Diversity & Inclusion"];
function detectCsr(corpus: string): string[] {
  const c = corpus.toLowerCase();
  const found = new Set<string>();
  if (/tree|carbon|climate|environment|renewable|recycl/.test(c)) found.add("Environment");
  if (/volunteer|community|donat|charit/.test(c)) found.add("Community");
  if (/education|school|scholarship|student|literacy/.test(c)) found.add("Education");
  if (/health|wellbeing|blood|medical/.test(c)) found.add("Health & Wellbeing");
  if (/diversity|inclusion|equity|gender/.test(c)) found.add("Diversity & Inclusion");
  if (/water|sanitation/.test(c)) found.add("Water & Sanitation");
  CSR_DEFAULT.forEach((d) => found.add(d));
  return Array.from(found).slice(0, 6);
}

const GOAL_TEMPLATES = [
  "Achieve carbon neutrality by 2040",
  "Source 50% of energy from renewables by 2030",
  "Log 5,000 employee volunteer hours per year",
  "Achieve zero waste to landfill",
  "Reach 30% women in leadership roles",
];

const normalizeDomain = (d?: string) =>
  d?.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "") || null;

type ClearbitSuggest = { name: string; domain: string; logo: string };

export const WebEnrichmentProvider: AIProvider = {
  id: "web",
  async enrichCompany({ name, domain }) {
    const sources: string[] = [];
    let resolvedDomain = normalizeDomain(domain);
    let logoUrl: string | null = null;

    // 1) resolve the OFFICIAL domain (free, keyless) — skip social/directory domains
    if (!resolvedDomain) {
      const suggestions = await fetchJson<ClearbitSuggest[]>(
        `https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(name)}`
      );
      const pick = (suggestions ?? []).find(
        (s) => s.domain && !SOCIAL_DIRECTORY.some((d) => s.domain === d || s.domain.endsWith(`.${d}`))
      );
      if (pick) {
        resolvedDomain = pick.domain;
        logoUrl = pick.logo || null;
      }
    }

    const discovered = !!resolvedDomain;
    const website = resolvedDomain ? `https://${resolvedDomain}` : null;
    if (resolvedDomain && !logoUrl) logoUrl = `https://logo.clearbit.com/${resolvedDomain}`;

    // 2) read public pages for description + industry/CSR signals
    let description: string | null = null;
    let corpus = name;
    if (resolvedDomain) {
      const paths = ["", "about", "about-us", "sustainability", "esg", "csr", "responsibility"];
      const results = await Promise.allSettled(paths.map((p) => fetchText(`https://${resolvedDomain}/${p}`)));
      results.forEach((r, i) => {
        if (r.status === "fulfilled" && r.value) {
          sources.push(`${resolvedDomain}/${paths[i]}`.replace(/\/$/, ""));
          if (!description) description = metaDescription(r.value);
          corpus += " " + stripTags(r.value).slice(0, 4000);
        }
      });
    }

    const industry = detectIndustry(corpus);

    return {
      name,
      domain: resolvedDomain,
      website,
      logoUrl,
      industry,
      headquarters: null,
      description: description ?? (discovered ? `${name} — official site ${resolvedDomain}.` : null),
      departments: departmentsFor(industry),
      csrCategories: detectCsr(corpus),
      goals: GOAL_TEMPLATES,
      sources,
      discovered,
    };
  },
};
