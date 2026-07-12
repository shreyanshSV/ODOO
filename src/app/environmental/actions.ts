"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { persistEsgSnapshot } from "@/lib/esg";
import type { EmissionSource, GoalStatus } from "@prisma/client";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const num = (fd: FormData, k: string) => Number(fd.get(k) ?? 0);

/* ---------- Helper: add CO₂ to matching department goals ---------- */

/**
 * After a carbon transaction is created, increment `currentCo2` on all
 * active goals for the same department (or all goals if no department).
 * co2Kg is in kilograms; goals store tonnes, so we divide by 1000.
 */
async function addEmissionToGoals(departmentId: string | null, co2Kg: number) {
  if (co2Kg <= 0) return;
  const co2Tonnes = co2Kg / 1000;

  // Find active goals for this department (or all goals if no dept)
  const goals = await prisma.environmentalGoal.findMany({
    where: {
      status: "ACTIVE" as GoalStatus,
      ...(departmentId ? { departmentId } : {}),
    },
  });
  if (goals.length === 0) return;

  await Promise.all(
    goals.map((g) =>
      prisma.environmentalGoal.update({
        where: { id: g.id },
        data: { currentCo2: { increment: co2Tonnes } },
      })
    )
  );
}

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
      currentCo2: 0, // always starts at zero — emissions are added via transactions
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

/* ---------- Carbon Transactions (with auto CO2 calc + goal update) ---------- */

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

  // Auto-update matching environmental goals
  await addEmissionToGoals(departmentId || null, co2Kg);

  revalidatePath("/environmental/carbon-transactions");
  revalidatePath("/environmental/goals");
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

/* ---------- Log a simulated voyage's emissions as a Carbon Transaction ---------- */

export async function logVoyageEmission(fd: FormData) {
  const co2Kg = num(fd, "co2Kg");
  const fuelT = num(fd, "fuelT");
  const reference = str(fd, "reference") || "Simulated voyage";
  const departmentId = str(fd, "departmentId");
  if (co2Kg <= 0) return;
  await prisma.carbonTransaction.create({
    data: {
      source: "FLEET",
      reference,
      departmentId: departmentId || null,
      quantity: fuelT,
      co2Kg,
      auto: false,
      date: new Date(),
    },
  });

  // Auto-update matching environmental goals
  await addEmissionToGoals(departmentId || null, co2Kg);

  revalidatePath("/environmental/carbon-transactions");
  revalidatePath("/environmental/goals");
  revalidatePath("/");
}
