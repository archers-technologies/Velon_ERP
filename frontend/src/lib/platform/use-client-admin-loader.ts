import { useEffect, useRef, useState } from "react";
import { isApiEnabled } from "@/lib/api/config";
import { isAuthenticated } from "@/lib/auth/session";

/**
 * Admin route loaders skip API calls during SSR (no browser session).
 * Re-fetch once on the client when loader data looks like the SSR placeholder.
 */
export function useClientAdminLoader<T>(
  loaderData: T,
  reload: () => Promise<T>,
  isStale: (data: T) => boolean,
): T {
  const [data, setData] = useState(loaderData);
  const reloaded = useRef(false);

  useEffect(() => {
    setData(loaderData);
  }, [loaderData]);

  useEffect(() => {
    if (!isApiEnabled() || !isAuthenticated("admin")) return;
    if (!isStale(loaderData) || reloaded.current) return;
    reloaded.current = true;
    void reload()
      .then((next) => setData(next))
      .catch(() => undefined);
  }, [loaderData, reload, isStale]);

  return data;
}
