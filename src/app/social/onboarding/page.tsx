import { PageHeader, ModuleTabs } from "@/components/ui";
import { SubNav } from "@/components/SubNav";
import { SOCIAL_TABS } from "@/lib/nav";
import { requireRole } from "@/lib/session";
import { OnboardingWizard } from "./OnboardingWizard";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  await requireRole(["SUPER_ADMIN", "COMPANY_ADMIN"]); // employees/managers are bounced home

  return (
    <div className="p-6 animate-fade-in">
      <PageHeader
        title="Social: Company Workspace Generator"
        subtitle="Create a company workspace — auto-enriched from public web sources, reviewed by an admin before it's saved"
        accent="text-social"
      />
      <ModuleTabs active="Social" />
      <SubNav items={SOCIAL_TABS} />
      <OnboardingWizard />
    </div>
  );
}
