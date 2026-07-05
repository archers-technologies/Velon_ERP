import { Construction } from "lucide-react";
import { Card } from "@/components/ui/card";

export function ComingSoonBanner({ module }: { module: string }) {
  return (
    <Card className="border-amber-500/30 bg-amber-500/5 p-4">
      <div className="flex items-start gap-3">
        <Construction className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div>
          <p className="text-sm font-medium text-foreground">{module} — coming soon</p>
          <p className="mt-1 text-sm text-muted-foreground">
            This workspace uses demo data while the live {module.toLowerCase()} module is being
            wired. Navigation stays visible so you can preview the layout.
          </p>
        </div>
      </div>
    </Card>
  );
}
