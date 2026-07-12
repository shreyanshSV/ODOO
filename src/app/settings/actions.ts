"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { CategoryType } from "@prisma/client";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const num = (fd: FormData, k: string) => Number(fd.get(k) ?? 0);
const bool = (fd: FormData, k: string) => fd.get(k) === "on";

/* ---------- Departments ---------- */

export async function createDepartment(fd: FormData) {
  const name = str(fd, "name");
  const code = str(fd, "code");
  if (!name || !code) return;
  const parentId = str(fd, "parentId");
  await prisma.department.create({
    data: {
      name,
      code,
      employeeCount: num(fd, "employeeCount"),
      parentId: parentId || null,
    },
  });
  revalidatePath("/settings/departments");
}

export async function deleteDepartment(fd: FormData) {
  const id = str(fd, "id");
  if (id) await prisma.department.delete({ where: { id } });
  revalidatePath("/settings/departments");
}

/* ---------- Categories ---------- */

export async function createCategory(fd: FormData) {
  const name = str(fd, "name");
  if (!name) return;
  await prisma.category.create({
    data: {
      name,
      type: (str(fd, "type") || "CSR_ACTIVITY") as CategoryType,
    },
  });
  revalidatePath("/settings/categories");
}

export async function deleteCategory(fd: FormData) {
  const id = str(fd, "id");
  if (id) await prisma.category.delete({ where: { id } });
  revalidatePath("/settings/categories");
}

/* ---------- ESG Configuration (singleton "default") ---------- */

export async function saveConfig(fd: FormData) {
  const data = {
    envWeight: num(fd, "envWeight"),
    socialWeight: num(fd, "socialWeight"),
    govWeight: num(fd, "govWeight"),
    autoEmissionCalc: bool(fd, "autoEmissionCalc"),
    evidenceRequired: bool(fd, "evidenceRequired"),
    badgeAutoAward: bool(fd, "badgeAutoAward"),
    emailAlerts: bool(fd, "emailAlerts"),
  };
  await prisma.esgConfig.upsert({
    where: { id: "default" },
    update: data,
    create: { id: "default", ...data },
  });
  revalidatePath("/settings/esg");
  revalidatePath("/");
}

/* ---------- Notifications ---------- */

export async function markAllRead() {
  await prisma.notification.updateMany({ where: { read: false }, data: { read: true } });
  revalidatePath("/settings/notifications");
}
