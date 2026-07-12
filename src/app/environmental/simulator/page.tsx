import { PageHeader, ModuleTabs } from "@/components/ui";
import { SubNav } from "@/components/SubNav";
import { ENV_TABS } from "@/lib/nav";
import { prisma } from "@/lib/prisma";
import { SimSwitcher } from "./SimSwitcher";

export const dynamic = "force-dynamic";

export default async function SimulatorPage() {
  const departments = await prisma.department.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="p-6">
      <PageHeader
        title="Environmental: Transport Emissions Simulator"
        subtitle="Simulate ship, air and ground freight — live routes, mode-specific faults, and the emissions & cost they cause"
        accent="text-env"
      />
      <ModuleTabs active="Environmental" />
      <SubNav items={ENV_TABS} />
      <SimSwitcher departments={departments} />
    </div>
  );
}
