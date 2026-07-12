// XP → level curve. Pure, reusable, unit-testable.
export type LevelInfo = {
  level: number;
  title: string;
  xpIntoLevel: number;
  xpForNext: number;
  progress: number; // 0-100 toward next level
};

const TITLES: [number, string][] = [
  [1, "Seedling"],
  [3, "Sprout"],
  [5, "Sapling"],
  [8, "Steward"],
  [12, "Champion"],
  [16, "Guardian"],
  [20, "Luminary"],
];

function titleFor(level: number): string {
  let title = TITLES[0][1];
  for (const [lvl, name] of TITLES) if (level >= lvl) title = name;
  return title;
}

// Each level costs 25% more XP than the last (starts at 300).
export function levelFromXp(xp: number): LevelInfo {
  const x = Math.max(0, Math.round(xp) || 0);
  let level = 1;
  let need = 300;
  let acc = 0;
  while (x >= acc + need) {
    acc += need;
    level += 1;
    need = Math.round(need * 1.25);
  }
  const xpIntoLevel = x - acc;
  return {
    level,
    title: titleFor(level),
    xpIntoLevel,
    xpForNext: need,
    progress: need > 0 ? Math.round((xpIntoLevel / need) * 100) : 0,
  };
}
