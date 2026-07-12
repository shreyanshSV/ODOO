import { Trash2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { GOV_TABS, SEVERITIES } from "@/lib/nav";
import { Card, ModuleTabs, PageHeader, Pill, Table } from "@/components/ui";
import { SubNav } from "@/components/SubNav";
import { titleCase, fmtDate } from "@/lib/format";
import { createIssue, resolveIssue, deleteIssue } from "../actions";

export const dynamic = "force-dynamic";

export default async function CompliancePage() {
  const [issues, departments, employees, audits] = await Promise.all([
    prisma.complianceIssue.findMany({
      include: { owner: true, department: true },
      orderBy: { dueDate: "asc" },
    }),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
    prisma.employee.findMany({ orderBy: { name: "asc" } }),
    prisma.audit.findMany({ orderBy: { date: "desc" } }),
  ]);

  return (
    <div className="p-6 animate-fade-in">
      <PageHeader
        title="Governance: Compliance Issues"
        subtitle="Track and resolve open compliance issues"
        accent="text-gov"
      />
      <ModuleTabs active="Governance" />
      <SubNav items={GOV_TABS} />

      <Card title="Raise Issue" className="mb-4">
        <form action={createIssue} className="grid grid-cols-1 gap-3 sm:grid-cols-6">
          <div className="sm:col-span-2">
            <label className="label">Description</label>
            <input name="description" required className="input" placeholder="Missing waste log" />
          </div>
          <div>
            <label className="label">Severity</label>
            <select name="severity" className="input">
              {SEVERITIES.map((s) => (
                <option key={s} value={s}>
                  {titleCase(s)}
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
            <label className="label">Owner</label>
            <select name="ownerId" required className="input">
              <option value="">—</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Due Date</label>
            <input name="dueDate" type="date" className="input" />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Audit</label>
            <select name="auditId" className="input">
              <option value="">—</option>
              {audits.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-6">
            <button className="btn-primary">Raise Issue</button>
          </div>
        </form>
      </Card>

      <Table head={["Description", "Severity", "Department", "Owner", "Due Date", "Status", "Flagged", ""]}>
        {issues.map((i) => (
          <tr key={i.id}>
            <td className="td text-ink">{i.description}</td>
            <td className="td">
              <Pill value={i.severity} />
            </td>
            <td className="td">{i.department?.name ?? "—"}</td>
            <td className="td">{i.owner.name}</td>
            <td className="td">{fmtDate(i.dueDate)}</td>
            <td className="td">
              <Pill value={i.status} />
            </td>
            <td className="td text-warn">{i.flagged ? "⚠" : ""}</td>
            <td className="td text-right">
              <div className="flex items-center justify-end gap-2">
                {i.status !== "RESOLVED" && (
                  <form action={resolveIssue}>
                    <input type="hidden" name="id" value={i.id} />
                    <button className="btn-ghost">Resolve</button>
                  </form>
                )}
                <form action={deleteIssue}>
                  <input type="hidden" name="id" value={i.id} />
                  <button
                    className="rounded text-faint transition-colors hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
                    aria-label="Delete"
                  >
                    <Trash2 size={15} />
                  </button>
                </form>
              </div>
            </td>
          </tr>
        ))}
        {issues.length === 0 && (
          <tr>
            <td className="td text-faint" colSpan={8}>
              No compliance issues — raise one above.
            </td>
          </tr>
        )}
      </Table>
    </div>
  );
}
