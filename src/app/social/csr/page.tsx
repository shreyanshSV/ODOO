import { Trash2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { SOCIAL_TABS } from "@/lib/nav";
import { Card, ModuleTabs, PageHeader, Pill, Table } from "@/components/ui";
import { SubNav } from "@/components/SubNav";
import { fmtNum } from "@/lib/format";
import { createCsr, deleteCsr } from "../actions";

export const dynamic = "force-dynamic";

export default async function CsrPage() {
  const [activities, categories, departments] = await Promise.all([
    prisma.cSRActivity.findMany({
      include: { category: true, department: true, participations: true },
      orderBy: { date: "desc" },
    }),
    prisma.category.findMany({ where: { type: "CSR_ACTIVITY" }, orderBy: { name: "asc" } }),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="p-6">
      <PageHeader
        title="Social: CSR Activities"
        subtitle="Community and social responsibility initiatives"
        accent="text-social"
      />
      <ModuleTabs active="Social" />
      <SubNav items={SOCIAL_TABS} />

      <Card title="Add CSR Activity" className="mb-4">
        <form action={createCsr} className="grid grid-cols-1 gap-3 sm:grid-cols-5">
          <div className="sm:col-span-2">
            <label className="label">Name</label>
            <input name="name" required className="input" placeholder="Beach Cleanup Drive" />
          </div>
          <div>
            <label className="label">Category</label>
            <select name="categoryId" className="input">
              <option value="">—</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
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
            <label className="label">Points</label>
            <input name="points" type="number" className="input" placeholder="50" />
          </div>
          <div className="sm:col-span-5">
            <label className="label">Description</label>
            <input name="description" className="input" placeholder="Optional notes" />
          </div>
          <div className="sm:col-span-5">
            <button className="btn-primary">Add Activity</button>
          </div>
        </form>
      </Card>

      <Table head={["Name", "Category", "Department", "Points", "Status", ""]}>
        {activities.map((a) => (
          <tr key={a.id}>
            <td className="td text-ink">{a.name}</td>
            <td className="td">{a.category?.name ?? "—"}</td>
            <td className="td">{a.department?.name ?? "—"}</td>
            <td className="td">{fmtNum(a.points)}</td>
            <td className="td">
              <Pill value={a.status} />
            </td>
            <td className="td text-right">
              <form action={deleteCsr}>
                <input type="hidden" name="id" value={a.id} />
                <button className="text-faint hover:text-danger" aria-label="Delete">
                  <Trash2 size={15} />
                </button>
              </form>
            </td>
          </tr>
        ))}
        {activities.length === 0 && (
          <tr>
            <td className="td text-faint" colSpan={6}>
              No CSR activities yet — add one above.
            </td>
          </tr>
        )}
      </Table>
    </div>
  );
}
