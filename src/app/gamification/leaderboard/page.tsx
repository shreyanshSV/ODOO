import { prisma } from "@/lib/prisma";
import { GAME_TABS } from "@/lib/nav";
import { ModuleTabs, PageHeader, Table } from "@/components/ui";
import { SubNav } from "@/components/SubNav";
import { fmtNum } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const employees = await prisma.employee.findMany({
    include: { department: true, badges: true },
    orderBy: { xp: "desc" },
  });

  return (
    <div className="p-6">
      <PageHeader
        title="Gamification: Leaderboard"
        subtitle="Employees ranked by lifetime XP"
        accent="text-game"
      />
      <ModuleTabs active="Gamification" />
      <SubNav items={GAME_TABS} />

      <Table head={["#", "Employee", "Department", "XP", "Points", "Badges"]}>
        {employees.map((e, i) => (
          <tr key={e.id}>
            <td className={`td ${i === 0 ? "text-game font-semibold" : ""}`}>{i + 1}</td>
            <td className={`td ${i === 0 ? "text-game font-semibold" : "text-ink"}`}>{e.name}</td>
            <td className="td">{e.department?.name ?? "—"}</td>
            <td className="td">{fmtNum(e.xp)}</td>
            <td className="td">{fmtNum(e.points)}</td>
            <td className="td">{e.badges.length}</td>
          </tr>
        ))}
        {employees.length === 0 && (
          <tr>
            <td className="td text-faint" colSpan={6}>
              No employees yet.
            </td>
          </tr>
        )}
      </Table>
    </div>
  );
}
