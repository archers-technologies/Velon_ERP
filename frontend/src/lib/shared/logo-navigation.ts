export type LogoNav =
  | { type: "home" }
  | { type: "workspace" }
  | { type: "external"; href: string }
  | { type: "inactive" };

export function normalizeExternalUrl(url: string | null | undefined): string | null {
  const trimmed = url?.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

/** Velon marketing site origin (same app in dev; production marketing domain when deployed). */
export function marketingSiteOrigin(): string {
  if (typeof window !== "undefined") return window.location.origin;
  return "/";
}
