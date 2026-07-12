import { Trash2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { ENV_TABS } from "@/lib/nav";
import { Card, ModuleTabs, PageHeader, Pill, Progress, Table } from "@/components/ui";
import { SubNav } from "@/components/SubNav";
import { goalProgress } from "@/lib/esg";
import { fmtDate } from "@/lib/format";
import { createGoal, deleteGoal } from "../actions";

export const dynamic = "force-dynamic";

function derivedStatus(progress: number) {
  if (progress >= 100) return "COMPLETED";
  if (progress >= 75) return "ON_TRACK";
  return "ACTIVE";
}

export default async function GoalsPage() {
  const [goals, departments] = await Promise.all([
    prisma.environmentalGoal.findMany({ include: { department: true }, orderBy: { deadline: "asc" } }),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="p-6">
      <PageHeader
        title="Environmental: Sustainability Goals"
        subtitle="Track reduction targets by department"
        accent="text-env"
      />
      <ModuleTabs active="Environmental" />
      <SubNav items={ENV_TABS} />

      <Card title="New Goal" className="mb-4">
        <form action={createGoal} className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div className="sm:col-span-2">
            <label className="label">Name</label>
            <input name="name" required className="input" placeholder="Reduce Fleet Emissions" />
          </div>
          <div>
            <label className="label">Department</label>
            <select name="departmentId" className="input">
              <option value="">—</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Target CO₂ (t)</label>
            <input name="targetCo2" type="number" step="any" className="input" placeholder="500" />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Deadline</label>
            <input name="deadline" type="date" className="input" />
          </div>
          <div className="flex items-end">
            <button className="btn-primary">Add Goal</button>
          </div>
        </form>
      </Card>

      <Table head={["Name", "Department", "Target", "Current", "Progress", "Deadline", "Status", ""]}>
        {goals.map((g) => {
          const progress = Math.round(goalProgress(g.targetCo2, g.currentCo2));
          return (
            <tr key={g.id}>
              <td className="td text-ink">{g.name}</td>
              <td className="td">{g.department?.name ?? "—"}</td>
              <td className="td">{g.targetCo2} t</td>
              <td className="td">{g.currentCo2} t</td>
              <td className="td w-56">
                <Progress value={progress} />
              </td>
              <td className="td">{fmtDate(g.deadline)}</td>
              <td className="td">
                <Pill value={derivedStatus(progress)} />
              </td>
              <td className="td text-right">
                <form action={deleteGoal}>
                  <input type="hidden" name="id" value={g.id} />
                  <button className="text-faint hover:text-danger" aria-label="Delete">
                    <Trash2 size={15} />
                  </button>
                </form>
              </td>
            </tr>
          );
        })}
        {goals.length === 0 && (
          <tr>
            <td className="td text-faint" colSpan={8}>
              No goals yet — add one above.
            </td>
          </tr>
        )}
      </Table>
    </div>
  );
}
