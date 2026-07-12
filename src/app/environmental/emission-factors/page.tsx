import { Trash2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { ENV_TABS, EMISSION_SOURCES } from "@/lib/nav";
import { Card, ModuleTabs, PageHeader, Pill, Table } from "@/components/ui";
import { SubNav } from "@/components/SubNav";
import { titleCase, fmtNum } from "@/lib/format";
import { createEmissionFactor, deleteEmissionFactor } from "../actions";

export const dynamic = "force-dynamic";

export default async function EmissionFactorsPage() {
  const factors = await prisma.emissionFactor.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="p-6">
      <PageHeader
        title="Environmental: Emission Factors"
        subtitle="Carbon values applied when calculating emissions"
        accent="text-env"
      />
      <ModuleTabs active="Environmental" />
      <SubNav items={ENV_TABS} />

      <Card title="Add Emission Factor" className="mb-4">
        <form action={createEmissionFactor} className="grid grid-cols-1 gap-3 sm:grid-cols-5">
          <div className="sm:col-span-2">
            <label className="label">Name</label>
            <input name="name" required className="input" placeholder="Grid Electricity" />
          </div>
          <div>
            <label className="label">Unit</label>
            <input name="unit" className="input" placeholder="kWh" />
          </div>
          <div>
            <label className="label">kg CO₂ / unit</label>
            <input name="co2PerUnit" type="number" step="any" className="input" placeholder="0.42" />
          </div>
          <div>
            <label className="label">Applies To</label>
            <select name="appliesTo" className="input">
              {EMISSION_SOURCES.map((s) => (
                <option key={s} value={s}>
                  {titleCase(s)}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-5">
            <button className="btn-primary">Add Factor</button>
          </div>
        </form>
      </Card>

      <Table head={["Name", "Unit", "kg CO₂ / unit", "Applies To", "Status", ""]}>
        {factors.map((f) => (
          <tr key={f.id}>
            <td className="td text-ink">{f.name}</td>
            <td className="td">{f.unit}</td>
            <td className="td">{fmtNum(f.co2PerUnit, 3)}</td>
            <td className="td">{titleCase(f.appliesTo)}</td>
            <td className="td">
              <Pill value={f.status} />
            </td>
            <td className="td text-right">
              <form action={deleteEmissionFactor}>
                <input type="hidden" name="id" value={f.id} />
                <button className="text-faint hover:text-danger" aria-label="Delete">
                  <Trash2 size={15} />
                </button>
              </form>
            </td>
          </tr>
        ))}
        {factors.length === 0 && (
          <tr>
            <td className="td text-faint" colSpan={6}>
              No emission factors yet — add one above.
            </td>
          </tr>
        )}
      </Table>
    </div>
  );
}
