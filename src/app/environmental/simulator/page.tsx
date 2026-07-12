import { PageHeader, ModuleTabs } from "@/components/ui";
import { SubNav } from "@/components/SubNav";
import { ENV_TABS } from "@/lib/nav";
import { Simulator } from "./Simulator";

export const dynamic = "force-dynamic";

export default function SimulatorPage() {
  return (
    <div className="p-6">
      <PageHeader
        title="Environmental: Live Map & Voyage Simulator"
        subtitle="Track live aircraft, simulate a Mumbai → New York voyage, inject maritime faults, and watch emissions & cost build up in real time"
        accent="text-env"
      />
      <ModuleTabs active="Environmental" />
      <SubNav items={ENV_TABS} />
      <Simulator />
    </div>
  );
}
