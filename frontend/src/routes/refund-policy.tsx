import { createFileRoute } from '@tanstack/react-router';
import { LegalPageFromCms } from '@/components/marketing/legal-page-from-cms';
import type { CmsLegalPage } from '@/lib/cms/defaults';
import { loadPublicSiteContentSafe } from '@/lib/cms/load-public';

export const Route = createFileRoute('/refund-policy')({
  loader: () => loadPublicSiteContentSafe(),
  head: () => ({
    meta: [
      { title: 'Refund Policy · Velon-ERP' },
      {
        name: 'description',
        content: 'Refund eligibility and process for Velon-ERP subscriptions.',
      },
    ],
  }),
  component: RefundPolicyPage,
});

function RefundPolicyPage() {
  const siteContent = Route.useLoaderData();
  const page = siteContent.refundPolicy as unknown as CmsLegalPage;

  return (
    <LegalPageFromCms
      page={page}
      relatedLinks={[
        { label: 'Terms of Service', to: '/terms' },
        { label: 'Privacy Policy', to: '/privacy' },
        { label: 'Contact', to: '/contact' },
      ]}
    />
  );
}
