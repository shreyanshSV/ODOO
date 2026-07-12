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
    icon: <LayoutDashboard size={16} />,
    color: "text-overall",
    items: [{ label: "Executive Overview", href: "/" }],
  },
  {
    title: "Environmental",
    icon: <Leaf size={16} />,
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
    icon: <Users size={16} />,
    color: "text-social",
    items: [
      { label: "CSR Activities", href: "/social/csr" },
      { label: "Employee Participation", href: "/social/participation" },
      { label: "Diversity Dashboard", href: "/social/diversity" },
    ],
  },
  {
    title: "Governance",
    icon: <Landmark size={16} />,
    color: "text-gov",
    items: [
      { label: "Policies", href: "/governance/policies" },
      { label: "Audits", href: "/governance/audits" },
      { label: "Compliance Issues", href: "/governance/compliance" },
    ],
  },
  {
    title: "Gamification",
    icon: <Trophy size={16} />,
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
    icon: <FileBarChart size={16} />,
    color: "text-muted",
    items: [{ label: "Report Center", href: "/reports" }],
  },
  {
    title: "Settings",
    icon: <Settings size={16} />,
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

      {user && (
        <div className="mt-6 border-t border-border pt-3">
          <div className="truncate px-2 text-sm font-medium text-ink">{user.name}</div>
          <div className="px-2 text-[11px] text-faint">{titleCase(user.role)}</div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="mt-2 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted transition-colors hover:text-danger"
          >
            <LogOut size={14} /> Sign out
          </button>
        </div>
      )}
    </aside>
  );
}
