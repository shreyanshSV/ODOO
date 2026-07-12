"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { persistEsgSnapshot } from "@/lib/esg";
import type { EmissionSource } from "@prisma/client";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const num = (fd: FormData, k: string) => Number(fd.get(k) ?? 0);

/* ---------- Emission Factors ---------- */

export async function createEmissionFactor(fd: FormData) {
  const name = str(fd, "name");
  if (!name) return;
  await prisma.emissionFactor.create({
    data: {
      name,
      unit: str(fd, "unit") || "unit",
      co2PerUnit: num(fd, "co2PerUnit"),
      appliesTo: (str(fd, "appliesTo") || "PURCHASE") as EmissionSource,
    },
  });
  revalidatePath("/environmental/emission-factors");
}

export async function deleteEmissionFactor(fd: FormData) {
  const id = str(fd, "id");
  if (id) await prisma.emissionFactor.delete({ where: { id } });
  revalidatePath("/environmental/emission-factors");
}

/* ---------- Environmental Goals ---------- */

export async function createGoal(fd: FormData) {
  const name = str(fd, "name");
  if (!name) return;
  const departmentId = str(fd, "departmentId");
  await prisma.environmentalGoal.create({
    data: {
      name,
      departmentId: departmentId || null,
      targetCo2: num(fd, "targetCo2"),
      currentCo2: num(fd, "currentCo2"),
      deadline: new Date(str(fd, "deadline") || Date.now()),
    },
  });
  revalidatePath("/environmental/goals");
  revalidatePath("/");
}

export async function deleteGoal(fd: FormData) {
  const id = str(fd, "id");
  if (id) await prisma.environmentalGoal.delete({ where: { id } });
  revalidatePath("/environmental/goals");
  revalidatePath("/");
}

/* ---------- Carbon Transactions (with auto CO2 calc) ---------- */

export async function createCarbonTransaction(fd: FormData) {
  const departmentId = str(fd, "departmentId");
  const emissionFactorId = str(fd, "emissionFactorId");
  const quantity = num(fd, "quantity");

  let co2Kg = 0;
  if (emissionFactorId) {
    const factor = await prisma.emissionFactor.findUnique({ where: { id: emissionFactorId } });
    if (factor) co2Kg = quantity * factor.co2PerUnit;
  }

  await prisma.carbonTransaction.create({
    data: {
      source: (str(fd, "source") || "PURCHASE") as EmissionSource,
      reference: str(fd, "reference") || null,
      departmentId: departmentId || null,
      emissionFactorId: emissionFactorId || null,
      quantity,
      co2Kg,
      auto: true,
      date: new Date(),
    },
  });
  revalidatePath("/environmental/carbon-transactions");
  revalidatePath("/");
}

export async function deleteCarbonTransaction(fd: FormData) {
  const id = str(fd, "id");
  if (id) await prisma.carbonTransaction.delete({ where: { id } });
  revalidatePath("/environmental/carbon-transactions");
  revalidatePath("/");
}

/* ---------- Recompute & persist ESG scores ---------- */

export async function recomputeScores() {
  await persistEsgSnapshot();
  revalidatePath("/");
}
