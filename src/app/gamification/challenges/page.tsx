import { Trash2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { GAME_TABS, DIFFICULTIES, CHALLENGE_STATUSES } from "@/lib/nav";
import { Card, ModuleTabs, PageHeader, Pill, Table } from "@/components/ui";
import { SubNav } from "@/components/SubNav";
import { titleCase, fmtDate } from "@/lib/format";
import { createChallenge, advanceChallenge, deleteChallenge } from "../actions";

export const dynamic = "force-dynamic";

export default async function ChallengesPage() {
  const [challenges, categories] = await Promise.all([
    prisma.challenge.findMany({
      include: { participations: true, category: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.category.findMany({ where: { type: "CHALLENGE" }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="p-6 animate-fade-in">
      <PageHeader
        title="Gamification: Challenges"
        subtitle="Create sustainability challenges and advance them through their lifecycle"
        accent="text-game"
      />
      <ModuleTabs active="Gamification" />
      <SubNav items={GAME_TABS} />

      <Card title="New Challenge" className="mb-4">
        <form action={createChallenge} className="grid grid-cols-1 gap-3 sm:grid-cols-6">
          <div className="sm:col-span-2">
            <label className="label">Title</label>
            <input name="title" required className="input" placeholder="Cycle to Work Week" />
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
            <label className="label">XP</label>
            <input name="xp" type="number" className="input" placeholder="50" />
          </div>
          <div>
            <label className="label">Difficulty</label>
            <select name="difficulty" className="input">
              {DIFFICULTIES.map((d) => (
                <option key={d} value={d}>
                  {titleCase(d)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Deadline</label>
            <input name="deadline" type="date" className="input" />
          </div>
          <div className="sm:col-span-5">
            <label className="label">Description</label>
            <input name="description" className="input" placeholder="Optional details" />
          </div>
          <div className="flex items-end gap-2">
            <label className="label flex items-center gap-2">
              <input name="evidenceRequired" type="checkbox" /> Evidence
            </label>
          </div>
          <div className="sm:col-span-6">
            <button className="btn-primary">Add Challenge</button>
          </div>
        </form>
      </Card>

      <Table head={["Title", "Category", "XP", "Difficulty", "Deadline", "Status", "Advance", ""]}>
        {challenges.map((c) => (
          <tr key={c.id}>
            <td className="td text-ink">{c.title}</td>
            <td className="td">{c.category?.name ?? "—"}</td>
            <td className="td">{c.xp}</td>
            <td className="td">{titleCase(c.difficulty)}</td>
            <td className="td">{c.deadline ? fmtDate(c.deadline) : "—"}</td>
            <td className="td">
              <Pill value={c.status} />
            </td>
            <td className="td">
              <form action={advanceChallenge} className="flex items-center gap-2">
                <input type="hidden" name="id" value={c.id} />
                <select name="status" defaultValue={c.status} className="input h-8 py-0 text-xs">
                  {CHALLENGE_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {titleCase(s)}
                    </option>
                  ))}
                </select>
                <button className="btn-ghost text-xs">Set</button>
              </form>
            </td>
            <td className="td text-right">
              <form action={deleteChallenge}>
                <input type="hidden" name="id" value={c.id} />
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
        {challenges.length === 0 && (
          <tr>
            <td className="td text-faint" colSpan={8}>
              No challenges yet — add one above.
            </td>
          </tr>
        )}
      </Table>
    </div>
  );
}
