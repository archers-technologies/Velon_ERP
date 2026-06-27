const sameOriginApi =
  import.meta.env.DEV || String(import.meta.env.VITE_API_SAME_ORIGIN ?? "") === "true";

const rawApiUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim() ?? "";

function stripTrailingSlash(value: string): string {
  return value.replace(/\/$/, "");
}

function resolveApiRootFromEnv(urlValue: string): string {
  const normalized = stripTrailingSlash(urlValue);
  if (!normalized) return "";
  try {
    const url = new URL(normalized);
    const pathname = url.pathname.replace(/\/$/, "");
    // If VITE_API_URL is just an origin, default to `/api` mount.
    if (!pathname) return `${url.origin}/api`;
    return `${url.origin}${pathname}`;
  } catch {
    return normalized;
  }
}

/** In dev / Railway combined stack, use same-origin + proxy (/api → internal API). */
export const API_BASE_URL = sameOriginApi ? "" : stripTrailingSlash(rawApiUrl);
export const API_ROOT = sameOriginApi ? "/api" : resolveApiRootFromEnv(rawApiUrl);
export const API_V1_BASE = `${API_ROOT}/v1`;

export function isApiEnabled(): boolean {
  return sameOriginApi || Boolean(rawApiUrl);
}
