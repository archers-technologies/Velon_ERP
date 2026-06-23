import type { ReactNode } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Badge } from "@/components/ui/badge";
import type { PublicSiteContent } from "@/lib/cms/load-public";

export function MarketingPageShell({
  label,
  title,
  description,
  siteContent,
  children,
}: {
  label: string;
  title: string;
  description: string;
  siteContent?: PublicSiteContent;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <section className="border-b border-border bg-gradient-hero">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <Badge variant="outline" className="rounded-full border-border bg-background/80">
            {label}
          </Badge>
          <h1 className="mt-4 max-w-3xl text-5xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-4 max-w-2xl text-muted-foreground">{description}</p>
        </div>
      </section>
      <main className="mx-auto max-w-7xl px-6 py-14">{children}</main>
      <SiteFooter footer={siteContent?.footer} contact={siteContent?.contact} />
    </div>
  );
}
