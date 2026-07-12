import { Leaf, Users, ShieldCheck, BarChart3, FileDown, Eye, FileText } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getEsgSnapshot } from "@/lib/esg";
import { Card, ModuleTabs, PageHeader, Pill, ScoreTile, Table, EmptyState } from "@/components/ui";
import { fmtNum, fmtDate, titleCase } from "@/lib/format";
import { PrintButton } from "./PrintButton";

export const dynamic = "force-dynamic";

type ReportType = "environmental" | "social" | "governance" | "summary";

const REPORTS: { type: ReportType; title: string; desc: string; accent: string; icon: React.ReactNode }[] = [
  {
    type: "environmental",
    title: "Environmental Report",
    desc: "Carbon transactions by source, department, and emission factor.",
    accent: "text-env",
    icon: <Leaf size={16} className="text-env" />,
  },
  {
    type: "social",
    title: "Social Report",
    desc: "Employee CSR participation, approval status, and points earned.",
    accent: "text-social",
    icon: <Users size={16} className="text-social" />,
  },
  {
    type: "governance",
    title: "Governance Report",
    desc: "Compliance issues by severity, owner, and resolution status.",
    accent: "text-gov",
    icon: <ShieldCheck size={16} className="text-gov" />,
  },
  {
    type: "summary",
    title: "ESG Summary Report",
    desc: "Department ESG scorecard and organization-wide performance.",
    accent: "text-overall",
    icon: <BarChart3 size={16} className="text-overall" />,
  },
];

const TYPES: ReportType[] = ["environmental", "social", "governance", "summary"];

// Date range filter for a DateTime column; `to` is stretched to end-of-day.
function dateWhere(from?: string, to?: string) {
  const f: { gte?: Date; lte?: Date } = {};
  if (from) f.gte = new Date(from);
  if (to) f.lte = new Date(`${to}T23:59:59.999`);
  return Object.keys(f).length ? f : undefined;
}

