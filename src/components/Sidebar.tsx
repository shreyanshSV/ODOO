"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Leaf,
  Users,
  Landmark,
  Trophy,
  FileBarChart,
  Settings,
} from "lucide-react";

type Item = { label: string; href: string; soon?: boolean };
type Group = { title: string; icon: React.ReactNode; color: string; items: Item[] };

// Live links point at built pages; `soon` items land as later vertical slices.
const GROUPS: Group[] = [
  {
    title: "Dashboard",
    icon: <LayoutDashboard size={16} />,
    color: "text-overall",
    items: [{ label: "Executive Overview", href: "/" }],
  },
  {
    title: "Environmental",
    icon: <Leaf size={16} />,
    color: "text-env",
    items: [
      { label: "Emission Factors", href: "/environmental/emission-factors" },
      { label: "Carbon Transactions", href: "/environmental/carbon-transactions" },
      { label: "Environmental Goals", href: "/environmental/goals" },
    ],
  },
  {
    title: "Social",
    icon: <Users size={16} />,
    color: "text-social",
    items: [
      { label: "CSR Activities", href: "/social/csr", soon: true },
      { label: "Employee Participation", href: "/social/participation", soon: true },
      { label: "Diversity Dashboard", href: "/social/diversity", soon: true },
    ],
  },
  {
    title: "Governance",
    icon: <Landmark size={16} />,
    color: "text-gov",
    items: [
      { label: "Policies", href: "/governance/policies", soon: true },
      { label: "Audits", href: "/governance/audits", soon: true },
      { label: "Compliance Issues", href: "/governance/compliance", soon: true },
    ],
  },
  {
    title: "Gamification",
    icon: <Trophy size={16} />,
    color: "text-game",
    items: [
      { label: "Challenges", href: "/gamification/challenges", soon: true },
      { label: "Badges", href: "/gamification/badges", soon: true },
      { label: "Rewards", href: "/gamification/rewards", soon: true },
      { label: "Leaderboard", href: "/gamification/leaderboard", soon: true },
    ],
  },
  {
    title: "Reports",
    icon: <FileBarChart size={16} />,
    color: "text-muted",
    items: [{ label: "Report Center", href: "/reports", soon: true }],
  },
  {
    title: "Settings",
    icon: <Settings size={16} />,
    color: "text-muted",
    items: [
      { label: "Departments", href: "/settings/departments", soon: true },
      { label: "ESG Configuration", href: "/settings/esg", soon: true },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 overflow-y-auto border-r border-border bg-panel px-3 py-5 md:block">
      <div className="mb-6 px-2">
        <div className="text-lg font-semibold text-overall">EcoSphere</div>
        <div className="text-xs text-faint">ESG Management Platform</div>
      </div>

      <nav className="space-y-5">
        {GROUPS.map((g) => (
          <div key={g.title}>
            <div className={`mb-1 flex items-center gap-2 px-2 text-sm font-semibold ${g.color}`}>
              {g.icon}
              <span>{g.title}</span>
            </div>
            <ul className="space-y-0.5">
              {g.items.map((it) => {
                const active = pathname === it.href;
                if (it.soon) {
                  return (
                    <li
                      key={it.href}
                      className="flex items-center justify-between rounded-md px-3 py-1.5 pl-6 text-xs text-faint/70"
                    >
                      <span>{it.label}</span>
                      <span className="rounded bg-panel2 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-faint">
                        soon
                      </span>
                    </li>
                  );
                }
                return (
                  <li key={it.href}>
                    <Link
                      href={it.href}
                      className={`block rounded-md px-3 py-1.5 pl-6 text-xs transition-colors ${
                        active ? "bg-panel2 text-ink" : "text-muted hover:text-ink"
                      }`}
                    >
                      {it.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
