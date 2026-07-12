"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Leaf,
  Users,
  Landmark,
  Trophy,
  FileBarChart,
  Settings,
  LogOut,
} from "lucide-react";
import { titleCase } from "@/lib/format";

type Item = { label: string; href: string };
type Group = { title: string; icon: React.ReactNode; color: string; items: Item[] };

const GROUPS: Group[] = [
  {
    title: "Dashboard",
    icon: <LayoutDashboard size={15} />,
    color: "text-overall",
    items: [{ label: "Executive Overview", href: "/" }],
  },
  {
    title: "Environmental",
    icon: <Leaf size={15} />,
    color: "text-env",
    items: [
      { label: "Live Map & Simulator", href: "/environmental/simulator" },
      { label: "Emission Factors", href: "/environmental/emission-factors" },
      { label: "Carbon Transactions", href: "/environmental/carbon-transactions" },
      { label: "Environmental Goals", href: "/environmental/goals" },
    ],
  },
  {
    title: "Social",
    icon: <Users size={15} />,
    color: "text-social",
    items: [
      { label: "CSR Activities", href: "/social/csr" },
      { label: "Employee Participation", href: "/social/participation" },
      { label: "Diversity Dashboard", href: "/social/diversity" },
    ],
  },
  {
    title: "Governance",
    icon: <Landmark size={15} />,
    color: "text-gov",
    items: [
      { label: "Policies", href: "/governance/policies" },
      { label: "Audits", href: "/governance/audits" },
      { label: "Compliance Issues", href: "/governance/compliance" },
    ],
  },
  {
    title: "Gamification",
    icon: <Trophy size={15} />,
    color: "text-game",
    items: [
      { label: "Challenges", href: "/gamification/challenges" },
      { label: "Badges", href: "/gamification/badges" },
      { label: "Rewards", href: "/gamification/rewards" },
      { label: "Leaderboard", href: "/gamification/leaderboard" },
    ],
  },
  {
    title: "Reports",
    icon: <FileBarChart size={15} />,
    color: "text-muted",
    items: [{ label: "Report Center", href: "/reports" }],
  },
  {
    title: "Settings",
    icon: <Settings size={15} />,
    color: "text-muted",
    items: [
      { label: "Departments", href: "/settings/departments" },
      { label: "Categories", href: "/settings/categories" },
      { label: "ESG Configuration", href: "/settings/esg" },
      { label: "Notification Settings", href: "/settings/notifications" },
    ],
  },
];

type SidebarUser = { name: string; email: string; role: string };

export function Sidebar({ user }: { user?: SidebarUser }) {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col overflow-y-auto border-r border-border bg-gradient-to-b from-panel to-bg px-3 py-5 md:flex">
      {/* Brand lockup */}
      <div className="mb-7 flex items-center gap-2.5 px-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-env to-teal-600 shadow-lift">
          <Leaf size={18} className="text-bg" />
        </div>
        <div className="min-w-0">
          <div className="font-display text-base font-semibold text-ink">EcoSphere</div>
          <div className="text-[11px] text-faint">ESG Management Platform</div>
        </div>
      </div>

      <nav className="flex-1 space-y-5">
        {GROUPS.map((g) => {
          const activeBar = g.color.replace("text-", "bg-");
          return (
            <div key={g.title}>
              <div
                className={`mb-1.5 flex items-center gap-2 px-2 text-[11px] font-semibold uppercase tracking-wider ${g.color}`}
              >
                <span className="opacity-90">{g.icon}</span>
                <span>{g.title}</span>
              </div>
              <ul className="space-y-0.5">
                {g.items.map((it) => {
                  const active = pathname === it.href;
                  return (
                    <li key={it.href}>
                      <Link
                        href={it.href}
                        aria-current={active ? "page" : undefined}
                        className={`relative flex items-center rounded-lg py-1.5 pl-6 pr-3 text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-overall/40 ${
                          active
                            ? "bg-panel2 font-medium text-ink shadow-soft"
                            : "text-muted hover:bg-panel2/50 hover:text-ink"
                        }`}
                      >
                        {active && (
                          <span
                            className={`absolute left-1.5 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full ${activeBar}`}
                          />
                        )}
                        {it.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      {user && (
        <div className="mt-6 border-t border-border pt-4">
          <div className="flex items-center gap-2.5 px-1">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-panel2 text-xs font-semibold text-ink ring-1 ring-border">
              {user.name?.charAt(0)?.toUpperCase() ?? "U"}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-ink">{user.name}</div>
              <div className="text-[11px] text-faint">{titleCase(user.role)}</div>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="mt-3 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-muted transition hover:bg-panel2 hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/40"
          >
            <LogOut size={14} /> Sign out
          </button>
        </div>
      )}
    </aside>
  );
}
