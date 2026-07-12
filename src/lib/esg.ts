import { prisma } from "./prisma";

export const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
export const round = (n: number) => Math.round(n);

// A goal's progress toward its target, e.g. current 390t of a 500t target = 78%.
export const goalProgress = (targetCo2: number, currentCo2: number) =>
  targetCo2 <= 0 ? 0 : clamp((currentCo2 / targetCo2) * 100);

export type DeptScore = {
  id: string;
  name: string;
  code: string;
  employeeCount: number;
  env: number;
  social: number;
  gov: number;
  total: number;
};

export type EsgSnapshot = {
  weights: { env: number; social: number; gov: number };
  departments: DeptScore[];
  org: { env: number; social: number; gov: number; overall: number };
};

/**
 * ESG scoring engine.
 *
 * Environmental — average progress of a department's sustainability goals.
 * Social        — share of approved CSR participations by the department's staff.
 * Governance    — policy-acknowledgement rate minus a penalty for open compliance issues.
 * Total         — weighted blend (default 40/30/30, configurable in Settings).
 * Overall ESG   — headcount-weighted average of department totals.
 */
export async function getEsgSnapshot(): Promise<EsgSnapshot> {
  const [config, departments, goals, employees, participations, issues, policyCount, acks] =
    await Promise.all([
      prisma.esgConfig.findUnique({ where: { id: "default" } }),
      prisma.department.findMany({ orderBy: { name: "asc" } }),
      prisma.environmentalGoal.findMany(),
      prisma.employee.findMany({ select: { id: true, departmentId: true } }),
      prisma.employeeParticipation.findMany({
        select: { approvalStatus: true, employee: { select: { departmentId: true } } },
      }),
      prisma.complianceIssue.findMany({ select: { departmentId: true, status: true } }),
      prisma.eSGPolicy.count({ where: { status: "ACTIVE" } }),
      prisma.policyAcknowledgement.findMany({
        select: { employee: { select: { departmentId: true } } },
      }),
    ]);

  const wEnvRaw = config?.envWeight ?? 0.4;
  const wSocRaw = config?.socialWeight ?? 0.3;
  const wGovRaw = config?.govWeight ?? 0.3;
  const wSum = wEnvRaw + wSocRaw + wGovRaw || 1;
  const weights = { env: wEnvRaw / wSum, social: wSocRaw / wSum, gov: wGovRaw / wSum };

  const empByDept = new Map<string, number>();
  for (const e of employees) if (e.departmentId) empByDept.set(e.departmentId, (empByDept.get(e.departmentId) ?? 0) + 1);

  const departmentsScored: DeptScore[] = departments.map((d) => {
    // Environmental
    const dGoals = goals.filter((g) => g.departmentId === d.id);
    const env = dGoals.length
      ? round(dGoals.reduce((s, g) => s + goalProgress(g.targetCo2, g.currentCo2), 0) / dGoals.length)
      : 72;

    // Social
    const dParts = participations.filter((p) => p.employee.departmentId === d.id);
    const approved = dParts.filter((p) => p.approvalStatus === "APPROVED").length;
    const social = dParts.length ? round(60 + 40 * (approved / dParts.length)) : 70;

    // Governance
    const headcount = empByDept.get(d.id) ?? d.employeeCount ?? 0;
    const dAcks = acks.filter((a) => a.employee.departmentId === d.id).length;
    const expectedAcks = Math.max(1, policyCount * Math.max(1, headcount));
    const ackRate = clamp((dAcks / expectedAcks) * 100) / 100;
    const openIssues = issues.filter((i) => i.departmentId === d.id && i.status !== "RESOLVED").length;
    const gov = round(clamp(55 + 45 * ackRate - 6 * openIssues));

    const total = round(env * weights.env + social * weights.social + gov * weights.gov);
    return { id: d.id, name: d.name, code: d.code, employeeCount: headcount, env, social, gov, total };
  });

  const totalHeadcount = departmentsScored.reduce((s, d) => s + d.employeeCount, 0) || departmentsScored.length || 1;
  const wavg = (pick: (d: DeptScore) => number) =>
    round(
      departmentsScored.reduce((s, d) => s + pick(d) * (d.employeeCount || 1), 0) /
        (departmentsScored.reduce((s, d) => s + (d.employeeCount || 1), 0) || 1)
    );

  const org = departmentsScored.length
    ? { env: wavg((d) => d.env), social: wavg((d) => d.social), gov: wavg((d) => d.gov), overall: wavg((d) => d.total) }
    : { env: 0, social: 0, gov: 0, overall: 0 };

  void totalHeadcount;
  return { weights, departments: departmentsScored, org };
}

/** Persist the current snapshot into DepartmentScore rows (used by the "Recompute" action). */
export async function persistEsgSnapshot() {
  const snap = await getEsgSnapshot();
  await Promise.all(
    snap.departments.map((d) =>
      prisma.departmentScore.upsert({
        where: { departmentId_period: { departmentId: d.id, period: "current" } },
        create: {
          departmentId: d.id,
          period: "current",
          environmentalScore: d.env,
          socialScore: d.social,
          governanceScore: d.gov,
          totalScore: d.total,
        },
        update: {
          environmentalScore: d.env,
          socialScore: d.social,
          governanceScore: d.gov,
          totalScore: d.total,
        },
      })
    )
  );
  return snap;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Emissions (tonnes CO2) per month for the trailing `count` months. */
export async function getEmissionsTrend(count = 12) {
  const txns = await prisma.carbonTransaction.findMany({ select: { co2Kg: true, date: true } });
  const now = new Date();
  const buckets: { key: string; month: string; co2: number }[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({ key: `${d.getFullYear()}-${d.getMonth()}`, month: MONTHS[d.getMonth()], co2: 0 });
  }
  const idx = new Map(buckets.map((b, i) => [b.key, i]));
  for (const t of txns) {
    const d = new Date(t.date);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const i = idx.get(key);
    if (i !== undefined) buckets[i].co2 += t.co2Kg / 1000;
  }
  return buckets.map((b) => ({ month: b.month, co2: Math.round(b.co2 * 10) / 10 }));
}
