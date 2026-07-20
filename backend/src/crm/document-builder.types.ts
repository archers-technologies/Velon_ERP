import { randomUUID } from 'crypto';

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
  /** Plain text or HTML-ish content from TipTap */
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
  return randomUUID();
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
  const sections: DocumentSectionType[] = [
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
    sections: sections.map((type, index) => {
      if (type === 'COVER') {
        return createSection(type, coverTitle ?? 'Quotation');
      }
      if (type === 'EXECUTIVE_SUMMARY' && index === 1) {
        return createSection(type, undefined, 'Provide a concise overview of this quotation.');
      }
      return createSection(type);
    }),
  };
}

export function defaultProposalDocument(coverTitle?: string): DocumentBody {
  const sections: DocumentSectionType[] = [
    'COVER',
    'EXECUTIVE_SUMMARY',
    'ABOUT_COMPANY',
    'CLIENT_REQUIREMENTS',
    'PROPOSED_SOLUTION',
    'METHODOLOGY',
    'SCOPE_OF_WORK',
    'DELIVERABLES',
    'TIMELINE',
    'TEAM',
    'CASE_STUDY',
    'COMMERCIAL',
    'TERMS',
    'SIGNATURE',
  ];

  return {
    version: 1,
    sections: sections.map((type, index) => {
      if (type === 'COVER') {
        return createSection(type, coverTitle ?? 'Proposal');
      }
      if (type === 'EXECUTIVE_SUMMARY' && index === 1) {
        return createSection(type, undefined, 'Provide a concise overview of this proposal.');
      }
      return createSection(type);
    }),
  };
}
