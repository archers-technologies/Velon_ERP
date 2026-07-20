export type DocumentSectionType =
  | 'COVER'
  | 'EXECUTIVE_SUMMARY'
  | 'SCOPE_OF_WORK'
  | 'DELIVERABLES'
  | 'TIMELINE'
  | 'PRICING'
  | 'ASSUMPTIONS'
  | 'EXCLUSIONS'
  | 'TERMS'
  | 'ACCEPTANCE'
  | 'SIGNATURE'
  | 'ABOUT_COMPANY'
  | 'CLIENT_REQUIREMENTS'
  | 'PROPOSED_SOLUTION'
  | 'METHODOLOGY'
  | 'TEAM'
  | 'CASE_STUDY'
  | 'COMMERCIAL'
  | 'CUSTOM'
  | 'ATTACHMENTS';

export type DocumentSection = {
  id: string;
  type: DocumentSectionType;
  title: string;
  body: string;
  visible: boolean;
};

export type DocumentBody = {
  version: 1;
  sections: DocumentSection[];
};

const SECTION_TITLES: Record<DocumentSectionType, string> = {
  COVER: 'Cover',
  EXECUTIVE_SUMMARY: 'Executive Summary',
  SCOPE_OF_WORK: 'Scope of Work',
  DELIVERABLES: 'Deliverables',
  TIMELINE: 'Timeline',
  PRICING: 'Pricing',
  ASSUMPTIONS: 'Assumptions',
  EXCLUSIONS: 'Exclusions',
  TERMS: 'Terms & Conditions',
  ACCEPTANCE: 'Acceptance',
  SIGNATURE: 'Signature',
  ABOUT_COMPANY: 'About Our Company',
  CLIENT_REQUIREMENTS: 'Client Requirements',
  PROPOSED_SOLUTION: 'Proposed Solution',
  METHODOLOGY: 'Methodology',
  TEAM: 'Our Team',
  CASE_STUDY: 'Case Study',
  COMMERCIAL: 'Commercial Terms',
  CUSTOM: 'Custom Section',
  ATTACHMENTS: 'Attachments',
};

function newSectionId(): string {
  return crypto.randomUUID();
}

function createSection(
  type: DocumentSectionType,
  title?: string,
  body = '',
  visible = true,
): DocumentSection {
  return {
    id: newSectionId(),
    type,
    title: title ?? SECTION_TITLES[type],
    body,
    visible,
  };
}

export function defaultQuotationDocument(coverTitle?: string): DocumentBody {
  const types: DocumentSectionType[] = [
    'COVER',
    'EXECUTIVE_SUMMARY',
    'SCOPE_OF_WORK',
    'DELIVERABLES',
    'TIMELINE',
    'PRICING',
    'ASSUMPTIONS',
    'EXCLUSIONS',
    'TERMS',
    'ACCEPTANCE',
    'SIGNATURE',
  ];

  return {
    version: 1,
    sections: types.map((type, index) => {
      if (type === 'COVER') return createSection(type, coverTitle ?? 'Quotation');
      if (type === 'EXECUTIVE_SUMMARY' && index === 1) {
        return createSection(type, undefined, 'Provide a concise overview of this quotation.');
      }
      return createSection(type);
    }),
  };
}

export function parseQuotationDocument(input: {
  documentJson?: DocumentBody | Record<string, unknown> | null;
  coverTitle?: string | null;
  executiveSummary?: string | null;
  scopeOfWork?: string | null;
  deliverables?: string | null;
  timeline?: string | null;
  assumptions?: string | null;
  exclusions?: string | null;
  terms?: string | null;
  notes?: string | null;
}): DocumentBody {
  const raw = input.documentJson;
  if (raw && typeof raw === 'object' && Array.isArray((raw as DocumentBody).sections)) {
    return raw as DocumentBody;
  }

  const doc = defaultQuotationDocument(input.coverTitle ?? undefined);
  const legacy: Partial<Record<DocumentSectionType, string | null | undefined>> = {
    COVER: input.coverTitle,
    EXECUTIVE_SUMMARY: input.executiveSummary ?? input.notes,
    SCOPE_OF_WORK: input.scopeOfWork,
    DELIVERABLES: input.deliverables,
    TIMELINE: input.timeline,
    ASSUMPTIONS: input.assumptions,
    EXCLUSIONS: input.exclusions,
    TERMS: input.terms,
  };

  return {
    ...doc,
    sections: doc.sections.map((section) => {
      const value = legacy[section.type];
      if (value?.trim()) {
        return {
          ...section,
          body: value,
          ...(section.type === 'COVER' ? { title: value } : {}),
        };
      }
      return section;
    }),
  };
}

export function syncLegacyFieldsFromDocument(document: DocumentBody) {
  const find = (type: DocumentSectionType) => document.sections.find((s) => s.type === type);
  const body = (type: DocumentSectionType) => find(type)?.body?.trim() || undefined;
  const cover = find('COVER');

  return {
    coverTitle: cover?.title?.trim() || undefined,
    executiveSummary: body('EXECUTIVE_SUMMARY'),
    scopeOfWork: body('SCOPE_OF_WORK'),
    deliverables: body('DELIVERABLES'),
    timeline: body('TIMELINE'),
    assumptions: body('ASSUMPTIONS'),
    exclusions: body('EXCLUSIONS'),
    terms: body('TERMS'),
    notes: body('EXECUTIVE_SUMMARY'),
  };
}
