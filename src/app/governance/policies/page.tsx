import { Trash2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { GOV_TABS } from "@/lib/nav";
import { Card, ModuleTabs, PageHeader, Pill, Table } from "@/components/ui";
import { SubNav } from "@/components/SubNav";
import { createPolicy, deletePolicy, acknowledgePolicy } from "../actions";

export const dynamic = "force-dynamic";

export default async function PoliciesPage() {
  const [policies, employees] = await Promise.all([
    prisma.eSGPolicy.findMany({ include: { acknowledgements: true }, orderBy: { createdAt: "desc" } }),
    prisma.employee.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="p-6">
      <PageHeader
        title="Governance: ESG Policies"
        subtitle="Published policies and employee acknowledgements"
        accent="text-gov"
      />
      <ModuleTabs active="Governance" />
      <SubNav items={GOV_TABS} />

      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Add Policy">
          <form action={createPolicy} className="grid grid-cols-1 gap-3">
            <div>
              <label className="label">Name</label>
              <input name="name" required className="input" placeholder="Data Privacy Policy" />
            </div>
            <div>
              <label className="label">Area</label>
              <input name="area" className="input" placeholder="Compliance" />
            </div>
            <div>
              <label className="label">Description</label>
              <input name="description" className="input" placeholder="Short summary" />
            </div>
            <div>
              <button className="btn-primary">Add Policy</button>
            </div>
          </form>
        </Card>

        <Card title="Acknowledge Policy">
          <form action={acknowledgePolicy} className="grid grid-cols-1 gap-3">
            <div>
              <label className="label">Employee</label>
              <select name="employeeId" required className="input">
                <option value="">—</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Policy</label>
              <select name="policyId" required className="input">
                <option value="">—</option>
                {policies.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <button className="btn-primary">Acknowledge</button>
            </div>
          </form>
        </Card>
      </div>

      <Table head={["Name", "Area", "Version", "Status", "Acknowledged", ""]}>
        {policies.map((p) => (
          <tr key={p.id}>
            <td className="td text-ink">{p.name}</td>
            <td className="td">{p.area ?? "—"}</td>
            <td className="td">{p.version}</td>
            <td className="td">
              <Pill value={p.status} />
            </td>
            <td className="td">{p.acknowledgements.length}</td>
            <td className="td text-right">
              <form action={deletePolicy}>
                <input type="hidden" name="id" value={p.id} />
                <button className="text-faint hover:text-danger" aria-label="Delete">
                  <Trash2 size={15} />
                </button>
              </form>
            </td>
          </tr>
        ))}
        {policies.length === 0 && (
          <tr>
            <td className="td text-faint" colSpan={6}>
              No policies yet — add one above.
            </td>
          </tr>
        )}
      </Table>
    </div>
  );
}
