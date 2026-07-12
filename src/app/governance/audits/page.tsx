import { Trash2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { GOV_TABS, AUDIT_STATUSES } from "@/lib/nav";
import { Card, ModuleTabs, PageHeader, Pill, Table } from "@/components/ui";
import { SubNav } from "@/components/SubNav";
import { titleCase, fmtDate } from "@/lib/format";
import { createAudit, deleteAudit } from "../actions";

export const dynamic = "force-dynamic";

export default async function AuditsPage() {
  const [audits, departments] = await Promise.all([
    prisma.audit.findMany({ include: { department: true, issues: true }, orderBy: { date: "desc" } }),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="p-6">
      <PageHeader
        title="Governance: Audits"
        subtitle="Scheduled and completed compliance audits"
        accent="text-gov"
      />
      <ModuleTabs active="Governance" />
      <SubNav items={GOV_TABS} />

      <Card title="Schedule Audit" className="mb-4">
        <form action={createAudit} className="grid grid-cols-1 gap-3 sm:grid-cols-5">
          <div className="sm:col-span-2">
            <label className="label">Title</label>
            <input name="title" required className="input" placeholder="Q3 Compliance Audit" />
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
            <label className="label">Auditor</label>
            <input name="auditor" className="input" placeholder="Jane Doe" />
          </div>
          <div>
            <label className="label">Status</label>
            <select name="status" className="input">
              {AUDIT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {titleCase(s)}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-5">
            <label className="label">Findings</label>
            <input name="findings" className="input" placeholder="Summary of findings" />
          </div>
          <div className="sm:col-span-5">
            <button className="btn-primary">Add Audit</button>
          </div>
        </form>
      </Card>

      <Table head={["Title", "Department", "Auditor", "Date", "Status", "Issues", ""]}>
        {audits.map((a) => (
          <tr key={a.id}>
            <td className="td text-ink">{a.title}</td>
            <td className="td">{a.department?.name ?? "—"}</td>
            <td className="td">{a.auditor ?? "—"}</td>
            <td className="td">{fmtDate(a.date)}</td>
            <td className="td">
              <Pill value={a.status} />
            </td>
            <td className="td">{a.issues.length}</td>
            <td className="td text-right">
              <form action={deleteAudit}>
                <input type="hidden" name="id" value={a.id} />
                <button className="text-faint hover:text-danger" aria-label="Delete">
                  <Trash2 size={15} />
                </button>
              </form>
            </td>
          </tr>
        ))}
        {audits.length === 0 && (
          <tr>
            <td className="td text-faint" colSpan={7}>
              No audits yet — schedule one above.
            </td>
          </tr>
        )}
      </Table>
    </div>
  );
}
