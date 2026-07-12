import Link from "next/link";
import { Leaf, AlertTriangle, Factory, ShieldCheck, Plus, Trophy, FileBarChart, TrendingDown, BarChart3, Clock, Zap } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getEsgSnapshot, getEmissionsTrend } from "@/lib/esg";
import { Card, ModuleTabs, PageHeader, ScoreTile } from "@/components/ui";
import { EmissionsTrend, DeptRanking } from "@/components/charts";
import { fmtNum } from "@/lib/format";

export const dynamic = "force-dynamic";

async function getRecentActivity() {
  const [parts, issues, txnCount, acks] = await Promise.all([
    prisma.employeeParticipation.findMany({
      where: { approvalStatus: "APPROVED" },
      include: { employee: true, csrActivity: true },
      orderBy: { createdAt: "desc" },
      take: 2,
    }),
    prisma.complianceIssue.findMany({
      where: { status: { not: "RESOLVED" } },
      include: { department: true },
      orderBy: { createdAt: "desc" },
      take: 1,
    }),
    prisma.carbonTransaction.count(),
    prisma.policyAcknowledgement.findMany({
      include: { employee: { include: { department: true } }, policy: true },
      orderBy: { acknowledgedAt: "desc" },
      take: 1,
    }),
  ]);

  const items: { icon: React.ReactNode; text: string }[] = [];
  for (const p of parts)
    items.push({
      icon: <Leaf size={14} className="text-env" />,
      text: `${p.employee.name} completed '${p.csrActivity.name}'`,
    });
  for (const i of issues)
    items.push({
      icon: <AlertTriangle size={14} className="text-danger" />,
      text: `New ${i.severity.toLowerCase()} compliance issue in ${i.department?.name ?? "—"}`,
    });
  if (txnCount)
    items.push({
      icon: <Factory size={14} className="text-muted" />,
      text: `${fmtNum(txnCount)} carbon transactions logged`,
    });
  for (const a of acks)
    items.push({
      icon: <ShieldCheck size={14} className="text-gov" />,
      text: `${a.employee.department?.name ?? a.employee.name} acknowledged ${a.policy.name}`,
    });
  return items;
}

export default async function DashboardPage() {
  const [snap, trend, activity] = await Promise.all([
    getEsgSnapshot(),
    getEmissionsTrend(12),
    getRecentActivity(),
  ]);

  const ranking = [...snap.departments]
    .sort((a, b) => b.total - a.total)
    .map((d) => ({ name: d.code || d.name.slice(0, 4), total: d.total }));

  return (
    <div className="p-6 animate-fade-in">
      <PageHeader
        title="Dashboard: Executive Overview"
        subtitle="Live ESG performance across the organization"
      />
      <ModuleTabs active="Dashboard" />

      {/* Score tiles */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ScoreTile label="Environmental Score" value={snap.org.env} accent="text-env" />
        <ScoreTile label="Social Score" value={snap.org.social} accent="text-social" />
        <ScoreTile label="Governance Score" value={snap.org.gov} accent="text-gov" />
        <ScoreTile label="Overall ESG Score" value={snap.org.overall} accent="text-overall" />
      </div>

      {/* Charts */}
      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card title={<><TrendingDown size={15} className="text-env" /> Emissions Trend (12 mo)</>}>
          <EmissionsTrend data={trend} />
        </Card>
        <Card title={<><BarChart3 size={15} className="text-overall" /> Department ESG Ranking</>}>
          <DeptRanking data={ranking} />
        </Card>
      </div>

      {/* Activity + quick actions */}
      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card title={<><Clock size={15} className="text-muted" /> Recent Activity</>}>
          {activity.length ? (
            <ul className="space-y-2.5">
              {activity.map((a, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-muted">
                  {a.icon}
                  <span>{a.text}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-faint">No activity yet — seed the database to see live data.</p>
          )}
        </Card>

        <Card title={<><Zap size={15} className="text-game" /> Quick Actions</>}>
          <div className="grid gap-2">
            <Link href="/environmental/carbon-transactions" className="btn-primary">
              <Plus size={15} /> Log Carbon Data
            </Link>
            <Link href="/environmental/goals" className="btn-ghost">
              <Leaf size={15} /> Manage Goals
            </Link>
            <Link href="/gamification/challenges" className="btn-ghost">
              <Trophy size={15} /> Start Challenge
            </Link>
            <Link href="/reports" className="btn-ghost">
              <FileBarChart size={15} /> View Reports
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
