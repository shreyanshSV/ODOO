"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";
import type { AuditStatus, Severity } from "@prisma/client";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

/* ---------- Policies ---------- */

export async function createPolicy(fd: FormData) {
  const name = str(fd, "name");
  if (!name) return;
  await prisma.eSGPolicy.create({
    data: {
      name,
      area: str(fd, "area") || null,
      description: str(fd, "description") || null,
    },
  });
  revalidatePath("/governance/policies");
}

export async function deletePolicy(fd: FormData) {
  const id = str(fd, "id");
  if (id) await prisma.eSGPolicy.delete({ where: { id } });
  revalidatePath("/governance/policies");
}

export async function acknowledgePolicy(fd: FormData) {
  const policyId = str(fd, "policyId");
  const employeeId = str(fd, "employeeId");
  if (!policyId || !employeeId) return;
  try {
    await prisma.policyAcknowledgement.create({ data: { policyId, employeeId } });
    await notify({
      type: "GENERIC",
      title: "Policy acknowledged",
      message: "A policy was acknowledged.",
      employeeId,
    });
  } catch {
    /* ponytail: swallow unique-violation (already acknowledged) */
  }
  revalidatePath("/governance/policies");
}

/* ---------- Audits ---------- */

export async function createAudit(fd: FormData) {
  const title = str(fd, "title");
  if (!title) return;
  await prisma.audit.create({
    data: {
      title,
      departmentId: str(fd, "departmentId") || null,
      auditor: str(fd, "auditor") || null,
      findings: str(fd, "findings") || null,
      status: (str(fd, "status") || "SCHEDULED") as AuditStatus,
    },
  });
  revalidatePath("/governance/audits");
}

export async function deleteAudit(fd: FormData) {
  const id = str(fd, "id");
  if (id) await prisma.audit.delete({ where: { id } });
  revalidatePath("/governance/audits");
}

/* ---------- Compliance Issues ---------- */

export async function createIssue(fd: FormData) {
  const description = str(fd, "description");
  const ownerId = str(fd, "ownerId");
  if (!description || !ownerId) return;
  const dueDate = new Date(str(fd, "dueDate") || Date.now());
  const flagged = dueDate < new Date(); // default status OPEN
  await prisma.complianceIssue.create({
    data: {
      description,
      severity: (str(fd, "severity") || "LOW") as Severity,
      departmentId: str(fd, "departmentId") || null,
      auditId: str(fd, "auditId") || null,
      ownerId,
      dueDate,
      flagged,
    },
  });
  await notify({
    type: "COMPLIANCE_ISSUE",
    title: "Compliance issue raised",
    message: description,
    employeeId: ownerId,
  });
  revalidatePath("/governance/compliance");
}

export async function resolveIssue(fd: FormData) {
  const id = str(fd, "id");
  if (id) await prisma.complianceIssue.update({ where: { id }, data: { status: "RESOLVED", flagged: false } });
  revalidatePath("/governance/compliance");
}

export async function deleteIssue(fd: FormData) {
  const id = str(fd, "id");
  if (id) await prisma.complianceIssue.delete({ where: { id } });
  revalidatePath("/governance/compliance");
}
