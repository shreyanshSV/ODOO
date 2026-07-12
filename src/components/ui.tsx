import Link from "next/link";
import { titleCase } from "@/lib/format";

/* ---------- Page chrome ---------- */

export function PageHeader({
  title,
  subtitle,
  accent = "text-ink",
  actions,
}: {
  title: string;
  subtitle?: string;
  accent?: string;
  actions?: React.ReactNode;
}) {
  const bar = accent.replace("text-", "bg-");
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3 animate-fade-in">
      <div>
        <div className={`mb-2 h-1 w-10 rounded-full ${bar}`} />
        <h1 className={`font-display text-2xl font-semibold tracking-tight ${accent}`}>{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-faint">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({
  title,
  children,
  className = "",
  right,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
  right?: React.ReactNode;
}) {
  return (
    <section className={`panel p-4 ${className}`}>
      {(title || right) && (
        <div className="mb-3 flex items-center justify-between gap-3">
          {title && <h2 className="text-sm font-semibold text-ink">{title}</h2>}
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

/* ---------- Section title (additive helper) ---------- */

export function SectionTitle({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h2 className={`mb-3 text-[11px] font-semibold uppercase tracking-wider text-faint ${className}`}>
      {children}
    </h2>
  );
}

/* ---------- Score tile (dashboard) ---------- */

export function ScoreTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: string; // tailwind text color class, e.g. "text-env"
}) {
  const bar = accent.replace("text-", "bg-");
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="panel-2 card-hover overflow-hidden shadow-card animate-scale-in">
      <div className={`h-1.5 w-full ${bar}`} />
      <div className="p-4">
        <div className="text-[11px] font-medium uppercase tracking-wider text-faint">{label}</div>
        <div className={`mt-1.5 font-display text-3xl font-semibold tabular-nums leading-none ${accent}`}>
          {value}
          <span className="ml-1 text-sm font-normal text-faint">/ 100</span>
        </div>
        <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-bg/60">
          <div
            className={`h-full rounded-full ${bar} opacity-80 transition-[width] duration-700 ease-out`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

/* ---------- Stat card (additive general-purpose metric) ---------- */

export function StatCard({
  label,
  value,
  accent = "text-ink",
  hint,
}: {
  label: string;
  value: React.ReactNode;
  accent?: string;
  hint?: string;
}) {
  const bar = accent.replace("text-", "bg-");
  return (
    <div className="panel card-hover p-4">
      <div className="flex items-center gap-2">
        <span className={`h-3 w-1 rounded-full ${bar}`} />
        <span className="text-[11px] font-medium uppercase tracking-wider text-faint">{label}</span>
      </div>
      <div className={`mt-2 font-display text-2xl font-semibold tabular-nums ${accent}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-faint">{hint}</div>}
    </div>
  );
}

/* ---------- Status pill ---------- */

const PILL: Record<string, string> = {
  ACTIVE: "bg-env/15 text-env",
  ON_TRACK: "bg-env/15 text-env",
  COMPLETED: "bg-social/15 text-social",
  APPROVED: "bg-env/15 text-env",
  RESOLVED: "bg-env/15 text-env",
  PENDING: "bg-warn/20 text-warn",
  UNDER_REVIEW: "bg-gov/15 text-gov",
  DRAFT: "bg-faint/15 text-faint",
  ARCHIVED: "bg-faint/15 text-faint",
  OPEN: "bg-danger/15 text-danger",
  REJECTED: "bg-danger/15 text-danger",
  HIGH: "bg-danger/15 text-danger",
  MEDIUM: "bg-warn/20 text-warn",
  LOW: "bg-faint/15 text-faint",
  INACTIVE: "bg-faint/15 text-faint",
};

export function Pill({ value }: { value: string }) {
  const cls = PILL[value] ?? "bg-faint/15 text-faint";
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ring-white/5 ${cls}`}
    >
      {titleCase(value)}
    </span>
  );
}

/* ---------- Progress bar ---------- */

export function Progress({ value, accent = "bg-env" }: { value: number; accent?: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-full overflow-hidden rounded-full bg-bg/70 shadow-inset">
        <div
          className={`h-full rounded-full ${accent} transition-[width] duration-700 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-9 shrink-0 text-right text-xs tabular-nums text-muted">{pct}%</span>
    </div>
  );
}

/* ---------- Table ---------- */

export function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border shadow-card">
      <table className="w-full min-w-[640px] border-collapse [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-row/50">
        <thead className="bg-row">
          <tr>
            {head.map((h) => (
              <th key={h} className="th">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">{children}</tbody>
      </table>
    </div>
  );
}

export function EmptyState({ text }: { text: string }) {
  return (
    <div className="panel-2 flex flex-col items-center justify-center gap-2 p-10 text-center text-sm text-faint">
      {text}
    </div>
  );
}

/* ---------- Top module tabs ---------- */

const TABS = [
  { label: "Dashboard", href: "/" },
  { label: "Environmental", href: "/environmental/emission-factors" },
  { label: "Social", href: "/social/csr" },
  { label: "Governance", href: "/governance/policies" },
  { label: "Gamification", href: "/gamification/challenges" },
  { label: "Reports", href: "/reports" },
  { label: "Settings", href: "/settings/departments" },
];

export function ModuleTabs({ active }: { active: string }) {
  return (
    <div className="mb-6 animate-fade-in">
      <div className="inline-flex flex-wrap gap-1 rounded-xl border border-border bg-panel2 p-1 shadow-inset">
        {TABS.map((t) => {
          const isActive = t.label === active;
          return (
            <Link
              key={t.label}
              href={t.href}
              aria-current={isActive ? "page" : undefined}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-overall/40 ${
                isActive
                  ? "bg-panel text-ink shadow-soft"
                  : "text-faint hover:bg-panel/50 hover:text-ink"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
