import { Injectable } from "@nestjs/common";
import { Prisma } from "@velon/database";
import {
  VELON_CONTACT_ADDRESS,
  VELON_CONTACT_EMAIL,
  VELON_CONTACT_PHONE,
} from "@velon/shared";
import { PrismaService } from "../prisma/prisma.service";

export const SITE_CONTENT_KEYS = [
  "hero",
  "features",
  "pricing",
  "faq",
  "testimonials",
  "footer",
  "contact",
  "about",
  "cta",
  "privacy",
  "terms",
  "refundPolicy",
] as const;

export type SiteContentKey = (typeof SITE_CONTENT_KEYS)[number];

const DEFAULTS: Record<SiteContentKey, Prisma.JsonValue> = {
  hero: {
    title: "Run your business from one command center",
    subtitle: "Velon ERP unifies CRM, billing, inventory, and finance for modern teams.",
    cta: "Start free trial",
    ctaSecondary: "View pricing",
    badge: "Velon-ERP · Production-ready workspace platform",
  },
  features: {
    headline: "Everything your team needs to run the business",
    subhead:
      "Manage your workspace, team, and customer relationships from one secure tenant environment.",
    items: [
      { title: "Workspace admin", description: "Users, departments, seats, and audit in one place." },
      { title: "CRM & quotations", description: "Leads, pipelines, and professional proposals." },
      { title: "Tenant isolation", description: "Every company's data is scoped and secured." },
    ],
  },
  pricing: {
    headline: "Simple, transparent pricing",
    subhead: "Choose a plan that fits your team size.",
  },
  faq: {
    items: [
      { q: "How do I invite my team?", a: "Go to Settings → Admin → Invitations after signing up." },
      { q: "Can I upgrade my plan?", a: "Contact support or upgrade from the admin panel." },
      { q: "Is my data isolated?", a: "Yes — every tenant has strict data isolation." },
    ],
  },
  testimonials: {
    items: [
      { quote: "Velon gave us a real ERP feel from day one.", author: "Operations Lead", company: "Acme Co" },
    ],
  },
  footer: {
    tagline: "Velon-ERP",
    email: VELON_CONTACT_EMAIL,
    links: [
      { label: "Features", href: "/features" },
      { label: "Pricing", href: "/pricing" },
      { label: "Contact", href: "/contact" },
    ],
  },
  contact: {
    headline: "Get in touch",
    email: VELON_CONTACT_EMAIL,
    phone: VELON_CONTACT_PHONE,
    address: VELON_CONTACT_ADDRESS,
  },
  about: {
    label: "About Velon",
    title: "Building the modern Business Command Center",
    description:
      "Velon-ERP is designed as a premium, AI-ready ERP platform that reduces tool sprawl and improves operational clarity.",
    sections: [
      {
        title: "Our Mission",
        body: "Help growing businesses run inventory, billing, finance and customer workflows from one clean interface.",
      },
      {
        title: "Our Approach",
        body: "Role-based dashboards, high-contrast UX, proactive alerts and modular architecture for global scale.",
      },
      {
        title: "Our Commitment",
        body: "Enterprise-grade reliability with phase-wise delivery from premium frontend to full intelligence workflows.",
      },
    ],
  },
  cta: {
    title: "Your business, on autopilot.",
    subtitle: "Switch from spreadsheets to a real Business Operating System in minutes.",
    primaryLabel: "Start free trial",
    primaryHref: "/login",
    secondaryLabel: "Contact sales",
    secondaryHref: "/contact",
  },
  privacy: {
    title: "Privacy Policy",
    description:
      "How Velon-ERP collects, uses, retains, and protects personal and business data.",
    effectiveDate: "26 May 2026",
    lastUpdated: "26 May 2026",
    sections: [
      {
        id: "introduction",
        title: "1. Introduction",
        body: "Velon Systems processes personal data when you use Velon-ERP. We align with India's DPDP Act and international privacy standards where applicable.",
      },
      {
        id: "data-we-collect",
        title: "2. Data we collect",
        body: "We collect identity and contact data, account security metadata, workspace business data you enter, usage logs, and billing metadata from payment processors.",
      },
      {
        id: "security",
        title: "3. Security",
        body: `We use encryption in transit, role-based access, audit logging, and tenant isolation. Report incidents to ${VELON_CONTACT_EMAIL}.`,
      },
      {
        id: "rights",
        title: "4. Your rights",
        body: `You may request access, correction, or deletion subject to legal retention requirements. Contact ${VELON_CONTACT_EMAIL}.`,
      },
    ],
  },
  terms: {
    title: "Terms of Service",
    description: "Contractual terms and acceptable use for Velon-ERP.",
    effectiveDate: "26 May 2026",
    lastUpdated: "26 May 2026",
    sections: [
      {
        id: "agreement",
        title: "1. Agreement",
        body: "By using Velon-ERP you agree to these Terms and our Privacy Policy. Enterprise customers may have separate written agreements.",
      },
      {
        id: "acceptable-use",
        title: "2. Acceptable use",
        body: "Do not misuse the Service for unlawful activity, unauthorized access, malware, or circumvention of billing or security controls.",
      },
      {
        id: "fees",
        title: "3. Fees & billing",
        body: "Paid plans are billed in advance. Taxes may apply. Non-payment may result in suspension after notice.",
      },
      {
        id: "governing-law",
        title: "4. Governing law",
        body: "These Terms are governed by the laws of India. Courts in Bengaluru, Karnataka have exclusive jurisdiction unless consumer law provides otherwise.",
      },
    ],
  },
  refundPolicy: {
    title: "Refund Policy",
    description: "How refunds work for Velon-ERP subscriptions and paid plans.",
    effectiveDate: "22 June 2026",
    lastUpdated: "22 June 2026",
    sections: [
      {
        id: "overview",
        title: "1. Overview",
        body: "Velon Systems wants you to be satisfied with Velon-ERP. This Refund Policy explains when you may be eligible for a refund on paid subscriptions.",
      },
      {
        id: "free-trial",
        title: "2. Free trial",
        body: "If you are on a free trial, you will not be charged until the trial ends. Cancel before the trial ends to avoid any charge.",
      },
      {
        id: "monthly-plans",
        title: "3. Monthly subscriptions",
        body: `If you cancel a monthly paid plan within 7 days of your first charge and have not materially used paid features beyond reasonable evaluation, contact us at ${VELON_CONTACT_EMAIL} for a refund review. Renewals are generally non-refundable unless required by law.`,
      },
      {
        id: "annual-plans",
        title: "4. Annual subscriptions",
        body: `Annual plans are billed upfront. Refund requests within 14 days of purchase may be considered on a pro-rata basis if you have not substantially used the service. Contact ${VELON_CONTACT_EMAIL} with your workspace ID and invoice reference.`,
      },
      {
        id: "how-to-request",
        title: "5. How to request a refund",
        body: `Email ${VELON_CONTACT_EMAIL} from your account owner address with your workspace name, billing email, and reason for the request. We aim to respond within 5 business days.`,
      },
    ],
  },
};

@Injectable()
export class CmsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAll() {
    const rows = await this.prisma.client.siteContentBlock.findMany();
    const map = Object.fromEntries(rows.map((r) => [r.key, r.data])) as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of SITE_CONTENT_KEYS) {
      out[key] = map[key] ?? DEFAULTS[key];
    }
    return out;
  }

  async getBlock(key: SiteContentKey) {
    const row = await this.prisma.client.siteContentBlock.findUnique({ where: { key } });
    return row?.data ?? DEFAULTS[key];
  }

  async upsertBlock(key: SiteContentKey, data: Prisma.InputJsonValue) {
    return this.prisma.client.siteContentBlock.upsert({
      where: { key },
      create: { key, data },
      update: { data },
    });
  }
}
