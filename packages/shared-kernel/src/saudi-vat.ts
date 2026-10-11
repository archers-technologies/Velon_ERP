/**
 * Saudi VAT treatments and effective-dated standard rates.
 * Standard 15% is the rate stated by ZATCA in the VAT implementing-regulation
 * amendments guideline (Board resolution 01-06-24, 19 Nov 2024) and the
 * 1 July 2020 rate change: https://zatca.gov.sa/en/MediaCenter/News/Pages/News-320.aspx
 * Zero-rated and exempt supplies are not inferred automatically.
 */
export const VAT_TREATMENTS = [
  'STANDARD',
  'ZERO_RATED',
  'EXEMPT',
  'OUT_OF_SCOPE',
  'REVIEW_REQUIRED',
] as const;

export type VatTreatment = (typeof VAT_TREATMENTS)[number];

export type VatRateRule = {
  ratePercent: number;
  effectiveFrom: string;
  effectiveTo: string | null;
};

export const SAUDI_VAT_STANDARD_RATE_SOURCE =
  'https://zatca.gov.sa/en/HelpCenter/guidelines/Documents/Amendments-to-the-Implementing-Regulation-of-%28VAT%29.PDF';

export const SAUDI_STANDARD_VAT_RULES: VatRateRule[] = [
  { ratePercent: 5, effectiveFrom: '2018-01-01', effectiveTo: '2020-06-30' },
  { ratePercent: 15, effectiveFrom: '2020-07-01', effectiveTo: null },
];

function utcDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function standardVatRateOn(
  issuedOn: Date,
  rules: VatRateRule[] = SAUDI_STANDARD_VAT_RULES,
): number | null {
  const day = utcDateOnly(issuedOn);
  const match = rules.find(
    (rule) => rule.effectiveFrom <= day && (rule.effectiveTo == null || rule.effectiveTo >= day),
  );
  return match ? match.ratePercent : null;
}

function roundMoney(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

export type ResolvedLineVat = {
  treatment: VatTreatment | 'UNSPECIFIED';
  ratePercent: number;
  lineSubtotal: number;
  taxAmount: number;
  lineTotal: number;
  reviewRequired: boolean;
};

export function resolveLineVat(input: {
  treatment?: string | null;
  explicitRate?: number | null;
  taxInclusive?: boolean;
  quantity: number;
  unitPrice: number;
  discount: number;
  issuedOn: Date;
  rules?: VatRateRule[];
}): ResolvedLineVat {
  const quantity = Math.max(0, input.quantity);
  const unitPrice = Math.max(0, input.unitPrice);
  const discount = Math.max(0, input.discount);
  const gross = roundMoney(Math.max(0, quantity * unitPrice - discount));
  const requested = (input.treatment ?? '').trim().toUpperCase();

  let treatment: ResolvedLineVat['treatment'] = 'REVIEW_REQUIRED';
  let ratePercent = 0;
  let reviewRequired = false;

  if (!requested) {
    if (
      input.explicitRate != null &&
      Number.isFinite(input.explicitRate) &&
      input.explicitRate > 0
    ) {
      treatment = 'UNSPECIFIED';
      ratePercent = input.explicitRate;
    } else {
      reviewRequired = true;
    }
  } else if (requested === 'STANDARD') {
    const standard = standardVatRateOn(input.issuedOn, input.rules);
    if (standard == null) {
      reviewRequired = true;
    } else {
      treatment = 'STANDARD';
      ratePercent = standard;
    }
  } else if (requested === 'ZERO_RATED') {
    treatment = 'ZERO_RATED';
  } else if (requested === 'EXEMPT') {
    treatment = 'EXEMPT';
  } else if (requested === 'OUT_OF_SCOPE') {
    treatment = 'OUT_OF_SCOPE';
  } else if (requested === 'REVIEW_REQUIRED') {
    reviewRequired = true;
  } else {
    reviewRequired = true;
  }

  if (input.taxInclusive && ratePercent > 0) {
    const taxAmount = roundMoney(gross * (ratePercent / (100 + ratePercent)));
    const lineSubtotal = roundMoney(gross - taxAmount);
    return {
      treatment,
      ratePercent,
      lineSubtotal,
      taxAmount,
      lineTotal: gross,
      reviewRequired,
    };
  }

  const taxAmount = roundMoney(gross * (ratePercent / 100));
  return {
    treatment,
    ratePercent,
    lineSubtotal: gross,
    taxAmount,
    lineTotal: roundMoney(gross + taxAmount),
    reviewRequired,
  };
}
