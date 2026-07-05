import type { ReactNode } from 'react';
import { SiteFooter } from '@/components/marketing/site-footer';
import { SiteHeader } from '@/components/marketing/site-header';
import { Badge } from '@/components/ui/badge';
import type { PublicSiteContent } from '@/lib/cms/load-public';

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
    <div className="bg-background min-h-screen">
      <SiteHeader />
      <section className="border-border bg-gradient-hero border-b">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <Badge
            variant="outline"
            className="border-border bg-background/80 rounded-full"
          >
            {label}
          </Badge>
          <h1 className="mt-4 max-w-3xl text-5xl font-semibold tracking-tight">{title}</h1>
          <p className="text-muted-foreground mt-4 max-w-2xl">{description}</p>
        </div>
      </section>
      <main className="mx-auto max-w-7xl px-6 py-14">{children}</main>
      <SiteFooter
        footer={siteContent?.footer}
        contact={siteContent?.contact}
      />
    </div>
  );
}
