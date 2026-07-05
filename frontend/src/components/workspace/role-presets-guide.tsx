import { Shield } from 'lucide-react';
import { WORKSPACE_ROLE_PRESETS } from '@velon/shared';
import { Card } from '@/components/ui/card';

/** Visual guide for simple role presets in workspace admin. */
export function RolePresetsGuide() {
  return (
    <Card className="border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <Shield className="text-primary h-4 w-4" />
        <h2 className="font-semibold">Role presets</h2>
      </div>
      <p className="text-muted-foreground mt-1 text-sm">
        Pick a simple role when inviting someone. You can change it anytime.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {WORKSPACE_ROLE_PRESETS.filter((p) => p.id !== 'owner').map((preset) => (
          <div
            key={preset.id}
            className="border-border bg-muted/20 rounded-lg border p-3 text-sm"
          >
            <p className="font-medium">{preset.label}</p>
            <p className="text-muted-foreground mt-0.5 text-xs">{preset.description}</p>
            <p className="text-muted-foreground mt-2 text-[10px] font-medium tracking-wider uppercase">
              Can access
            </p>
            <p className="mt-0.5 text-xs">{preset.highlights.join(' · ')}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
