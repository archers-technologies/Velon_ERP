import { authFetch } from '@/lib/api/client';
import { isApiEnabled } from '@/lib/api/config';
import { CMS_DEFAULTS } from '@/lib/cms/defaults';

export type PublicSiteContent = typeof CMS_DEFAULTS;

export async function loadPublicSiteContentSafe(): Promise<PublicSiteContent> {
  if (!isApiEnabled()) return CMS_DEFAULTS;
  try {
    const raw = await authFetch<Record<string, unknown>>('/public/site-content');
    return {
      hero: { ...CMS_DEFAULTS.hero, ...(raw.hero as object) },
      features: { ...CMS_DEFAULTS.features, ...(raw.features as object) },
      pricing: { ...CMS_DEFAULTS.pricing, ...(raw.pricing as object) },
      faq: { ...CMS_DEFAULTS.faq, ...(raw.faq as object) },
      testimonials: { ...CMS_DEFAULTS.testimonials, ...(raw.testimonials as object) },
      footer: { ...CMS_DEFAULTS.footer, ...(raw.footer as object) },
      contact: { ...CMS_DEFAULTS.contact, ...(raw.contact as object) },
      about: { ...CMS_DEFAULTS.about, ...(raw.about as object) },
      cta: { ...CMS_DEFAULTS.cta, ...(raw.cta as object) },
      privacy: { ...CMS_DEFAULTS.privacy, ...(raw.privacy as object) },
      terms: { ...CMS_DEFAULTS.terms, ...(raw.terms as object) },
      refundPolicy: { ...CMS_DEFAULTS.refundPolicy, ...(raw.refundPolicy as object) },
    };
  } catch {
    return CMS_DEFAULTS;
  }
}
