import { createFileRoute } from '@tanstack/react-router';
import { MarketingPricingSection } from '@/components/billing/marketing-pricing';
import {
  PricingPreferencePrompt,
  usePricingPreference,
} from '@/components/billing/pricing-preference';
import { MarketingPageShell } from '@/components/marketing/marketing-page-shell';
import { loadPublicPlans, marketingPlanCards } from '@/lib/billing/public-api';
import { loadPublicSiteContentSafe } from '@/lib/cms/load-public';

export const Route = createFileRoute('/pricing')({
  loader: async () => {
    const [siteContent, catalog] = await Promise.all([
      loadPublicSiteContentSafe(),
      loadPublicPlans(),
    ]);
    return { siteContent, plans: marketingPlanCards(catalog) };
  },
  component: PricingPage,
});

function PricingPage() {
  const { siteContent, plans } = Route.useLoaderData();
  const { preference, updatePreference } = usePricingPreference();

  return (
    <MarketingPageShell
      label="Pricing"
      title={siteContent.pricing.headline}
      description={siteContent.pricing.subhead}
      siteContent={siteContent}
    >
      <PricingPreferencePrompt skipAutoOpen />
      <MarketingPricingSection
        headline={siteContent.pricing.headline}
        subhead={siteContent.pricing.subhead}
        plans={plans}
        preference={preference}
        onPreferenceChange={updatePreference}
        hideHeadline
      />
    </MarketingPageShell>
  );
}
