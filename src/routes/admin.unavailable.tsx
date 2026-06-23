import { createFileRoute, Link } from "@tanstack/react-router";
import { Construction } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/admin/unavailable")({
  validateSearch: (search: Record<string, unknown>) => ({
    feature: typeof search.feature === "string" ? search.feature : "This feature",
  }),
  head: () => ({
    meta: [{ title: "Feature unavailable · Velon Platform" }],
  }),
  component: AdminUnavailablePage,
});

function AdminUnavailablePage() {
  const { feature } = Route.useSearch();

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center justify-center gap-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Construction className="h-7 w-7" />
      </div>
      <Card className="w-full border-border bg-card p-8">
        <h1 className="text-xl font-semibold tracking-tight">{feature} is not available</h1>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          This platform module is not enabled in the current production build. Use Tenants,
          Subscriptions, Users, Alerts &amp; Logs, or Infrastructure for live administration.
        </p>
        <Button asChild className="mt-6" variant="default">
          <Link to="/admin">Back to platform overview</Link>
        </Button>
      </Card>
    </div>
  );
}
