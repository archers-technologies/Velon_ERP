import { LegalPageLayout } from "@/components/legal-page-layout";
import type { CmsLegalPage } from "@/lib/cms/defaults";

export function LegalPageFromCms({
  page,
  relatedLinks,
}: {
  page: CmsLegalPage;
  relatedLinks: { label: string; to: string }[];
}) {
  return (
    <LegalPageLayout
      label="Legal"
      title={page.title}
      description={page.description}
      effectiveDate={page.effectiveDate}
      lastUpdated={page.lastUpdated}
      sections={page.sections.map((section) => ({
        id: section.id,
        title: section.title,
        content: section.body.split("\n\n").map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        )),
      }))}
      relatedLinks={relatedLinks}
    />
  );
}
