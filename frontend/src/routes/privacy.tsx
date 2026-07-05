import { createFileRoute } from '@tanstack/react-router';
import { LegalPageFromCms } from '@/components/marketing/legal-page-from-cms';
import type { CmsLegalPage } from '@/lib/cms/defaults';
import { loadPublicSiteContentSafe } from '@/lib/cms/load-public';

export const Route = createFileRoute('/privacy')({
  loader: () => loadPublicSiteContentSafe(),
  head: () => ({
    meta: [
      { title: 'Privacy Policy · Velon-ERP' },
      {
        name: 'description',
        content: 'How Velon-ERP collects, uses, stores, and protects personal data.',
      },
    ],
  }),
  component: PrivacyPolicyPage,
});

function PrivacyPolicyPage() {
  const siteContent = Route.useLoaderData();
  const page = siteContent.privacy as unknown as CmsLegalPage;

  return (
    <LegalPageFromCms
      page={page}
      relatedLinks={[
        { label: 'Terms of Service', to: '/terms' },
        { label: 'Refund Policy', to: '/refund-policy' },
        { label: 'Contact', to: '/contact' },
        { label: 'Help Center', to: '/help' },
      ]}
    />
  );
}
