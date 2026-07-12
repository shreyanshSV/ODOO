import { Trash2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { SETTINGS_TABS } from "@/lib/nav";
import { Card, ModuleTabs, PageHeader, Pill, Table } from "@/components/ui";
import { SubNav } from "@/components/SubNav";
import { fmtNum } from "@/lib/format";
import { createDepartment, deleteDepartment } from "../actions";

export const dynamic = "force-dynamic";

export default async function DepartmentsPage() {
  const departments = await prisma.department.findMany({
    include: { parent: true, head: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="p-6 animate-fade-in">
      <PageHeader
        title="Settings: Departments"
        subtitle="Organizational units used across ESG modules"
        accent="text-ink"
      />
      <ModuleTabs active="Settings" />
      <SubNav items={SETTINGS_TABS} />

      <Card title="Add Department" className="mb-4">
        <form action={createDepartment} className="grid grid-cols-1 gap-3 sm:grid-cols-5">
          <div className="sm:col-span-2">
            <label className="label">Name</label>
            <input name="name" required className="input" placeholder="Operations" />
          </div>
          <div>
            <label className="label">Code</label>
            <input name="code" required className="input" placeholder="OPS" />
          </div>
          <div>
            <label className="label">Employees</label>
            <input name="employeeCount" type="number" className="input" placeholder="0" />
          </div>
          <div>
            <label className="label">Parent</label>
            <select name="parentId" className="input">
              <option value="">—</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-5">
            <button className="btn-primary">Add Department</button>
          </div>
        </form>
      </Card>

      <Table head={["Name", "Code", "Parent", "Employees", "Status", ""]}>
        {departments.map((d) => (
          <tr key={d.id}>
            <td className="td text-ink">{d.name}</td>
            <td className="td">{d.code}</td>
            <td className="td">{d.parent?.name ?? "—"}</td>
            <td className="td">{fmtNum(d.employeeCount)}</td>
            <td className="td">
              <Pill value={d.status} />
            </td>
            <td className="td text-right">
              <form action={deleteDepartment}>
                <input type="hidden" name="id" value={d.id} />
                <button
                  className="rounded text-faint transition-colors hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/40"
                  aria-label="Delete"
                >
                  <Trash2 size={15} />
                </button>
              </form>
            </td>
          </tr>
        ))}
        {departments.length === 0 && (
          <tr>
            <td className="td text-faint" colSpan={6}>
              No departments yet — add one above.
            </td>
          </tr>
        )}
      </Table>
    </div>
  );
}
