export const fmtNum = (n: number, digits = 0) =>
  n.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });

export const fmtDate = (d: Date | string) =>
  new Date(d).toISOString().slice(0, 10);

export const fmtTonnes = (kg: number) => `${fmtNum(kg / 1000, kg % 1000 === 0 ? 0 : 1)} t`;

// Human label for an ENUM_LIKE_VALUE -> "Enum Like Value"
export const titleCase = (s: string) =>
  s.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
