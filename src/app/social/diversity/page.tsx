import { prisma } from "@/lib/prisma";
import { SOCIAL_TABS } from "@/lib/nav";
import { Card, ModuleTabs, PageHeader, Progress } from "@/components/ui";
import { SubNav } from "@/components/SubNav";
import { fmtNum } from "@/lib/format";

export const dynamic = "force-dynamic";

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel-2 overflow-hidden">
      <div className="h-1.5 w-full bg-social" />
      <div className="p-4">
        <div className="text-xs text-faint">{label}</div>
        <div className="mt-1 text-2xl font-semibold text-social">{value}</div>
      </div>
    </div>
  );
}

export default async function DiversityPage() {
  const [employees, departments] = await Promise.all([
    prisma.employee.findMany(),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
  ]);

  const total = employees.length;
  const female = employees.filter((e) => e.gender === "F").length;
  const male = employees.filter((e) => e.gender === "M").length;
  const other = total - female - male;
  const femalePct = total > 0 ? Math.round((female / total) * 100) : 0;

  const countByDept = new Map<string, number>();
  for (const e of employees) {
    if (e.departmentId) countByDept.set(e.departmentId, (countByDept.get(e.departmentId) ?? 0) + 1);
  }
  const maxDept = Math.max(1, ...departments.map((d) => countByDept.get(d.id) ?? 0));

  const genderRows: { label: string; count: number }[] = [
    { label: "Male", count: male },
    { label: "Female", count: female },
    { label: "Other", count: other },
  ];

  return (
    <div className="p-6">
      <PageHeader
        title="Social: Diversity Dashboard"
        subtitle="Workforce composition across the organization"
        accent="text-social"
      />
      <ModuleTabs active="Social" />
      <SubNav items={SOCIAL_TABS} />

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile label="Total Employees" value={fmtNum(total)} />
        <StatTile label="% Female" value={`${femalePct}%`} />
        <StatTile label="Departments" value={fmtNum(departments.length)} />
      </div>

      <Card title="Headcount by Department" className="mb-4">
        <div className="flex flex-col gap-3">
          {departments.map((d) => {
            const count = countByDept.get(d.id) ?? 0;
            return (
              <div key={d.id} className="flex items-center gap-3">
                <div className="w-40 shrink-0 truncate text-sm text-muted">{d.name}</div>
                <div className="flex-1">
                  <Progress value={Math.round((count / maxDept) * 100)} accent="bg-social" />
                </div>
                <div className="w-10 shrink-0 text-right text-sm text-ink">{fmtNum(count)}</div>
              </div>
            );
          })}
          {departments.length === 0 && <div className="text-sm text-faint">No departments yet.</div>}
        </div>
      </Card>

      <Card title="Gender Split">
        <div className="flex flex-col gap-3">
          {genderRows.map((g) => (
            <div key={g.label} className="flex items-center gap-3">
              <div className="w-40 shrink-0 text-sm text-muted">{g.label}</div>
              <div className="flex-1">
                <Progress value={total > 0 ? Math.round((g.count / total) * 100) : 0} accent="bg-social" />
              </div>
              <div className="w-10 shrink-0 text-right text-sm text-ink">{fmtNum(g.count)}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
