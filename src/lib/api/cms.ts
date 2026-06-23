import { apiFetch } from "@/lib/api/client";
import { loadPublicSiteContentSafe } from "@/lib/cms/load-public";

export type SiteContentKey =
  | "hero"
  | "features"
  | "pricing"
  | "faq"
  | "testimonials"
  | "footer"
  | "contact"
  | "about"
  | "cta"
  | "privacy"
  | "terms"
  | "refundPolicy";

export async function loadPublicSiteContent() {
  return loadPublicSiteContentSafe();
}

export async function loadSiteContent() {
  return apiFetch<Record<string, unknown>>("/platform/site-content");
}

export async function updateSiteContentBlock(key: SiteContentKey, data: unknown) {
  return apiFetch(`/platform/site-content/${key}`, {
    method: "PATCH",
    body: JSON.stringify({ data }),
  });
}
