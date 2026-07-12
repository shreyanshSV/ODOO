import { prisma } from "@/lib/prisma";
import { SOCIAL_TABS } from "@/lib/nav";
import { Card, ModuleTabs, PageHeader, Pill, Table } from "@/components/ui";
import { SubNav } from "@/components/SubNav";
import { fmtNum } from "@/lib/format";
import { addParticipation, approveParticipation, rejectParticipation } from "../actions";

export const dynamic = "force-dynamic";

export default async function ParticipationPage() {
  const [participations, employees, activities] = await Promise.all([
    prisma.employeeParticipation.findMany({
      include: { employee: true, csrActivity: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.employee.findMany({ orderBy: { name: "asc" } }),
    prisma.cSRActivity.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" } }),
  ]);

  const pending = participations.filter((p) => p.approvalStatus === "PENDING").length;

  return (
    <div className="p-6">
      <PageHeader
        title="Social: Approval Queue"
        subtitle={`${fmtNum(pending)} pending · ${fmtNum(participations.length)} total submissions`}
        accent="text-social"
      />
      <ModuleTabs active="Social" />
      <SubNav items={SOCIAL_TABS} />

      <Card title="Add Participation" className="mb-4">
        <form action={addParticipation} className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div>
            <label className="label">Employee</label>
            <select name="employeeId" required className="input">
              <option value="">Select employee</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Activity</label>
            <select name="csrActivityId" required className="input">
              <option value="">Select activity</option>
              {activities.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.points} pts)
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="label">Proof</label>
            <input name="proof" className="input" placeholder="Link or note (evidence)" />
          </div>
          <div className="sm:col-span-4">
            <button className="btn-primary">Add Participation</button>
          </div>
        </form>
      </Card>

      <Table head={["Employee", "Activity", "Proof", "Points", "Status", ""]}>
        {participations.map((p) => (
          <tr key={p.id}>
            <td className="td text-ink">{p.employee.name}</td>
            <td className="td">{p.csrActivity.name}</td>
            <td className="td">{p.proof ?? "—"}</td>
            <td className="td">{fmtNum(p.pointsEarned)}</td>
            <td className="td">
              <Pill value={p.approvalStatus} />
            </td>
            <td className="td text-right">
              {p.approvalStatus === "PENDING" && (
                <div className="flex justify-end gap-2">
                  <form action={approveParticipation}>
                    <input type="hidden" name="id" value={p.id} />
                    <button className="btn-primary">Approve</button>
                  </form>
                  <form action={rejectParticipation}>
                    <input type="hidden" name="id" value={p.id} />
                    <button className="btn-danger">Reject</button>
                  </form>
                </div>
              )}
            </td>
          </tr>
        ))}
        {participations.length === 0 && (
          <tr>
            <td className="td text-faint" colSpan={6}>
              No participations yet — add one above.
            </td>
          </tr>
        )}
      </Table>
    </div>
  );
}
