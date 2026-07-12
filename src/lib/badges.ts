import { prisma } from "./prisma";
import { notify } from "./notify";

/**
 * Auto-award any badges whose Unlock Rule the employee now satisfies
 * (XP, approved-challenge count, or approved-CSR count). Gated by the
 * badgeAutoAward setting. Idempotent — already-held badges are skipped.
 */
export async function awardBadges(employeeId: string) {
  const cfg = await prisma.esgConfig.findUnique({ where: { id: "default" } });
  if (cfg && !cfg.badgeAutoAward) return;

  const emp = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: { badges: { select: { badgeId: true } } },
  });
  if (!emp) return;

  const [completedChallenges, csrCount, badges] = await Promise.all([
    prisma.challengeParticipation.count({ where: { employeeId, approvalStatus: "APPROVED" } }),
    prisma.employeeParticipation.count({ where: { employeeId, approvalStatus: "APPROVED" } }),
    prisma.badge.findMany(),
  ]);

  const held = new Set(emp.badges.map((b) => b.badgeId));

  for (const b of badges) {
    if (held.has(b.id)) continue;
    const value =
      b.unlockMetric === "XP"
        ? emp.xp
        : b.unlockMetric === "COMPLETED_CHALLENGES"
          ? completedChallenges
          : csrCount;
    if (value >= b.unlockThreshold) {
      await prisma.employeeBadge.create({ data: { employeeId, badgeId: b.id } });
      await notify({
        type: "BADGE_UNLOCK",
        title: "Badge unlocked",
        message: `${emp.name} unlocked '${b.name}'`,
        employeeId,
      });
    }
  }
}
