import { PrismaClient, type EmissionSource } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const daysFromNow = (d: number) => new Date(Date.now() + d * 86400000);
const monthsAgo = (m: number) => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() - m, 15);
};
const pick = <T>(arr: T[], i: number) => arr[i % arr.length];

async function main() {
  // --- reset (CASCADE handles the circular Department<->Employee refs) ---
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE
    "RewardRedemption","EmployeeBadge","Notification","PolicyAcknowledgement",
    "ChallengeParticipation","EmployeeParticipation","ComplianceIssue","Audit",
    "CarbonTransaction","EnvironmentalGoal","CSRActivity","Challenge",
    "ProductESGProfile","Product","DepartmentScore","Reward","Badge","ESGPolicy",
    "EmissionFactor","Category","User","Employee","Department","Company","EsgConfig"
    RESTART IDENTITY CASCADE;`);

  await prisma.esgConfig.create({ data: { id: "default" } });

  // --- Company (tenant) ---
  const company = await prisma.company.create({
    data: {
      name: "EcoSphere Demo Corp",
      slug: "ecosphere",
      domain: "ecosphere.io",
      website: "https://ecosphere.io",
      industry: "Manufacturing",
      headquarters: "Mumbai, India",
      description: "A demo manufacturing enterprise using EcoSphere to run its ESG program.",
    },
  });

  // --- Departments ---
  const deptData = [
    { name: "Sales", code: "SALE", employeeCount: 96 },
    { name: "Manufacturing", code: "MFG", employeeCount: 134 },
    { name: "Logistics", code: "LOG", employeeCount: 58 },
    { name: "Corporate", code: "COR", employeeCount: 41 },
    { name: "R&D", code: "RND", employeeCount: 63 },
  ];
  const depts = [];
  for (const d of deptData) depts.push(await prisma.department.create({ data: { ...d, companyId: company.id } }));
  const byCode = Object.fromEntries(depts.map((d) => [d.code, d]));

  // --- Employees ---
  const empNames = [
    ["Priya Menon", "F", "MFG"],
    ["Aditi Rao", "F", "COR"],
    ["Karan Shah", "M", "RND"],
    ["Rahul Iyer", "M", "LOG"],
    ["Sneha Nair", "F", "MFG"],
    ["Arjun Mehta", "M", "COR"],
    ["Devika Rao", "F", "SALE"],
    ["Vikram Singh", "M", "LOG"],
    ["Neha Gupta", "F", "RND"],
    ["Rohan Das", "M", "SALE"],
  ] as const;
  const employees = [];
  for (const [name, gender, code] of empNames) {
    employees.push(
      await prisma.employee.create({
        data: {
          name,
          email: name.toLowerCase().replace(/[^a-z]/g, ".") + "@ecosphere.io",
          gender,
          departmentId: byCode[code].id,
          companyId: company.id,
          xp: 200 + Math.floor(Math.random() * 4000),
          points: 100 + Math.floor(Math.random() * 3000),
        },
      })
    );
  }
  // assign a head to each department
  for (let i = 0; i < depts.length; i++)
    await prisma.department.update({ where: { id: depts[i].id }, data: { headId: employees[i].id } });

  // --- Users (auth accounts, all password: "password") ---
  const hash = await bcrypt.hash("password", 10);
  await prisma.user.createMany({
    data: [
      { email: "superadmin@ecosphere.io", passwordHash: hash, name: "Super Admin", role: "SUPER_ADMIN" },
      { email: "admin@ecosphere.io", passwordHash: hash, name: "Company Admin", role: "COMPANY_ADMIN", companyId: company.id },
      { email: "manager@ecosphere.io", passwordHash: hash, name: employees[4].name, role: "MANAGER", companyId: company.id, employeeId: employees[4].id },
      { email: "priya@ecosphere.io", passwordHash: hash, name: employees[0].name, role: "EMPLOYEE", companyId: company.id, employeeId: employees[0].id },
    ],
  });

  // --- Categories ---
  await prisma.category.createMany({
    data: [
      { name: "Environment", type: "CSR_ACTIVITY" },
      { name: "Community", type: "CSR_ACTIVITY" },
      { name: "Health", type: "CSR_ACTIVITY" },
      { name: "Energy", type: "CHALLENGE" },
      { name: "Waste", type: "CHALLENGE" },
      { name: "Mobility", type: "CHALLENGE" },
    ],
  });

  // --- Emission Factors ---
  const factorData: { name: string; unit: string; co2PerUnit: number; appliesTo: EmissionSource }[] = [
    { name: "Grid Electricity", unit: "kWh", co2PerUnit: 0.42, appliesTo: "EXPENSE" },
    { name: "Diesel (Fleet)", unit: "L", co2PerUnit: 2.68, appliesTo: "FLEET" },
    { name: "Natural Gas", unit: "m³", co2PerUnit: 2.02, appliesTo: "MANUFACTURING" },
    { name: "Air Freight", unit: "tonne-km", co2PerUnit: 0.6, appliesTo: "PURCHASE" },
    { name: "Steel", unit: "kg", co2PerUnit: 1.85, appliesTo: "MANUFACTURING" },
  ];
  const factors = [];
  for (const f of factorData) factors.push(await prisma.emissionFactor.create({ data: f }));

  // --- Environmental Goals (mirror the mockup) ---
  await prisma.environmentalGoal.createMany({
    data: [
      { name: "Reduce Fleet Emissions", departmentId: byCode.LOG.id, targetCo2: 500, currentCo2: 390, deadline: daysFromNow(180), status: "ON_TRACK" },
      { name: "Cut Packaging Waste", departmentId: byCode.MFG.id, targetCo2: 120, currentCo2: 98, deadline: daysFromNow(90), status: "ON_TRACK" },
      { name: "Office Energy Cut", departmentId: byCode.COR.id, targetCo2: 80, currentCo2: 80, deadline: daysFromNow(-10), status: "COMPLETED" },
      { name: "Green Procurement", departmentId: byCode.SALE.id, targetCo2: 200, currentCo2: 150, deadline: daysFromNow(120), status: "ON_TRACK" },
    ],
  });

  // --- Carbon Transactions across 12 months (downward trend like the mockup) ---
  const txns = [];
  for (let m = 11; m >= 0; m--) {
    const tonnes = 118 - (11 - m) * 3.5 + (m % 2 === 0 ? 4 : -3); // gentle decline
    for (let k = 0; k < 3; k++) {
      const factor = pick(factors, m + k);
      const share = tonnes / 3; // tonnes
      const quantity = (share * 1000) / factor.co2PerUnit;
      txns.push({
        source: factor.appliesTo,
        reference: `TXN-${m}-${k}`,
        departmentId: pick(depts, m + k).id,
        emissionFactorId: factor.id,
        quantity: Math.round(quantity),
        co2Kg: Math.round(share * 1000),
        auto: true,
        date: monthsAgo(m),
      });
    }
  }
  await prisma.carbonTransaction.createMany({ data: txns });

  // --- Social: CSR activities + participation ---
  const csr = await prisma.cSRActivity.create({
    data: { name: "Tree Plantation Drive", departmentId: byCode.MFG.id, points: 50, description: "Plant 500 saplings" },
  });
  const csr2 = await prisma.cSRActivity.create({
    data: { name: "Beach Cleanup", departmentId: byCode.SALE.id, points: 40, description: "Coastal cleanup" },
  });
  await prisma.employeeParticipation.createMany({
    data: [
      { employeeId: employees[0].id, csrActivityId: csr.id, proof: "photo.jpg", approvalStatus: "APPROVED", pointsEarned: 50, completionDate: daysFromNow(-5) },
      { employeeId: employees[4].id, csrActivityId: csr.id, proof: "photo2.jpg", approvalStatus: "APPROVED", pointsEarned: 50, completionDate: daysFromNow(-4) },
      { employeeId: employees[6].id, csrActivityId: csr2.id, approvalStatus: "PENDING" },
      { employeeId: employees[2].id, csrActivityId: csr2.id, proof: "cert.pdf", approvalStatus: "APPROVED", pointsEarned: 40, completionDate: daysFromNow(-2) },
    ],
  });

  // --- Governance: policies, acknowledgements, audits, compliance ---
  const policy = await prisma.eSGPolicy.create({ data: { name: "Anti-Corruption Policy", area: "Ethics" } });
  const policy2 = await prisma.eSGPolicy.create({ data: { name: "Environmental Compliance Policy", area: "Environment" } });
  await prisma.policyAcknowledgement.createMany({
    data: employees.slice(0, 7).map((e) => ({ policyId: policy.id, employeeId: e.id })),
  });
  await prisma.policyAcknowledgement.createMany({
    data: employees.slice(0, 5).map((e) => ({ policyId: policy2.id, employeeId: e.id })),
  });
  const audit = await prisma.audit.create({
    data: { title: "Q2 Waste Audit", departmentId: byCode.MFG.id, auditor: "S. Nair", findings: "3 minor issues", status: "COMPLETED", date: daysFromNow(-30) },
  });
  await prisma.complianceIssue.createMany({
    data: [
      { auditId: audit.id, departmentId: byCode.MFG.id, description: "Missing MSDS sheets", severity: "HIGH", ownerId: employees[4].id, dueDate: daysFromNow(-3), status: "OPEN", flagged: true },
      { auditId: audit.id, departmentId: byCode.LOG.id, description: "Late vendor disclosure", severity: "MEDIUM", ownerId: employees[3].id, dueDate: daysFromNow(14), status: "UNDER_REVIEW" },
    ],
  });

  // --- Gamification: challenges, badges, rewards ---
  await prisma.challenge.createMany({
    data: [
      { title: "Sustainability Sprint", xp: 200, difficulty: "HARD", evidenceRequired: true, deadline: daysFromNow(8), status: "ACTIVE" },
      { title: "Recycle Challenge", xp: 80, difficulty: "EASY", deadline: daysFromNow(3), status: "ACTIVE" },
      { title: "Commute Green Week", xp: 120, difficulty: "MEDIUM", deadline: daysFromNow(13), status: "DRAFT" },
    ],
  });
  await prisma.badge.createMany({
    data: [
      { name: "Green Beginner", icon: "🌱", unlockMetric: "XP", unlockThreshold: 500, description: "Earn 500 XP" },
      { name: "Carbon Saver", icon: "♻️", unlockMetric: "COMPLETED_CHALLENGES", unlockThreshold: 3, description: "Complete 3 challenges" },
      { name: "Sustainability Champion", icon: "🏆", unlockMetric: "XP", unlockThreshold: 3000, description: "Earn 3000 XP" },
    ],
  });
  await prisma.reward.createMany({
    data: [
      { name: "Eco Water Bottle", pointsRequired: 300, stock: 50 },
      { name: "Extra Day Off", pointsRequired: 2000, stock: 5 },
      { name: "Tree in Your Name", pointsRequired: 150, stock: 200 },
    ],
  });

  // --- sanity check ---
  const [dCount, tCount] = await Promise.all([prisma.department.count(), prisma.carbonTransaction.count()]);
  if (dCount < 1 || tCount < 1) throw new Error("Seed failed: expected departments and transactions");
  console.log(`Seeded: ${dCount} departments, ${employees.length} employees, ${tCount} carbon transactions.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
