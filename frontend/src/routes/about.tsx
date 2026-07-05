import { createFileRoute } from "@tanstack/react-router";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { Card } from "@/components/ui/card";
import { loadPublicSiteContentSafe } from "@/lib/cms/load-public";

export const Route = createFileRoute("/about")({
  loader: () => loadPublicSiteContentSafe(),
  component: AboutPage,
});

function AboutPage() {
  const siteContent = Route.useLoaderData();
  const about = siteContent.about;

  return (
    <MarketingPageShell
      label={about.label}
      title={about.title}
      description={about.description}
      siteContent={siteContent}
    >
      <div className="grid gap-4 md:grid-cols-3">
        {about.sections.map((section) => (
          <Card key={section.title} className="border-border bg-card p-6">
            <h3 className="text-lg font-semibold">{section.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{section.body}</p>
          </Card>
        ))}
      </div>
    </MarketingPageShell>
  );
}
