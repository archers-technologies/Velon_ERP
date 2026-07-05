import { Card } from "@/components/ui/card";
import { WORKSPACE_ROLE_PRESETS } from "@velon/shared";
import { Shield } from "lucide-react";

/** Visual guide for simple role presets in workspace admin. */
export function RolePresetsGuide() {
  return (
    <Card className="border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <Shield className="h-4 w-4 text-primary" />
        <h2 className="font-semibold">Role presets</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Pick a simple role when inviting someone. You can change it anytime.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {WORKSPACE_ROLE_PRESETS.filter((p) => p.id !== "owner").map((preset) => (
          <div
            key={preset.id}
            className="rounded-lg border border-border bg-muted/20 p-3 text-sm"
          >
            <p className="font-medium">{preset.label}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{preset.description}</p>
            <p className="mt-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Can access
            </p>
            <p className="mt-0.5 text-xs">{preset.highlights.join(" · ")}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
