import { createFileRoute } from "@tanstack/react-router";
import { guardDisabledAdminPath } from "@/lib/auth/production-routes";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/admin/compliance")({
  beforeLoad: ({ location }) => {
    guardDisabledAdminPath(location.pathname);
  },
  component: AdminCompliancePage,
});

function AdminCompliancePage() {
  return (
    <div className="space-y-6">
      <Card className="flex items-start gap-4 border-border bg-gradient-pale p-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-foreground text-background">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <div>
          <div className="text-lg font-semibold">Compliance posture</div>
          <p className="mt-1 text-sm text-muted-foreground">
            Automated checks for SOC2 readiness, GDPR DPA signatures, and retention policies.
          </p>
          <Badge className="mt-3 bg-foreground text-background hover:bg-foreground">
            Last audit snapshot · OK
          </Badge>
        </div>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        {[
          ["Data residency", "EU · IN partitions enabled"],
          ["Encryption at rest", "AES-256 · managed keys rotated"],
          ["Access logs", "90-day retention · WORM backups"],
          ["Subprocessor registry", "12 vendors · 2 pending review"],
        ].map(([t, d]) => (
          <Card key={t} className="border-border bg-card p-5">
            <div className="text-sm font-semibold">{t}</div>
            <div className="mt-2 text-sm text-muted-foreground">{d}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}
