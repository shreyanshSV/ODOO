import { prisma } from "@/lib/prisma";
import { levelFromXp, type LevelInfo } from "./xp";
import { computeShi, shiBand, type Shi } from "./shi";

export type TimelineItem = { at: Date; icon: string; text: string };

export type EmployeeDashboard = {
  profile: { name: string; email: string; department: string; designation: string; role: string };
  xp: number;
  points: number;
  level: LevelInfo;
  shi: Shi;
  shiBand: string;
  stats: { approvedCsr: number; pendingCsr: number; completedChallenges: number; badgeCount: number };
  badges: { name: string; icon: string; at: Date }[];
  rank: number;
  totalPeers: number;
  timeline: TimelineItem[];
  recommendations: {
    challenges: { id: string; title: string; xp: number; deadline: Date | null }[];
    csr: { id: string; name: string; points: number }[];
  };
};

/** Assemble the signed-in employee's hub, or null if the user has no linked employee. */
export async function getEmployeeDashboard(userId: string): Promise<EmployeeDashboard | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      employee: {
        include: {
          department: true,
          badges: { include: { badge: true }, orderBy: { awardedAt: "desc" } },
          participations: { include: { csrActivity: true }, orderBy: { createdAt: "desc" } },
          challengeParticipation: { include: { challenge: true }, orderBy: { createdAt: "desc" } },
        },
      },
    },
  });

  const emp = user?.employee;
  if (!emp) return null;

  const approvedCsr = emp.participations.filter((p) => p.approvalStatus === "APPROVED").length;
  const pendingCsr = emp.participations.filter((p) => p.approvalStatus === "PENDING").length;
  const completedChallenges = emp.challengeParticipation.filter((c) => c.approvalStatus === "APPROVED").length;
  const badgeCount = emp.badges.length;

  const level = levelFromXp(emp.xp);
  const shi = computeShi({
    csr: approvedCsr / 5,
    challenges: completedChallenges / 3,
    xp: emp.xp / 3000,
    badges: badgeCount / 5,
  });

  // leaderboard rank within the same company (by XP)
  const peers = await prisma.employee.findMany({
    where: emp.companyId ? { companyId: emp.companyId } : {},
    select: { id: true, xp: true },
    orderBy: { xp: "desc" },
  });
  const rank = peers.findIndex((e) => e.id === emp.id) + 1;

  // activity timeline (merge CSR + challenges + badges, newest first)
  const timeline: TimelineItem[] = [];
  for (const p of emp.participations.slice(0, 8)) {
    timeline.push({
      at: p.createdAt,
      icon: p.approvalStatus === "APPROVED" ? "✅" : p.approvalStatus === "REJECTED" ? "❌" : "🕐",
      text: `CSR — ${p.csrActivity.name} (${p.approvalStatus.toLowerCase()})`,
    });
  }
  for (const c of emp.challengeParticipation.slice(0, 6)) {
    timeline.push({ at: c.createdAt, icon: "🎯", text: `Challenge — ${c.challenge.title} (${c.progress}%)` });
  }
  for (const b of emp.badges.slice(0, 6)) {
    timeline.push({ at: b.awardedAt, icon: b.badge.icon, text: `Badge unlocked — ${b.badge.name}` });
  }
  timeline.sort((a, b) => b.at.getTime() - a.at.getTime());

  // recommendations: active challenges/CSR the employee hasn't joined yet
  const joinedChallengeIds = emp.challengeParticipation.map((c) => c.challengeId);
  const participatedCsrIds = emp.participations.map((p) => p.csrActivityId);
  const [openChallenges, openCsr] = await Promise.all([
    prisma.challenge.findMany({ where: { status: "ACTIVE", id: { notIn: joinedChallengeIds } }, take: 3, orderBy: { deadline: "asc" } }),
    prisma.cSRActivity.findMany({ where: { status: "ACTIVE", id: { notIn: participatedCsrIds } }, take: 3, orderBy: { date: "desc" } }),
  ]);

  return {
    profile: {
      name: emp.name,
      email: emp.email,
      department: emp.department?.name ?? "—",
      designation: emp.role ?? "Team Member",
      role: user?.role ?? "EMPLOYEE",
    },
    xp: emp.xp,
    points: emp.points,
    level,
    shi,
    shiBand: shiBand(shi.score),
    stats: { approvedCsr, pendingCsr, completedChallenges, badgeCount },
    badges: emp.badges.map((b) => ({ name: b.badge.name, icon: b.badge.icon, at: b.awardedAt })),
    rank,
    totalPeers: peers.length,
    timeline: timeline.slice(0, 12),
    recommendations: {
      challenges: openChallenges.map((c) => ({ id: c.id, title: c.title, xp: c.xp, deadline: c.deadline })),
      csr: openCsr.map((c) => ({ id: c.id, name: c.name, points: c.points })),
    },
  };
}
