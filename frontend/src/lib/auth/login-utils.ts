/** Canonical `/login` search params for TanStack Router. */
export function loginSearch(opts?: { tab?: 'signin' | 'signup'; reset?: 'success' }) {
  return {
    tab: opts?.tab === 'signup' ? ('signup' as const) : ('signin' as const),
    reset: opts?.reset === 'success' ? ('success' as const) : undefined,
  };
}

export function isLocalApiNetworkError(err: unknown) {
  if (!import.meta.env.DEV) return false;
  if (err instanceof TypeError) return true;
  return err instanceof Error && /failed to fetch|network|load failed/i.test(err.message);
}

export function formatApiError(err: unknown, fallback = 'Request failed'): string {
  if (isLocalApiNetworkError(err)) {
    return 'Cannot reach the API. Run npm run dev (starts web + API) and wait until the terminal shows “Velon API listening on port 3001”.';
  }
  if (err instanceof Error && /Cannot (GET|POST|PATCH|DELETE) \/api/i.test(err.message)) {
    return 'API is outdated or not fully started. Stop all dev servers, run npm run dev, and wait for “Velon API listening on port 3001”.';
  }
  if (err instanceof Error && /^internal server error$/i.test(err.message.trim())) {
    return 'Cannot reach the API (port 3001). Close all terminals running npm run dev, then run npm run dev once and use a single local web origin.';
  }
  if (err instanceof Error && /unexpected error occurred/i.test(err.message)) {
    return 'API rejected the request (often CORS or API not fully started). Run npm run dev and wait for “Velon API listening on port 3001”.';
  }
  return err instanceof Error ? err.message : fallback;
}
