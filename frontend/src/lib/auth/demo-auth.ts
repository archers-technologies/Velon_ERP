import { VELON_CONTACT_EMAIL } from "@velon/shared";

/** Super Admin email — password is verified only on the API (never stored in the web bundle). */
export const SUPER_ADMIN_EMAIL = VELON_CONTACT_EMAIL;

/** Legacy tenant demo password when API is disabled (dev fallback only). */
export const TENANT_DEMO_PASSWORD = "demo123";

export function normalizeAuthEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isSuperAdminEmail(email: string): boolean {
  return normalizeAuthEmail(email) === SUPER_ADMIN_EMAIL;
}