async function renderPreview(type: ReportType, department?: string, from?: string, to?: string) {
  const dw = dateWhere(from, to);

  if (type === "environmental") {
    const txns = await prisma.carbonTransaction.findMany({
      where: { departmentId: department || undefined, date: dw },
      include: { department: true, emissionFactor: true },
      orderBy: { date: "desc" },
      take: 200,
    });
    return (
      <Table head={["Date", "Source", "Department", "Factor", "Quantity", "CO₂ (kg)"]}>
        {txns.map((t) => (
          <tr key={t.id}>
            <td className="td">{fmtDate(t.date)}</td>
            <td className="td text-ink">{titleCase(t.source)}</td>
            <td className="td">{t.department?.name ?? "—"}</td>
            <td className="td">{t.emissionFactor?.name ?? "—"}</td>
            <td className="td">{fmtNum(t.quantity, 1)}</td>
            <td className="td text-ink">{fmtNum(t.co2Kg, 1)}</td>
          </tr>
        ))}
        {txns.length === 0 && (
          <tr>
            <td className="td text-faint" colSpan={6}>
              No carbon transactions match the selected filters.
            </td>
          </tr>
        )}
      </Table>
    );
  }

  if (type === "social") {
    const parts = await prisma.employeeParticipation.findMany({
      where: {
        employee: department ? { departmentId: department } : undefined,
        completionDate: dw,
      },
      include: { employee: true, csrActivity: true },
      orderBy: { createdAt: "desc" },
    });
    return (
      <Table head={["Employee", "Activity", "Status", "Points", "Completion Date"]}>
        {parts.map((p) => (
          <tr key={p.id}>
            <td className="td text-ink">{p.employee.name}</td>
            <td className="td">{p.csrActivity.name}</td>
            <td className="td">
              <Pill value={p.approvalStatus} />
            </td>
            <td className="td">{fmtNum(p.pointsEarned)}</td>
            <td className="td">{p.completionDate ? fmtDate(p.completionDate) : "—"}</td>
          </tr>
        ))}
        {parts.length === 0 && (
          <tr>
            <td className="td text-faint" colSpan={5}>
              No participation records match the selected filters.
            </td>
          </tr>
        )}
      </Table>
    );
  }

  if (type === "governance") {
    const issues = await prisma.complianceIssue.findMany({
      where: { departmentId: department || undefined, dueDate: dw },
      include: { owner: true, department: true },
      orderBy: { dueDate: "asc" },
    });
    return (
      <Table head={["Description", "Severity", "Department", "Owner", "Due", "Status"]}>
        {issues.map((i) => (
          <tr key={i.id}>
            <td className="td text-ink">{i.description}</td>
            <td className="td">
              <Pill value={i.severity} />
            </td>
            <td className="td">{i.department?.name ?? "—"}</td>
            <td className="td">{i.owner.name}</td>
            <td className="td">{fmtDate(i.dueDate)}</td>
            <td className="td">
              <Pill value={i.status} />
            </td>
          </tr>
        ))}
        {issues.length === 0 && (
          <tr>
            <td className="td text-faint" colSpan={6}>
              No compliance issues match the selected filters.
            </td>
          </tr>
        )}
      </Table>
    );
  }

  // summary
  const snap = await getEsgSnapshot();
  const depts = department ? snap.departments.filter((d) => d.id === department) : snap.departments;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ScoreTile label="Environmental Score" value={snap.org.env} accent="text-env" />
        <ScoreTile label="Social Score" value={snap.org.social} accent="text-social" />
        <ScoreTile label="Governance Score" value={snap.org.gov} accent="text-gov" />
        <ScoreTile label="Overall ESG Score" value={snap.org.overall} accent="text-overall" />
      </div>
      <Table head={["Department", "Env", "Social", "Gov", "Total"]}>
        {depts.map((d) => (
          <tr key={d.id}>
            <td className="td text-ink">{d.name}</td>
            <td className="td text-env">{d.env}</td>
            <td className="td text-social">{d.social}</td>
            <td className="td text-gov">{d.gov}</td>
            <td className="td text-ink">{d.total}</td>
          </tr>
        ))}
        {depts.length === 0 && (
          <tr>
            <td className="td text-faint" colSpan={5}>
              No departments match the selected filters.
            </td>
          </tr>
        )}
      </Table>
    </div>
  );
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const type: ReportType | undefined = TYPES.includes(sp.type as ReportType)
    ? (sp.type as ReportType)
    : undefined;
  const department = sp.department || "";
  const from = sp.from || "";
  const to = sp.to || "";

  const departments = await prisma.department.findMany({ orderBy: { name: "asc" } });

  // Carry active filters onto the export links so downloads match the preview.
  const filterQs = new URLSearchParams();
  if (department) filterQs.set("department", department);
  if (from) filterQs.set("from", from);
  if (to) filterQs.set("to", to);
  const filterSuffix = filterQs.toString() ? `&${filterQs.toString()}` : "";

  const preview = type ? await renderPreview(type, department, from, to) : null;
  const activeMeta = REPORTS.find((r) => r.type === type);

  return (
    <div className="p-6">
      <PageHeader
        title="Reports & Analytics"
        subtitle="Preview, filter, and export ESG data across every module"
        accent="text-muted"
      />
      <ModuleTabs active="Reports" />

      {/* Report catalogue */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {REPORTS.map((r) => (
          <Card key={r.type}>
            <div className="mb-2 flex items-center gap-2">
              {r.icon}
              <h2 className={`text-sm font-semibold ${r.accent}`}>{r.title}</h2>
            </div>
            <p className="mb-3 text-xs text-faint">{r.desc}</p>
            <div className="flex flex-wrap items-center gap-2">
              <a href={`/reports?type=${r.type}${filterSuffix}`} className="btn-ghost">
                <Eye size={14} /> Preview
              </a>
              <a
                href={`/api/reports/export?type=${r.type}&format=csv${filterSuffix}`}
                className="btn-ghost"
              >
                <FileDown size={14} /> CSV
              </a>
              <a
                href={`/api/reports/export?type=${r.type}&format=excel${filterSuffix}`}
                className="btn-ghost"
              >
                <FileDown size={14} /> Excel
              </a>
              {r.type === "environmental" && (
                <a
                  href={`/api/reports/pdf?type=environmental${filterSuffix}`}
                  className="btn-ghost"
                >
                  <FileText size={14} /> PDF
                </a>
              )}
              <PrintButton />
            </div>
          </Card>
        ))}
      </div>

      {/* Custom report builder */}
      <Card title="Custom Report Builder" className="mt-4">
        <form method="get" action="/reports" className="grid grid-cols-1 gap-3 sm:grid-cols-5">
          <div>
            <label className="label">Report Type</label>
            <select name="type" defaultValue={type ?? "environmental"} className="input">
              {REPORTS.map((r) => (
                <option key={r.type} value={r.type}>
                  {r.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Department</label>
            <select name="department" defaultValue={department} className="input">
              <option value="">All departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">From</label>
            <input name="from" type="date" defaultValue={from} className="input" />
          </div>
          <div>
            <label className="label">To</label>
            <input name="to" type="date" defaultValue={to} className="input" />
          </div>
          <div className="flex items-end">
            <button className="btn-primary">Generate Preview</button>
          </div>
        </form>
      </Card>

      {/* Preview */}
      <div className="mt-4">
        {preview && activeMeta ? (
          <Card
            title={`${activeMeta.title} — Preview`}
            right={
              <div className="flex items-center gap-2">
                <a
                  href={`/api/reports/export?type=${type}&format=csv${filterSuffix}`}
                  className="btn-ghost"
                >
                  <FileDown size={14} /> CSV
                </a>
                <a
                  href={`/api/reports/export?type=${type}&format=excel${filterSuffix}`}
                  className="btn-ghost"
                >
                  <FileDown size={14} /> Excel
                </a>
                {type === "environmental" && (
                  <a
                    href={`/api/reports/pdf?type=environmental${filterSuffix}`}
                    className="btn-ghost"
                  >
                    <FileText size={14} /> PDF
                  </a>
                )}
                <PrintButton />
              </div>
            }
          >
            {preview}
          </Card>
        ) : (
          <EmptyState text="Pick a report above or use the builder to preview data here." />
        )}
      </div>
    </div>
  );
}
