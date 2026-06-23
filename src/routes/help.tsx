import { createFileRoute } from "@tanstack/react-router";
import { loadPublicSiteContentSafe } from "@/lib/cms/load-public";
import { MarketingPageShell } from "@/components/marketing-page-shell";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/help")({
  loader: () => loadPublicSiteContentSafe(),
  component: HelpPage,
});

function HelpPage() {
  const siteContent = Route.useLoaderData();
  const faqItems = siteContent.faq.items;

  return (
    <MarketingPageShell
      label="Help Center"
      title="Answers for setup, billing and daily operations"
      description="Guides for trial onboarding, role setup, module usage and subscription lifecycle."
      siteContent={siteContent}
    >
      <Card className="mx-auto max-w-4xl border-border bg-card p-6">
        <Accordion type="single" collapsible className="w-full">
          {faqItems.map((item, index) => (
            <AccordionItem key={item.q} value={`faq-${index}`}>
              <AccordionTrigger>{item.q}</AccordionTrigger>
              <AccordionContent>{item.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Card>
    </MarketingPageShell>
  );
}
