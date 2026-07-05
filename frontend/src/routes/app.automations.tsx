import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/app/automations")({
  component: AutomationsPage,
});

function AutomationsPage() {
  return (
    <div className="space-y-3">
      {[
        { r: "If stock below threshold -> notify inventory manager", s: "active" },
        { r: "If invoice overdue -> send reminder email and WhatsApp", s: "active" },
        { r: "If branch sales drop > 20% -> notify owner", s: "draft" },
      ].map((rule) => (
        <Card key={rule.r} className="border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">{rule.r}</div>
            <Badge variant="outline" className="border-border text-[10px]">
              {rule.s}
            </Badge>
          </div>
        </Card>
      ))}
    </div>
  );
}
