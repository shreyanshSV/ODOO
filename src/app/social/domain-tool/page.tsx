import { PageHeader, ModuleTabs } from "@/components/ui";
import { SubNav } from "@/components/SubNav";
import { SOCIAL_TABS } from "@/lib/nav";
import { requireUser } from "@/lib/session";
import { DomainTool } from "./DomainTool";

export const dynamic = "force-dynamic";

export default async function DomainToolPage() {
  await requireUser();

  return (
    <div className="p-6 animate-fade-in">
      <PageHeader
        title="Social: Company → Domain Tool"
        subtitle="Resolve company names to their official domains in bulk (Clearbit → DuckDuckGo → Bing), with confidence and CSV export"
        accent="text-social"
      />
      <ModuleTabs active="Social" />
      <SubNav items={SOCIAL_TABS} />
      <DomainTool />
    </div>
  );
}
