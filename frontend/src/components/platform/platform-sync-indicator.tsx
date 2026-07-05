import { Database, Radio } from 'lucide-react';
import { usePlatformRealtime } from '@/hooks/use-platform-realtime';
import { cn } from '@/lib/utils';

/** Live Postgres sync badge for admin / workspace shells. */
export function PlatformSyncIndicator({ className }: { className?: string }) {
  const sync = usePlatformRealtime(true, 2500);

  if (!sync.postgresConnected) {
    return (
      <span
        className={cn(
          'border-border bg-muted/50 text-muted-foreground hidden items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] lg:inline-flex',
          className,
        )}
        title="Start API + Postgres (npm run dev:all) and set VITE_API_URL"
      >
        <Database
          className="h-3 w-3 opacity-60"
          aria-hidden
        />
        API offline
      </span>
    );
  }

  return (
    <span
      className={cn(
        'border-success/25 bg-success/10 text-success hidden items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-medium lg:inline-flex',
        className,
      )}
      title={
        sync.updatedAt
          ? `Live · Postgres · rev ${sync.revision} · ${sync.updatedAt}`
          : `Live · Postgres · rev ${sync.revision}`
      }
    >
      <Radio
        className="h-3 w-3 animate-pulse"
        aria-hidden
      />
      Live · Postgres
    </span>
  );
}
