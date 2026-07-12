import { prisma } from "@/lib/prisma";
import { SETTINGS_TABS } from "@/lib/nav";
import { Card, ModuleTabs, PageHeader } from "@/components/ui";
import { SubNav } from "@/components/SubNav";
import { saveConfig } from "../actions";

export const dynamic = "force-dynamic";

export default async function EsgConfigPage() {
  const config = await prisma.esgConfig.findUnique({ where: { id: "default" } });

  return (
    <div className="p-6">
      <PageHeader
        title="Settings: ESG Configuration"
        subtitle="Scoring weights and automation defaults"
        accent="text-ink"
      />
      <ModuleTabs active="Settings" />
      <SubNav items={SETTINGS_TABS} />

      <Card title="Scoring & Automation">
        <form action={saveConfig} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="label">Environmental Weight</label>
            <input
              name="envWeight"
              type="number"
              step="0.05"
              className="input"
              defaultValue={config?.envWeight ?? 0.4}
            />
          </div>
          <div>
            <label className="label">Social Weight</label>
            <input
              name="socialWeight"
              type="number"
              step="0.05"
              className="input"
              defaultValue={config?.socialWeight ?? 0.3}
            />
          </div>
          <div>
            <label className="label">Governance Weight</label>
            <input
              name="govWeight"
              type="number"
              step="0.05"
              className="input"
              defaultValue={config?.govWeight ?? 0.3}
            />
          </div>

          <div className="sm:col-span-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                name="autoEmissionCalc"
                type="checkbox"
                defaultChecked={config?.autoEmissionCalc ?? true}
              />
              Auto-calculate emissions
            </label>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                name="evidenceRequired"
                type="checkbox"
                defaultChecked={config?.evidenceRequired ?? true}
              />
              Require evidence for approvals
            </label>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                name="badgeAutoAward"
                type="checkbox"
                defaultChecked={config?.badgeAutoAward ?? true}
              />
              Auto-award badges
            </label>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                name="emailAlerts"
                type="checkbox"
                defaultChecked={config?.emailAlerts ?? true}
              />
              Send email alerts
            </label>
          </div>

          <p className="sm:col-span-3 text-xs text-faint">
            Weights are normalized automatically when ESG scores are computed, so they need not sum
            to exactly 1.
          </p>

          <div className="sm:col-span-3">
            <button className="btn-primary">Save Configuration</button>
          </div>
        </form>
      </Card>
    </div>
  );
}
