"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";
import type { Difficulty, ChallengeStatus, BadgeMetric, ActiveStatus } from "@prisma/client";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const num = (fd: FormData, k: string) => Number(fd.get(k) ?? 0);

/* ---------- Challenges ---------- */

export async function createChallenge(fd: FormData) {
  const title = str(fd, "title");
  if (!title) return;
  const categoryId = str(fd, "categoryId");
  const deadline = str(fd, "deadline");
  await prisma.challenge.create({
    data: {
      title,
      categoryId: categoryId || null,
      description: str(fd, "description") || null,
      xp: num(fd, "xp"),
      difficulty: (str(fd, "difficulty") || "EASY") as Difficulty,
      evidenceRequired: fd.get("evidenceRequired") === "on",
      deadline: deadline ? new Date(deadline) : null,
    },
  });
  revalidatePath("/gamification/challenges");
}

export async function advanceChallenge(fd: FormData) {
  const id = str(fd, "id");
  const status = str(fd, "status");
  if (id && status) {
    await prisma.challenge.update({
      where: { id },
      data: { status: status as ChallengeStatus },
    });
  }
  revalidatePath("/gamification/challenges");
}

export async function deleteChallenge(fd: FormData) {
  const id = str(fd, "id");
  if (id) await prisma.challenge.delete({ where: { id } });
  revalidatePath("/gamification/challenges");
}

/* ---------- Badges ---------- */

export async function createBadge(fd: FormData) {
  const name = str(fd, "name");
  if (!name) return;
  await prisma.badge.create({
    data: {
      name,
      description: str(fd, "description") || null,
      icon: str(fd, "icon") || "🌱",
      unlockMetric: (str(fd, "unlockMetric") || "XP") as BadgeMetric,
      unlockThreshold: num(fd, "unlockThreshold"),
    },
  });
  revalidatePath("/gamification/badges");
}

export async function deleteBadge(fd: FormData) {
  const id = str(fd, "id");
  if (id) await prisma.badge.delete({ where: { id } });
  revalidatePath("/gamification/badges");
}

/* ---------- Rewards ---------- */

export async function createReward(fd: FormData) {
  const name = str(fd, "name");
  if (!name) return;
  await prisma.reward.create({
    data: {
      name,
      description: str(fd, "description") || null,
      pointsRequired: num(fd, "pointsRequired"),
      stock: num(fd, "stock"),
      status: (str(fd, "status") || "ACTIVE") as ActiveStatus,
    },
  });
  revalidatePath("/gamification/rewards");
}

export async function deleteReward(fd: FormData) {
  const id = str(fd, "id");
  if (id) await prisma.reward.delete({ where: { id } });
  revalidatePath("/gamification/rewards");
}

export async function redeemReward(fd: FormData) {
  const employeeId = str(fd, "employeeId");
  const rewardId = str(fd, "rewardId");
  if (!employeeId || !rewardId) return;

  const [reward, employee] = await Promise.all([
    prisma.reward.findUnique({ where: { id: rewardId } }),
    prisma.employee.findUnique({ where: { id: employeeId } }),
  ]);
  if (!reward || !employee) return;
  if (reward.stock <= 0 || employee.points < reward.pointsRequired) return;

  await prisma.$transaction([
    prisma.reward.update({ where: { id: rewardId }, data: { stock: { decrement: 1 } } }),
    prisma.employee.update({
      where: { id: employeeId },
      data: { points: { decrement: reward.pointsRequired } },
    }),
    prisma.rewardRedemption.create({
      data: { employeeId, rewardId, pointsSpent: reward.pointsRequired },
    }),
  ]);

  await notify({
    type: "GENERIC",
    title: "Reward redeemed",
    message: employee.name + " redeemed " + reward.name,
    employeeId,
  });

  revalidatePath("/gamification/rewards");
  revalidatePath("/gamification/leaderboard");
  revalidatePath("/");
}
