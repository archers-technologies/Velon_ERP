import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type LegalSection = {
  id: string;
  title: string;
  content: ReactNode;
};

export function LegalPageLayout({
  label,
  title,
  description,
  effectiveDate,
  lastUpdated,
  sections,
  relatedLinks,
}: {
  label: string;
  title: string;
  description: string;
  effectiveDate: string;
  lastUpdated: string;
  sections: LegalSection[];
  relatedLinks: { label: string; to: string }[];
}) {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <section className="border-b border-border bg-gradient-hero">
        <div className="mx-auto max-w-4xl px-6 py-14">
          <Badge variant="outline" className="rounded-full border-border bg-background/80">
            {label}
          </Badge>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">{title}</h1>
          <p className="mt-4 text-muted-foreground">{description}</p>
          <p className="mt-3 text-xs text-muted-foreground">
            Effective: {effectiveDate} · Last updated: {lastUpdated}
          </p>
        </div>
      </section>

      <main className="mx-auto grid max-w-7xl gap-10 px-6 py-12 lg:grid-cols-[240px_1fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Card className="border-border bg-card p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              On this page
            </p>
            <nav className="flex flex-col gap-1 text-sm">
              {sections.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="rounded-md px-2 py-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                  {s.title}
                </a>
              ))}
            </nav>
            <div className="mt-4 border-t border-border pt-4 text-xs text-muted-foreground">
              Related:
              <ul className="mt-2 space-y-1">
                {relatedLinks.map((l) => (
                  <li key={l.to}>
                    <Link to={l.to} className="font-medium text-foreground hover:underline">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        </aside>

        <article className="min-w-0 space-y-10">
          {sections.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-24">
              <h2 className="text-xl font-semibold tracking-tight">{section.title}</h2>
              <div
                className={cn(
                  "prose prose-sm mt-4 max-w-none text-muted-foreground",
                  "prose-headings:text-foreground prose-strong:text-foreground",
                  "prose-a:text-foreground prose-a:underline prose-a:underline-offset-4",
                  "prose-li:marker:text-muted-foreground",
                )}
              >
                {section.content}
              </div>
            </section>
          ))}
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
