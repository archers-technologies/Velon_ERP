import { createFileRoute, Link } from "@tanstack/react-router";
import { loadPublicSiteContentSafe } from "@/lib/cms/load-public";
import { loadPublicPlans, marketingPlanCards } from "@/lib/api/billing-public";
import { MarketingPageShell } from "@/components/marketing-page-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  PricingPreferenceControl,
  PricingPreferencePrompt,
  usePricingPreference,
} from "@/components/pricing-preference";
import { formatMonthlyPrice } from "@/lib/pricing-preferences";
import { Check } from "lucide-react";

export const Route = createFileRoute("/pricing")({
  loader: async () => {
    const [siteContent, catalog] = await Promise.all([loadPublicSiteContentSafe(), loadPublicPlans()]);
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
      <div className="mb-6">
        <PricingPreferenceControl preference={preference} onChange={updatePreference} />
      </div>
      <div className="grid gap-5 md:grid-cols-3">
        {plans.map((plan) => (
          <Card
            key={plan.name}
            className={`border-border p-6 ${plan.featured ? "bg-foreground text-background" : "bg-card"}`}
          >
            {plan.featured && (
              <Badge className="mb-3 bg-background text-foreground hover:bg-background">
                Most popular
              </Badge>
            )}
            <h3 className="text-lg font-semibold">{plan.name}</h3>
            <p className="mt-2 text-3xl font-semibold tracking-tight">
              {plan.isCustom
                ? "Custom"
                : `${formatMonthlyPrice(plan.monthlyPrice, preference.currency)}/mo`}
            </p>
            <p className={`mt-1 text-sm ${plan.featured ? "text-background/70" : "text-muted-foreground"}`}>
              {plan.desc}
            </p>
            <ul className="mt-5 space-y-2 text-sm">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-center gap-2">
                  <Check className="h-4 w-4" /> {feature}
                </li>
              ))}
            </ul>
            <Button
              asChild
              className={`mt-6 w-full ${plan.featured ? "bg-background text-foreground hover:bg-background/90" : "bg-foreground text-background hover:bg-foreground/90"}`}
            >
              <Link
                to={plan.isCustom ? "/contact" : "/login"}
                search={plan.isCustom ? undefined : { tab: "signup" }}
              >
                {plan.isCustom ? "Talk to sales" : "Start free trial"}
              </Link>
            </Button>
          </Card>
        ))}
      </div>
    </MarketingPageShell>
  );
}
