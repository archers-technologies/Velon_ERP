import { createFileRoute, Link } from "@tanstack/react-router";
import { Construction } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { loginSearch } from "@/lib/auth/login-utils";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";

export const Route = createFileRoute("/unavailable")({
  validateSearch: (search: Record<string, unknown>) => ({
    feature: typeof search.feature === "string" ? search.feature : "This page",
  }),
  head: () => ({
    meta: [{ title: "Unavailable · Velon-ERP" }],
  }),
  component: UnavailablePage,
});

function UnavailablePage() {
  const { feature } = Route.useSearch();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Construction className="h-7 w-7" />
        </div>
        <Card className="mt-6 max-w-lg border-border bg-card p-8 text-center">
          <h1 className="text-xl font-semibold tracking-tight">{feature} is not available</h1>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
            This preview page is not part of the production Velon ERP workspace. Sign up or sign in
            to access your company workspace, CRM, inventory, and billing.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild>
              <Link to="/login" search={loginSearch({ tab: "signup" })}>
                Create workspace
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/">Back to home</Link>
            </Button>
          </div>
        </Card>
      </main>
      <SiteFooter />
    </div>
  );
}
