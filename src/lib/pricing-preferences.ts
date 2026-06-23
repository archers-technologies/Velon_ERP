export type PricingCurrency = "INR" | "USD" | "AED" | "GBP" | "EUR" | "SGD";

export type PricingCountry = "IN" | "US" | "AE" | "GB" | "EU" | "SG" | "OTHER";

export type PricingPreference = {
  country: PricingCountry;
  currency: PricingCurrency;
};

export const PRICING_PREFERENCE_KEY = "velon-pricing-preference-v1";
export const PRICING_PROMPT_DISMISSED_KEY = "velon-pricing-prompt-dismissed-v1";

export const defaultPricingPreference: PricingPreference = {
  country: "IN",
  currency: "INR",
};

export const countryOptions: Array<{
  value: PricingCountry;
  label: string;
  defaultCurrency: PricingCurrency;
}> = [
  { value: "IN", label: "India", defaultCurrency: "INR" },
  { value: "US", label: "United States", defaultCurrency: "USD" },
  { value: "AE", label: "United Arab Emirates", defaultCurrency: "AED" },
  { value: "GB", label: "United Kingdom", defaultCurrency: "GBP" },
  { value: "EU", label: "Europe", defaultCurrency: "EUR" },
  { value: "SG", label: "Singapore", defaultCurrency: "SGD" },
  { value: "OTHER", label: "Other", defaultCurrency: "USD" },
];

export const currencyOptions: Array<{
  value: PricingCurrency;
  label: string;
}> = [
  { value: "INR", label: "INR - Indian Rupee" },
  { value: "USD", label: "USD - US Dollar" },
  { value: "AED", label: "AED - UAE Dirham" },
  { value: "GBP", label: "GBP - British Pound" },
  { value: "EUR", label: "EUR - Euro" },
  { value: "SGD", label: "SGD - Singapore Dollar" },
];

const currencyLocale: Record<PricingCurrency, string> = {
  INR: "en-IN",
  USD: "en-US",
  AED: "en-AE",
  GBP: "en-GB",
  EUR: "en-IE",
  SGD: "en-SG",
};

const inrRates: Record<PricingCurrency, number> = {
  INR: 1,
  USD: 0.012,
  AED: 0.044,
  GBP: 0.0095,
  EUR: 0.011,
  SGD: 0.016,
};

export function formatMonthlyPrice(monthlyInr: number, currency: PricingCurrency) {
  const converted = monthlyInr * inrRates[currency];
  const rounded =
    currency === "INR" ? Math.round(converted / 100) * 100 - 1 : Math.round(converted);

  return new Intl.NumberFormat(currencyLocale[currency], {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Math.max(rounded, 0));
}

export function readPricingPreference(): PricingPreference {
  if (typeof window === "undefined") return defaultPricingPreference;

  try {
    const raw = window.localStorage.getItem(PRICING_PREFERENCE_KEY);
    if (!raw) return defaultPricingPreference;
    const parsed = JSON.parse(raw) as Partial<PricingPreference>;
    const currency: PricingCurrency = currencyOptions.some(
      (option) => option.value === parsed.currency,
    )
      ? (parsed.currency as PricingCurrency)
      : defaultPricingPreference.currency;
    const country: PricingCountry = countryOptions.some((option) => option.value === parsed.country)
      ? (parsed.country as PricingCountry)
      : defaultPricingPreference.country;

    return { country, currency };
  } catch {
    return defaultPricingPreference;
  }
}

export function savePricingPreference(preference: PricingPreference) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PRICING_PREFERENCE_KEY, JSON.stringify(preference));
}

export function looksLikeIndiaVisitor(): boolean {
  if (typeof window === "undefined") return true;

  const languages = navigator.languages?.length ? navigator.languages : [navigator.language];
  const hasIndiaLocale = languages.some((language) => /-IN\b/i.test(language));
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return hasIndiaLocale || timeZone === "Asia/Kolkata" || timeZone === "Asia/Calcutta";
}
