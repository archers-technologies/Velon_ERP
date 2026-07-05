import { useEffect, useRef, useState } from 'react';
import { useRouter } from '@tanstack/react-router';
import { apiGetPlatformSync } from '@/lib/api/client';
import { isApiEnabled } from '@/lib/api/config';

export type PlatformSyncState = {
  revision: number;
  postgresConnected: boolean;
  updatedAt: string | null;
  events: { at: string; kind: string; summary: string; entityId?: string }[];
};

/** Polls Postgres-backed platform revision; invalidates route loaders on change. */
export function usePlatformRealtime(enabled = true, intervalMs = 2500) {
  const router = useRouter();
  const revisionRef = useRef<number | null>(null);
  const [sync, setSync] = useState<PlatformSyncState>({
    revision: 0,
    postgresConnected: false,
    updatedAt: null,
    events: [],
  });

  useEffect(() => {
    if (!enabled || !isApiEnabled()) return;
    let cancelled = false;

    const tick = async () => {
      try {
        const s = await apiGetPlatformSync();
        const state: PlatformSyncState = {
          revision: s.revision,
          postgresConnected: s.postgresConnected,
          updatedAt: s.updatedAt,
          events: s.events,
        };
        if (cancelled) return;
        setSync(state);
        if (revisionRef.current !== null && state.revision > revisionRef.current) {
          void router.invalidate();
        }
        revisionRef.current = state.revision;
      } catch {
        /* polling is best-effort */
      }
    };

    void tick();
    const id = setInterval(tick, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [enabled, intervalMs, router]);

  return sync;
}
