import { createFileRoute } from '@tanstack/react-router';
import { ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { guardDisabledAdminPath } from '@/lib/auth/production-routes';

export const Route = createFileRoute('/admin/compliance')({
  beforeLoad: ({ location }) => {
    guardDisabledAdminPath(location.pathname);
  },
  component: AdminCompliancePage,
});

function AdminCompliancePage() {
  return (
    <div className="space-y-6">
      <Card className="border-border bg-gradient-pale flex items-start gap-4 p-6">
        <div className="bg-foreground text-background flex h-12 w-12 items-center justify-center rounded-xl">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <div>
          <div className="text-lg font-semibold">Compliance posture</div>
          <p className="text-muted-foreground mt-1 text-sm">
            Automated checks for SOC2 readiness, GDPR DPA signatures, and retention policies.
          </p>
          <Badge className="bg-foreground text-background hover:bg-foreground mt-3">
            Last audit snapshot · OK
          </Badge>
        </div>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        {[
          ['Data residency', 'EU · IN partitions enabled'],
          ['Encryption at rest', 'AES-256 · managed keys rotated'],
          ['Access logs', '90-day retention · WORM backups'],
          ['Subprocessor registry', '12 vendors · 2 pending review'],
        ].map(([t, d]) => (
          <Card
            key={t}
            className="border-border bg-card p-5"
          >
            <div className="text-sm font-semibold">{t}</div>
            <div className="text-muted-foreground mt-2 text-sm">{d}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}
