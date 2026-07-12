import { Trash2, Zap, FileDown } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { ENV_TABS, EMISSION_SOURCES } from "@/lib/nav";
import { Card, ModuleTabs, PageHeader, Table } from "@/components/ui";
import { SubNav } from "@/components/SubNav";
import { titleCase, fmtDate, fmtNum } from "@/lib/format";
import { createCarbonTransaction, deleteCarbonTransaction } from "../actions";

export const dynamic = "force-dynamic";

export default async function CarbonTransactionsPage() {
  const [txns, departments, factors] = await Promise.all([
    prisma.carbonTransaction.findMany({
      include: { department: true, emissionFactor: true },
      orderBy: { date: "desc" },
      take: 100,
    }),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
    prisma.emissionFactor.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" } }),
  ]);

  const totalKg = txns.reduce((s, t) => s + t.co2Kg, 0);

  return (
    <div className="p-6 animate-fade-in">
      <PageHeader
        title="Environmental: Carbon Transactions"
        subtitle={`${fmtNum(txns.length)} records · ${fmtNum(totalKg / 1000, 1)} t CO₂ total`}
        accent="text-env"
        actions={
          <a href="/api/reports/pdf?type=environmental" className="btn-primary flex items-center gap-1.5">
            <FileDown size={15} /> Export PDF
          </a>
        }
      />
      <ModuleTabs active="Environmental" />
      <SubNav items={ENV_TABS} />

      <Card
        title="Log Carbon Transaction"
        className="mb-4"
        right={
          <span className="flex items-center gap-1 text-xs text-env">
            <Zap size={13} /> CO₂ auto-calculated from factor × quantity
          </span>
        }
      >
        <form action={createCarbonTransaction} className="grid grid-cols-1 gap-3 sm:grid-cols-5">
          <div>
            <label className="label">Source</label>
            <select name="source" className="input">
              {EMISSION_SOURCES.map((s) => (
                <option key={s} value={s}>
                  {titleCase(s)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Department</label>
            <select name="departmentId" className="input">
              <option value="">—</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Emission Factor</label>
            <select name="emissionFactorId" className="input">
              <option value="">—</option>
              {factors.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.co2PerUnit}/{f.unit})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Quantity</label>
            <input name="quantity" type="number" step="any" className="input" placeholder="1200" />
          </div>
          <div>
            <label className="label">Reference</label>
            <input name="reference" className="input" placeholder="PO-1042" />
          </div>
          <div className="sm:col-span-5">
            <button className="btn-primary">Log Transaction</button>
          </div>
        </form>
      </Card>

      <Table head={["Date", "Source", "Reference", "Department", "Factor", "Quantity", "CO₂ (kg)", ""]}>
        {txns.map((t) => (
          <tr key={t.id}>
            <td className="td">{fmtDate(t.date)}</td>
            <td className="td text-ink">{titleCase(t.source)}</td>
            <td className="td">{t.reference ?? "—"}</td>
            <td className="td">{t.department?.name ?? "—"}</td>
            <td className="td">{t.emissionFactor?.name ?? "—"}</td>
            <td className="td">{fmtNum(t.quantity, 1)}</td>
            <td className="td text-ink">{fmtNum(t.co2Kg, 1)}</td>
            <td className="td text-right">
              <form action={deleteCarbonTransaction}>
                <input type="hidden" name="id" value={t.id} />
                <button className="text-faint hover:text-danger" aria-label="Delete">
                  <Trash2 size={15} />
                </button>
              </form>
            </td>
          </tr>
        ))}
        {txns.length === 0 && (
          <tr>
            <td className="td text-faint" colSpan={8}>
              No carbon transactions yet — log one above.
            </td>
          </tr>
        )}
      </Table>
    </div>
  );
}
