import { prisma } from "@/lib/prisma";
import { toCsv } from "@/lib/csv";
import { getEsgSnapshot } from "@/lib/esg";
import { fmtDate, titleCase } from "@/lib/format";

export const dynamic = "force-dynamic";

// Date range filter for a DateTime column; `to` is stretched to end-of-day.
function dateWhere(from: string | null, to: string | null) {
  const f: { gte?: Date; lte?: Date } = {};
  if (from) f.gte = new Date(from);
  if (to) f.lte = new Date(`${to}T23:59:59.999`);
  return Object.keys(f).length ? f : undefined;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") ?? "summary";
  const format = searchParams.get("format") === "excel" ? "excel" : "csv";
  const department = searchParams.get("department") || undefined;
  const dw = dateWhere(searchParams.get("from"), searchParams.get("to"));

  let headers: string[] = [];
  let rows: (string | number | null | undefined)[][] = [];

  if (type === "environmental") {
    const txns = await prisma.carbonTransaction.findMany({
      where: { departmentId: department, date: dw },
      include: { department: true, emissionFactor: true },
      orderBy: { date: "desc" },
      take: 200,
    });
    headers = ["Date", "Source", "Department", "Factor", "Quantity", "CO2 (kg)"];
    rows = txns.map((t) => [
      fmtDate(t.date),
      titleCase(t.source),
      t.department?.name ?? "",
      t.emissionFactor?.name ?? "",
      t.quantity,
      t.co2Kg,
    ]);
  } else if (type === "social") {
    const parts = await prisma.employeeParticipation.findMany({
      where: {
        employee: department ? { departmentId: department } : undefined,
        completionDate: dw,
      },
      include: { employee: true, csrActivity: true },
      orderBy: { createdAt: "desc" },
    });
    headers = ["Employee", "Activity", "Status", "Points", "Completion Date"];
    rows = parts.map((p) => [
      p.employee.name,
      p.csrActivity.name,
      titleCase(p.approvalStatus),
      p.pointsEarned,
      p.completionDate ? fmtDate(p.completionDate) : "",
    ]);
  } else if (type === "governance") {
    const issues = await prisma.complianceIssue.findMany({
      where: { departmentId: department, dueDate: dw },
      include: { owner: true, department: true },
      orderBy: { dueDate: "asc" },
    });
    headers = ["Description", "Severity", "Department", "Owner", "Due", "Status"];
    rows = issues.map((i) => [
      i.description,
      titleCase(i.severity),
      i.department?.name ?? "",
      i.owner.name,
      fmtDate(i.dueDate),
      titleCase(i.status),
    ]);
  } else {
    const snap = await getEsgSnapshot();
    const depts = department ? snap.departments.filter((d) => d.id === department) : snap.departments;
    headers = ["Department", "Environmental", "Social", "Governance", "Total"];
    rows = depts.map((d) => [d.name, d.env, d.social, d.gov, d.total]);
  }

  const csv = toCsv(headers, rows);
  return new Response(csv, {
    headers: {
      "content-type": format === "excel" ? "application/vnd.ms-excel" : "text/csv",
      "content-disposition": `attachment; filename="${type}-report.${format === "excel" ? "xls" : "csv"}"`,
    },
  });
}
