import { useEffect, useRef, useState } from 'react';
import { isApiEnabled } from '@/lib/api/config';
import { isAuthenticated } from '@/lib/auth/session';

/**
 * Workspace route loaders skip API calls during SSR (no browser session).
 * Re-fetch once on the client when loader data looks like the SSR placeholder.
 */
export function useClientWorkspaceLoader<T>(
  loaderData: T,
  reload: () => Promise<T>,
  isStale: (data: T) => boolean,
): { data: T; isReloading: boolean; error: Error | null } {
  const [data, setData] = useState(loaderData);
  const [isReloading, setIsReloading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const reloaded = useRef(false);

  useEffect(() => {
    setData(loaderData);
  }, [loaderData]);

  useEffect(() => {
    if (!isApiEnabled() || !isAuthenticated('app')) return;
    if (!isStale(loaderData) || reloaded.current) return;
    reloaded.current = true;
    setIsReloading(true);
    setError(null);
    void reload()
      .then((next) => setData(next))
      .catch((err) => {
        setError(err instanceof Error ? err : new Error('Failed to load workspace data'));
      })
      .finally(() => setIsReloading(false));
  }, [loaderData, reload, isStale]);

  return { data, isReloading, error };
}
