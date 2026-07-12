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
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className={`text-xl font-semibold ${accent}`}>{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-faint">{subtitle}</p>}
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
        <div className="mb-3 flex items-center justify-between">
          {title && <h2 className="text-sm font-semibold text-ink">{title}</h2>}
          {right}
        </div>
      )}
      {children}
    </section>
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
  return (
    <div className="panel-2 overflow-hidden">
      <div className={`h-1.5 w-full ${accent.replace("text-", "bg-")}`} />
      <div className="p-4">
        <div className="text-xs text-faint">{label}</div>
        <div className={`mt-1 text-2xl font-semibold ${accent}`}>
          {value} <span className="text-sm text-faint">/ 100</span>
        </div>
      </div>
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
    <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-medium ${cls}`}>
      {titleCase(value)}
    </span>
  );
}

/* ---------- Progress bar ---------- */

export function Progress({ value, accent = "bg-env" }: { value: number; accent?: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-full overflow-hidden rounded-full bg-panel2">
        <div className={`h-full rounded-full ${accent}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-9 shrink-0 text-right text-xs text-muted">{pct}%</span>
    </div>
  );
}

/* ---------- Table ---------- */

export function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[640px] border-collapse">
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
  return <div className="panel-2 p-8 text-center text-sm text-faint">{text}</div>;
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
    <div className="mb-5 flex flex-wrap gap-1.5 border-b border-border pb-3">
      {TABS.map((t) => (
        <Link
          key={t.label}
          href={t.href}
          className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
            t.label === active ? "bg-panel2 text-ink" : "text-faint hover:text-ink"
          }`}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
