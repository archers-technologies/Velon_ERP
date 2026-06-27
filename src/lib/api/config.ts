const sameOriginApi =
  import.meta.env.DEV || String(import.meta.env.VITE_API_SAME_ORIGIN ?? "") === "true";

/** In dev / Railway combined stack, use same-origin + proxy (/api → internal API). */
export const API_BASE_URL = sameOriginApi
  ? ""
  : ((import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ?? "");

export function isApiEnabled(): boolean {
  return (
    sameOriginApi || Boolean((import.meta.env.VITE_API_URL as string | undefined)?.trim())
  );
}
