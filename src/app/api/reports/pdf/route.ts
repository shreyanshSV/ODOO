import { prisma } from "@/lib/prisma";
import { fmtDate, titleCase } from "@/lib/format";
import { generateEnvironmentalPdf } from "@/lib/pdf";
import type { PdfTransaction } from "@/lib/pdf";
import { fireN8n } from "@/lib/notify";

export const dynamic = "force-dynamic";

/** Build a date-range filter for Prisma DateTime fields. */
function dateWhere(from: string | null, to: string | null) {
  const f: { gte?: Date; lte?: Date } = {};
  if (from) f.gte = new Date(from);
  if (to) f.lte = new Date(`${to}T23:59:59.999`);
  return Object.keys(f).length ? f : undefined;
}

/** Generate a short invoice-style reference: ENV-YYYYMMDD-XXXX */
function invoiceNo() {
  const d = new Date();
  const ymd =
    String(d.getFullYear()) +
    String(d.getMonth() + 1).padStart(2, "0") +
    String(d.getDate()).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `ENV-${ymd}-${rand}`;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const department = searchParams.get("department") || undefined;
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const dw = dateWhere(from, to);

  // Fetch transactions
  const txns = await prisma.carbonTransaction.findMany({
    where: { departmentId: department, date: dw },
    include: { department: true, emissionFactor: true },
    orderBy: { date: "desc" },
    take: 500,
  });

  // Map to PDF data
  const pdfTxns: PdfTransaction[] = txns.map((t) => ({
    date: fmtDate(t.date),
    source: titleCase(t.source),
    reference: t.reference ?? "",
    department: t.department?.name ?? "",
    factor: t.emissionFactor?.name ?? "",
    quantity: t.quantity,
    co2Kg: t.co2Kg,
  }));

  const totalCo2Kg = txns.reduce((s, t) => s + t.co2Kg, 0);

  // Resolve department name for the header
  let deptName: string | undefined;
  if (department) {
    const dept = await prisma.department.findUnique({
      where: { id: department },
    });
    deptName = dept?.name;
  }

  const refNo = invoiceNo();
  const now = new Date().toISOString().slice(0, 16).replace("T", " ");

  const buf = generateEnvironmentalPdf({
    title: "Environmental Carbon Report",
    subtitle: "Carbon emission transactions — EcoSphere ESG Platform",
    invoiceNo: refNo,
    generatedAt: now,
    department: deptName,
    dateFrom: from ?? undefined,
    dateTo: to ?? undefined,
    transactions: pdfTxns,
    totalCo2Kg,
    totalRecords: txns.length,
  });

  // Fire n8n notification (best-effort, non-blocking)
  fireN8n("ENVIRONMENTAL", {
    title: "PDF Report Exported",
    message: `Environmental report ${refNo} generated with ${txns.length} transactions (${(totalCo2Kg / 1000).toFixed(2)} t CO₂).`,
  }).catch(() => {});

  return new Response(new Uint8Array(buf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="environmental-report-${refNo}.pdf"`,
    },
  });
}
