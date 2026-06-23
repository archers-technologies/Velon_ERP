/** In dev, use same-origin + Vite proxy (/api → localhost:3001) to avoid CORS and port mismatches. */
export const API_BASE_URL = import.meta.env.DEV
  ? ""
  : ((import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ?? "");

export function isApiEnabled(): boolean {
  return import.meta.env.DEV || Boolean((import.meta.env.VITE_API_URL as string | undefined)?.trim());
}
