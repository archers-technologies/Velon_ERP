# VelonERP Saudi Arabia edition

This repository is the Saudi edition. It is separate from any Indian GST edition. Code changes here do not register a domain, issue a TLS certificate, onboard a taxpayer with ZATCA, or make the product certified.

Last reviewed: 11 October 2026.

## Edition defaults

| Setting     | Value                      |
| ----------- | -------------------------- |
| Application | VelonERP Saudi Arabia      |
| URL         | `https://velonerp.sa`      |
| Contact     | `info@velonerp.sa`         |
| Currency    | SAR                        |
| Locales     | `ar-SA` (default), `en-SA` |
| Timezone    | `Asia/Riyadh`              |
| Country     | Saudi Arabia               |

New workspaces pick these defaults. Existing workspace rows are not rewritten by the migration, so historical invoices keep the currency and tax amounts they were issued with.

## VAT

Standard rate rules live in `VatTaxRule` and in `packages/shared-kernel/src/saudi-vat.ts`:

- 5% from 1 January 2018 through 30 June 2020.
- 15% from 1 July 2020, which ZATCA still describes as the standard rate in the November 2024 implementing-regulation amendments guideline.

Invoice lines use one of: standard, zero-rated, exempt, out of scope, or review required. The application does not choose zero-rated or exempt by itself. A line with no treatment cannot be issued; it can be saved as a draft. The rate used is stored on the line.

Tax-inclusive prices extract VAT as `gross × rate / (100 + rate)`. Invoice-level discounts on tax-inclusive prices are rejected so each line keeps its own VAT amount.

Subscription prices in SAR are not automatically increased by 15%. VAT on VelonERP’s own subscription sales depends on the selling entity, the customer, and the supply. That has to be confirmed with the company’s tax adviser.

## ZATCA e-invoicing boundary

Implemented:

- Phase 1 QR payload (TLV tags 1–5, then Base64) when the seller name, 15-digit VAT number, timestamp, total, and VAT amount are present.
- Invoice kind: tax invoice when the customer has a VAT number, otherwise simplified tax invoice.
- Status `QR_READY` or `PENDING_SELLER_VAT`.
- Status text that says a local QR is not clearance or reporting.

Not implemented, because it needs taxpayer onboarding and the current ZATCA technical package:

- XML signing, cryptographic stamp, invoice hash chain, and CSID/private-key handling.
- Clearance and reporting API calls.
- Any status of cleared or reported.

Do not set `ZATCA_API_BASE_URL` from memory. Copy the current sandbox or production base URL from the ZATCA e-invoicing developer documentation after onboarding: [https://zatca.gov.sa/](https://zatca.gov.sa/). Never send test invoices to production, and never commit certificates or private keys.

## Company setup

Optional unless a workflow needs them:

- Arabic and English legal names.
- Commercial Registration number (10 digits when provided).
- VAT registration number (15 digits when provided).
- National address: building number (4), street, district, city, postal code (5), additional number (4), and region.

## External configuration

The owner or administrator still has to:

1. Register `velonerp.sa` and point DNS at the host.
2. Issue the TLS certificate for `velonerp.sa` and `app.velonerp.sa`.
3. Set production `APP_BASE_URL`, `PUBLIC_APP_URL`, `CORS_ORIGINS`, `PUBLIC_WORKSPACE_DOMAIN`, and `SUPPORT_EMAIL=info@velonerp.sa`.
4. Configure the mail provider, SPF, DKIM, and DMARC, then send a real message to confirm delivery.
5. Choose a payment provider that can collect SAR. Razorpay is not used for SAR checkout. Bank transfer is the honest default until a live gateway is connected. HyperPay and STC Pay adapters in this codebase are not live checkouts.
6. Back up the database, then run `npm run db:migrate:deploy` before relying on the new columns.
7. Complete ZATCA onboarding per taxpayer before any clearance or reporting claim.

## Regulatory register

| Requirement                       | Authority            | Source                                                                                                                                                                                                                             | Module                                    | Applies when                                                    | Status                                                                                             | External step                                                            |
| --------------------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Standard VAT 15% from 1 Jul 2020  | ZATCA                | [Rate announcement](https://zatca.gov.sa/en/MediaCenter/News/Pages/News-320.aspx), [2024 amendments guideline](https://zatca.gov.sa/en/HelpCenter/guidelines/Documents/Amendments-to-the-Implementing-Regulation-of-%28VAT%29.PDF) | Sales invoices                            | Seller is VAT registered and the supply is standard-rated       | Implemented as a selectable, effective-dated rate                                                  | Confirm the supply category with a tax adviser                           |
| VAT implementing regulations      | ZATCA                | [English translation](https://zatca.gov.sa/en/RulesRegulations/Taxes/Documents/Implmenting%20Regulations%20of%20the%20VAT%20Law_EN.pdf)                                                                                            | Sales invoices                            | Zero-rated, exempt, and cross-border supplies                   | Treatment can be selected; classification is not automated                                         | Taxpayer determines the treatment                                        |
| E-invoicing generation (Phase 1)  | ZATCA                | [ZATCA](https://zatca.gov.sa/)                                                                                                                                                                                                     | Sales invoices                            | VAT-registered invoicing in scope of the e-invoicing resolution | QR payload only                                                                                    | Confirm the taxpayer wave and mandatory fields                           |
| E-invoicing integration (Phase 2) | ZATCA                | ZATCA developer portal after onboarding                                                                                                                                                                                            | Sales invoices                            | Taxpayers in an integration wave                                | Not implemented                                                                                    | CSID, certificate, and API base URL from ZATCA                           |
| Commercial registration           | Ministry of Commerce | [https://mc.gov.sa/](https://mc.gov.sa/)                                                                                                                                                                                           | Company profile                           | Businesses that hold a CR                                       | Optional 10-digit field                                                                            | Customer enters their own CR                                             |
| Personal data protection          | SDAIA                | [https://sdaia.gov.sa/](https://sdaia.gov.sa/)                                                                                                                                                                                     | Privacy notice, access control, audit log | Personal data processed by the service                          | Notice and existing access controls updated; not a PDPL certification                              | Counsel reviews the notice against the PDPL and implementing regulations |
| Cybersecurity                     | NCA                  | [https://nca.gov.sa/](https://nca.gov.sa/)                                                                                                                                                                                         | Platform                                  | Depends on entity classification                                | Existing auth, secrets-in-env, and audit logging only                                              | Determine whether ECC or other NCA controls apply to the hosting entity  |
| Payments                          | SAMA                 | [https://www.sama.gov.sa/](https://www.sama.gov.sa/)                                                                                                                                                                               | Subscription billing                      | Only if the activity is a regulated payment service             | No payment license is claimed. Software subscription checkout is not implemented as a SAMA service | Confirm with counsel before offering stored-value or money movement      |

## Known limits

- The interface is bilingual at the shell, invoices, settings, and legal pages. Many existing module screens are still English with RTL applied when Arabic is selected.
- Hijri dates are shown beside the Gregorian issue date. Stored timestamps stay Gregorian.
- Payroll and HR do not integrate with GOSI or the Wage Protection System.
- Credit and debit notes are not separate ZATCA document types yet. Cancel and void remain accounting actions.
- This migration was added to the repository. Apply it on the Saudi database only, after a backup. Do not point it at an Indian production database.
