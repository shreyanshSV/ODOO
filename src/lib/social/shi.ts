// Social Health Index (SHI) — a single 0-100 metric of an individual's (or a
// group's) sustainability engagement, from weighted normalized factors.
// Pure: callers pass already-normalized 0-1 values; the weights live here so
// the formula is transparent and reused across employee/department/company.

const clamp01 = (n: number) => Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0));

export type ShiInput = {
  csr: number; // CSR participation
  challenges: number; // challenge completion
  xp: number; // experience
  badges: number; // recognition
};

export type ShiFactor = { key: keyof ShiInput; label: string; value: number; weight: number; contribution: number };
export type Shi = { score: number; factors: ShiFactor[] };

const WEIGHTS: { key: keyof ShiInput; label: string; weight: number }[] = [
  { key: "csr", label: "CSR participation", weight: 0.3 },
  { key: "challenges", label: "Challenge completion", weight: 0.25 },
  { key: "xp", label: "Experience (XP)", weight: 0.25 },
  { key: "badges", label: "Recognition (badges)", weight: 0.2 },
];

export function computeShi(input: ShiInput): Shi {
  const factors: ShiFactor[] = WEIGHTS.map((w) => {
    const value = clamp01(input[w.key]);
    return { key: w.key, label: w.label, value, weight: w.weight, contribution: Math.round(value * w.weight * 100) };
  });
  const score = Math.round(factors.reduce((s, f) => s + f.value * f.weight, 0) * 100);
  return { score, factors };
}

export function shiBand(score: number): string {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Strong";
  if (score >= 40) return "Developing";
  if (score >= 20) return "At risk";
  return "Low";
}
