import { createFileRoute } from "@tanstack/react-router";
import { guardDisabledAdminPath } from "@/lib/auth/production-routes";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/integrations")({
  beforeLoad: ({ location }) => {
    guardDisabledAdminPath(location.pathname);
  },
  component: AdminIntegrationsPage,
});

function AdminIntegrationsPage() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {[
        { n: "Stripe · Billing", s: "connected" },
        { n: "SendGrid · Email", s: "connected" },
        { n: "Twilio · SMS", s: "degraded" },
        { n: "WhatsApp Cloud API", s: "connected" },
        { n: "Outbound webhooks", s: "connected" },
        { n: "SSO · OIDC sandbox", s: "setup" },
      ].map((item) => (
        <Card
          key={item.n}
          className="flex items-center justify-between gap-4 border-border bg-card p-5"
        >
          <div>
            <div className="font-medium">{item.n}</div>
            <Badge
              variant="outline"
              className={`mt-2 border-border capitalize ${
                item.s === "connected"
                  ? "bg-success/10 text-success border-success/20"
                  : item.s === "degraded"
                    ? "border-warning/30 bg-warning/15 text-warning-foreground"
                    : "text-muted-foreground"
              }`}
            >
              {item.s}
            </Badge>
          </div>
          <Button size="sm" variant="outline" className="rounded-lg shrink-0">
            Configure
          </Button>
        </Card>
      ))}
    </div>
  );
}
