import { Trash2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { GAME_TABS } from "@/lib/nav";
import { Card, ModuleTabs, PageHeader, Pill, Table } from "@/components/ui";
import { SubNav } from "@/components/SubNav";
import { fmtNum } from "@/lib/format";
import { createReward, deleteReward, redeemReward } from "../actions";

export const dynamic = "force-dynamic";

const REWARD_STATUSES = ["ACTIVE", "INACTIVE"] as const;

export default async function RewardsPage() {
  const [rewards, employees] = await Promise.all([
    prisma.reward.findMany({ include: { redemptions: true }, orderBy: { name: "asc" } }),
    prisma.employee.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="p-6">
      <PageHeader
        title="Gamification: Rewards"
        subtitle="Catalog of rewards employees can redeem with their points"
        accent="text-game"
      />
      <ModuleTabs active="Gamification" />
      <SubNav items={GAME_TABS} />

      <Card title="New Reward" className="mb-4">
        <form action={createReward} className="grid grid-cols-1 gap-3 sm:grid-cols-6">
          <div className="sm:col-span-2">
            <label className="label">Name</label>
            <input name="name" required className="input" placeholder="Extra Day Off" />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Description</label>
            <input name="description" className="input" placeholder="Optional details" />
          </div>
          <div>
            <label className="label">Points Required</label>
            <input name="pointsRequired" type="number" className="input" placeholder="500" />
          </div>
          <div>
            <label className="label">Stock</label>
            <input name="stock" type="number" className="input" placeholder="10" />
          </div>
          <div>
            <label className="label">Status</label>
            <select name="status" className="input">
              {REWARD_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s === "ACTIVE" ? "Active" : "Inactive"}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-6">
            <button className="btn-primary">Add Reward</button>
          </div>
        </form>
      </Card>

      <Card title="Redeem Reward" className="mb-4">
        <form action={redeemReward} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="label">Employee</label>
            <select name="employeeId" required className="input">
              <option value="">Select employee</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} ({fmtNum(e.points)} pts)
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Reward</label>
            <select name="rewardId" required className="input">
              <option value="">Select reward</option>
              {rewards.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({fmtNum(r.pointsRequired)} pts)
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button className="btn-primary">Redeem</button>
          </div>
        </form>
      </Card>

      <Table head={["Name", "Points Required", "Stock", "Redemptions", "Status", ""]}>
        {rewards.map((r) => (
          <tr key={r.id}>
            <td className="td text-ink">{r.name}</td>
            <td className="td">{fmtNum(r.pointsRequired)}</td>
            <td className="td">{r.stock}</td>
            <td className="td">{r.redemptions.length}</td>
            <td className="td">
              <Pill value={r.status} />
            </td>
            <td className="td text-right">
              <form action={deleteReward}>
                <input type="hidden" name="id" value={r.id} />
                <button className="text-faint hover:text-danger" aria-label="Delete">
                  <Trash2 size={15} />
                </button>
              </form>
            </td>
          </tr>
        ))}
        {rewards.length === 0 && (
          <tr>
            <td className="td text-faint" colSpan={6}>
              No rewards yet — add one above.
            </td>
          </tr>
        )}
      </Table>
    </div>
  );
}
