import { Trash2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { GAME_TABS, BADGE_METRICS } from "@/lib/nav";
import { Card, ModuleTabs, PageHeader, Table } from "@/components/ui";
import { SubNav } from "@/components/SubNav";
import { titleCase } from "@/lib/format";
import { createBadge, deleteBadge } from "../actions";

export const dynamic = "force-dynamic";

export default async function BadgesPage() {
  const badges = await prisma.badge.findMany({ include: { awarded: true }, orderBy: { name: "asc" } });

  return (
    <div className="p-6 animate-fade-in">
      <PageHeader
        title="Gamification: Badges"
        subtitle="Achievements auto-awarded when an employee meets the unlock rule"
        accent="text-game"
      />
      <ModuleTabs active="Gamification" />
      <SubNav items={GAME_TABS} />

      <Card title="New Badge" className="mb-4">
        <form action={createBadge} className="grid grid-cols-1 gap-3 sm:grid-cols-6">
          <div className="sm:col-span-2">
            <label className="label">Name</label>
            <input name="name" required className="input" placeholder="Carbon Cutter" />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Description</label>
            <input name="description" className="input" placeholder="Optional details" />
          </div>
          <div>
            <label className="label">Icon</label>
            <input name="icon" className="input" defaultValue="🌱" />
          </div>
          <div>
            <label className="label">Unlock Metric</label>
            <select name="unlockMetric" className="input">
              {BADGE_METRICS.map((m) => (
                <option key={m} value={m}>
                  {titleCase(m)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Threshold</label>
            <input name="unlockThreshold" type="number" className="input" placeholder="100" />
          </div>
          <div className="sm:col-span-6">
            <button className="btn-primary">Add Badge</button>
          </div>
        </form>
      </Card>

      <Table head={["Icon", "Name", "Description", "Unlock Rule", "Awarded", ""]}>
        {badges.map((b) => (
          <tr key={b.id}>
            <td className="td text-lg">{b.icon}</td>
            <td className="td text-ink">{b.name}</td>
            <td className="td">{b.description ?? "—"}</td>
            <td className="td">{`${titleCase(b.unlockMetric)} >= ${b.unlockThreshold}`}</td>
            <td className="td">{b.awarded.length}</td>
            <td className="td text-right">
              <form action={deleteBadge}>
                <input type="hidden" name="id" value={b.id} />
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
        {badges.length === 0 && (
          <tr>
            <td className="td text-faint" colSpan={6}>
              No badges yet — add one above.
            </td>
          </tr>
        )}
      </Table>
    </div>
  );
}
