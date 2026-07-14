import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowRight, Boxes, Zap } from 'lucide-react';
import { MarketingPricingSection } from '@/components/billing/marketing-pricing';
import {
  PricingPreferencePrompt,
  usePricingPreference,
} from '@/components/billing/pricing-preference';
import { SiteFooter } from '@/components/marketing/site-footer';
import { SiteHeader } from '@/components/marketing/site-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { loginSearch } from '@/lib/auth/login-utils';
import { loadPublicPlans, marketingPlanCards } from '@/lib/billing/public-api';
import { loadPublicSiteContentSafe } from '@/lib/cms/load-public';

export const Route = createFileRoute('/')({
  loader: async () => {
    const [siteContent, catalog] = await Promise.all([
      loadPublicSiteContentSafe(),
      loadPublicPlans(),
    ]);
    return { siteContent, plans: marketingPlanCards(catalog) };
  },
  head: () => ({
    meta: [
      { title: 'Velon-ERP — The Proactive Business Operating System' },
      {
        name: 'description',
        content:
          'Velon-ERP is a premium AI-ready ERP for inventory, billing, accounting, workforce and customers.',
      },
    ],
  }),
  component: Home,
});

function Home() {
  const { siteContent, plans } = Route.useLoaderData();
  const hero = siteContent.hero;
  const features = siteContent.features;
  const featureItems = features.items;
  const testimonials = siteContent.testimonials.items;
  const pricingContent = siteContent.pricing;
  const faqItems = siteContent.faq.items;
  const cta = siteContent.cta;
  const { preference, updatePreference } = usePricingPreference();

  return (
    <div className="bg-background min-h-screen">
      <SiteHeader />
      <PricingPreferencePrompt />

      <section className="relative overflow-hidden">
        <div className="bg-gradient-hero absolute inset-0" />
        <div className="bg-gradient-mesh absolute inset-0 opacity-40" />
        <div className="relative mx-auto max-w-7xl px-6 pt-20 pb-24 text-center">
          <Badge
            variant="outline"
            className="border-border bg-background/70 mb-6 gap-2 rounded-full px-4 py-1.5 text-xs font-medium backdrop-blur"
          >
            <span className="bg-foreground flex h-1.5 w-1.5 rounded-full" />
            {hero.badge ?? 'Velon-ERP'}
          </Badge>
          <h1 className="mx-auto max-w-4xl text-5xl leading-[1.05] font-semibold tracking-tight sm:text-6xl md:text-[72px]">
            {hero.title}
          </h1>
          <p className="text-muted-foreground mx-auto mt-6 max-w-2xl text-lg leading-relaxed">
            {hero.subtitle}
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Button
              asChild
              size="lg"
              className="bg-foreground text-background hover:bg-foreground/90 h-12 rounded-xl px-7"
            >
              <Link
                to="/login"
                search={loginSearch({ tab: 'signup' })}
              >
                {hero.cta} <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-border h-12 rounded-xl px-7"
            >
              <Link to="/pricing">{hero.ctaSecondary}</Link>
            </Button>
          </div>
        </div>
      </section>

      <section
        id="features"
        className="mx-auto max-w-7xl px-6 py-24"
      >
        <div className="mb-14 max-w-2xl">
          <Badge
            variant="outline"
            className="border-border mb-3 rounded-full"
          >
            Platform
          </Badge>
          <h2 className="text-4xl font-semibold tracking-tight">{features.headline}</h2>
          <p className="text-muted-foreground mt-3">{features.subhead}</p>
        </div>
        <div className="border-border bg-border grid gap-px overflow-hidden rounded-2xl border md:grid-cols-2 lg:grid-cols-3">
          {featureItems.map((item) => (
            <div
              key={item.title}
              className="group bg-card hover:bg-gradient-pale relative p-7 transition"
            >
              <div className="bg-foreground text-background mb-5 flex h-11 w-11 items-center justify-center rounded-xl">
                <Boxes className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold tracking-tight">{item.title}</h3>
              <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {testimonials.length > 0 && (
        <section className="border-border bg-muted/30 border-y py-24">
          <div className="mx-auto max-w-7xl px-6">
            <h2 className="text-3xl font-semibold tracking-tight">Trusted by growing teams</h2>
            <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {testimonials.map((t) => (
                <Card
                  key={`${t.author}-${t.company}`}
                  className="border-border bg-card p-6"
                >
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <p className="mt-4 text-sm font-medium">
                    {t.author}
                    <span className="text-muted-foreground"> · {t.company}</span>
                  </p>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      <section
        id="pricing"
        className="border-border bg-muted/40 border-t py-24"
      >
        <div className="mx-auto max-w-7xl px-6">
          <Badge
            variant="outline"
            className="border-border bg-background mx-auto mb-6 flex w-fit rounded-full"
          >
            Pricing
          </Badge>
          <MarketingPricingSection
            headline={pricingContent.headline}
            subhead={pricingContent.subhead}
            plans={plans}
            preference={preference}
            onPreferenceChange={updatePreference}
          />
        </div>
      </section>

      {faqItems.length > 0 && (
        <section
          id="faq"
          className="mx-auto max-w-7xl px-6 py-24"
        >
          <h2 className="text-3xl font-semibold tracking-tight">Frequently asked questions</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {faqItems.map((item) => (
              <Card
                key={item.q}
                className="border-border bg-card p-6"
              >
                <h3 className="font-semibold">{item.q}</h3>
                <p className="text-muted-foreground mt-2 text-sm">{item.a}</p>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-6 py-24">
        <Card className="border-border bg-foreground text-background relative overflow-hidden p-12 text-center">
          <div className="bg-gradient-mesh absolute inset-0 opacity-20" />
          <div className="relative">
            <Zap className="mx-auto mb-4 h-9 w-9" />
            <h3 className="text-3xl font-semibold tracking-tight">{cta.title}</h3>
            <p className="text-background/70 mx-auto mt-3 max-w-xl">{cta.subtitle}</p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Button
                size="lg"
                className="bg-background text-foreground hover:bg-background/90 h-12 rounded-xl px-7"
                asChild
              >
                {cta.primaryHref === '/login' ? (
                  <Link
                    to="/login"
                    search={loginSearch({ tab: 'signup' })}
                  >
                    {cta.primaryLabel}
                  </Link>
                ) : (
                  <Link to={cta.primaryHref}>{cta.primaryLabel}</Link>
                )}
              </Button>
              <Button
                size="lg"
                variant="ghost"
                className="text-background hover:bg-background/10 h-12 rounded-xl px-7"
                asChild
              >
                <Link to={cta.secondaryHref}>{cta.secondaryLabel}</Link>
              </Button>
            </div>
          </div>
        </Card>
      </section>

      <SiteFooter
        footer={siteContent.footer}
        contact={siteContent.contact}
      />
    </div>
  );
}
