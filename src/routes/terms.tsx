import { createFileRoute } from "@tanstack/react-router";
import { LegalPageFromCms } from "@/components/legal-page-from-cms";
import { loadPublicSiteContentSafe } from "@/lib/cms/load-public";
import type { CmsLegalPage } from "@/lib/cms/defaults";

export const Route = createFileRoute("/terms")({
  loader: () => loadPublicSiteContentSafe(),
  head: () => ({
    meta: [
      { title: "Terms of Service · Velon-ERP" },
      {
        name: "description",
        content: "Terms of Service and Acceptable Use for Velon-ERP.",
      },
    ],
  }),
  component: TermsOfServicePage,
});

function TermsOfServicePage() {
  const siteContent = Route.useLoaderData();
  const page = siteContent.terms as unknown as CmsLegalPage;

  return (
    <LegalPageFromCms
      page={page}
      relatedLinks={[
        { label: "Privacy Policy", to: "/privacy" },
        { label: "Refund Policy", to: "/refund-policy" },
        { label: "Contact", to: "/contact" },
        { label: "Help Center", to: "/help" },
      ]}
    />
  );
}
