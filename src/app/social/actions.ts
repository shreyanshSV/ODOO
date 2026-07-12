"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";
import { awardBadges } from "@/lib/badges";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
// Clamped, whole-number field — never overflows Postgres INT4 (max ~2.1B).
const INT_MAX = 2_147_483_647;
const intField = (fd: FormData, k: string, max = INT_MAX) =>
  Math.max(0, Math.min(Math.round(Number(fd.get(k) ?? 0) || 0), max));

/* ---------- CSR Activities ---------- */

export async function createCsr(fd: FormData) {
  const name = str(fd, "name");
  if (!name) return;
  const categoryId = str(fd, "categoryId");
  const departmentId = str(fd, "departmentId");
  await prisma.cSRActivity.create({
    data: {
      name,
      categoryId: categoryId || null,
      departmentId: departmentId || null,
      description: str(fd, "description") || null,
      points: intField(fd, "points", 100_000),
    },
  });
  revalidatePath("/social/csr");
  revalidatePath("/");
}

export async function deleteCsr(fd: FormData) {
  const id = str(fd, "id");
  if (id) await prisma.cSRActivity.delete({ where: { id } });
  revalidatePath("/social/csr");
  revalidatePath("/");
}

/* ---------- Employee Participation ---------- */

export async function addParticipation(fd: FormData) {
  const employeeId = str(fd, "employeeId");
  const csrActivityId = str(fd, "csrActivityId");
  if (!employeeId || !csrActivityId) return;
  const proof = str(fd, "proof");
  await prisma.employeeParticipation.create({
    data: {
      employeeId,
      csrActivityId,
      proof: proof || null,
      approvalStatus: "PENDING",
    },
  });
  revalidatePath("/social/participation");
}

export async function approveParticipation(fd: FormData) {
  const id = str(fd, "id");
  if (!id) return;
  const participation = await prisma.employeeParticipation.findUnique({
    where: { id },
    include: { csrActivity: true, employee: true },
  });
  if (!participation) return;

  const config = await prisma.esgConfig.findUnique({ where: { id: "default" } });
  if (config?.evidenceRequired && !participation.proof) return; // cannot approve without proof

  const activity = participation.csrActivity;
  const employee = participation.employee;

  await prisma.employeeParticipation.update({
    where: { id },
    data: {
      approvalStatus: "APPROVED",
      pointsEarned: activity.points,
      completionDate: new Date(),
    },
  });
  await prisma.employee.update({
    where: { id: employee.id },
    data: { points: { increment: activity.points }, xp: { increment: activity.points } },
  });
  await notify({
    type: "APPROVAL_DECISION",
    title: "CSR approved",
    message: `${employee.name} approved for ${activity.name}`,
    employeeId: employee.id,
  });
  await awardBadges(employee.id);

  revalidatePath("/social/participation");
  revalidatePath("/");
}

export async function rejectParticipation(fd: FormData) {
  const id = str(fd, "id");
  if (!id) return;
  const participation = await prisma.employeeParticipation.findUnique({
    where: { id },
    include: { csrActivity: true, employee: true },
  });
  if (!participation) return;

  await prisma.employeeParticipation.update({
    where: { id },
    data: { approvalStatus: "REJECTED" },
  });
  await notify({
    type: "APPROVAL_DECISION",
    title: "CSR rejected",
    message: `${participation.employee.name} rejected for ${participation.csrActivity.name}`,
    employeeId: participation.employee.id,
  });

  revalidatePath("/social/participation");
}
