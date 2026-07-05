import { createFileRoute } from '@tanstack/react-router';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { guardDisabledAdminPath } from '@/lib/auth/production-routes';

export const Route = createFileRoute('/admin/integrations')({
  beforeLoad: ({ location }) => {
    guardDisabledAdminPath(location.pathname);
  },
  component: AdminIntegrationsPage,
});

function AdminIntegrationsPage() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {[
        { n: 'Stripe · Billing', s: 'connected' },
        { n: 'SendGrid · Email', s: 'connected' },
        { n: 'Twilio · SMS', s: 'degraded' },
        { n: 'WhatsApp Cloud API', s: 'connected' },
        { n: 'Outbound webhooks', s: 'connected' },
        { n: 'SSO · OIDC sandbox', s: 'setup' },
      ].map((item) => (
        <Card
          key={item.n}
          className="border-border bg-card flex items-center justify-between gap-4 p-5"
        >
          <div>
            <div className="font-medium">{item.n}</div>
            <Badge
              variant="outline"
              className={`border-border mt-2 capitalize ${
                item.s === 'connected'
                  ? 'bg-success/10 text-success border-success/20'
                  : item.s === 'degraded'
                    ? 'border-warning/30 bg-warning/15 text-warning-foreground'
                    : 'text-muted-foreground'
              }`}
            >
              {item.s}
            </Badge>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="shrink-0 rounded-lg"
          >
            Configure
          </Button>
        </Card>
      ))}
    </div>
  );
}
