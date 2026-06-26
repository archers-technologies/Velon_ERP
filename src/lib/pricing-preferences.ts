import {
  countryOptions,
  currencyOptions,
  getCountryDefaultCurrency,
  getInrPerUnit,
  currencyLocale,
  type PricingCountry,
  type PricingCurrency,
} from "@/lib/country-currency-catalog";

export type { PricingCountry, PricingCurrency };

export type PricingLanguage = "en" | "hi" | "ar";

export type PricingPreference = {
  country: PricingCountry;
  currency: PricingCurrency;
  language: PricingLanguage;
};

export const PRICING_PREFERENCE_KEY = "velon-pricing-preference-v2";
export const PRICING_PROMPT_DISMISSED_KEY = "velon-pricing-prompt-dismissed-v2";

export const defaultPricingPreference: PricingPreference = {
  country: "IN",
  currency: "INR",
  language: "en",
};

export { countryOptions, currencyOptions, getCountryDefaultCurrency };

export function formatMonthlyPrice(monthlyInr: number, currency: PricingCurrency) {
  const inrPerUnit = getInrPerUnit(currency);
  const converted = monthlyInr / inrPerUnit;
  const rounded =
    currency === "INR" ? Math.round(converted / 100) * 100 - 1 : Math.round(converted);

  const locale = currencyLocale[currency] ?? "en-US";
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(Math.max(rounded, 0));
  } catch {
    return `${currency} ${Math.max(rounded, 0)}`;
  }
}

function isValidLanguage(value: unknown): value is PricingLanguage {
  return value === "en" || value === "hi" || value === "ar";
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
    const language = isValidLanguage(parsed.language)
      ? parsed.language
      : defaultPricingPreference.language;

    return { country, currency, language };
  } catch {
    return defaultPricingPreference;
  }
}

export function savePricingPreference(preference: PricingPreference) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PRICING_PREFERENCE_KEY, JSON.stringify(preference));
  document.documentElement.lang = preference.language;
}

const TIMEZONE_COUNTRY: Record<string, PricingCountry> = {
  "Asia/Kolkata": "IN",
  "Asia/Calcutta": "IN",
  "Asia/Dubai": "AE",
  "Asia/Riyadh": "SA",
  "Asia/Muscat": "OM",
  "Asia/Bahrain": "BH",
  "Asia/Qatar": "QA",
  "Asia/Kuwait": "KW",
  "Asia/Singapore": "SG",
  "Europe/London": "GB",
  "America/New_York": "US",
  "America/Los_Angeles": "US",
  "America/Chicago": "US",
};

export function detectVisitorPricingPreference(): PricingPreference {
  if (typeof window === "undefined") return defaultPricingPreference;

  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const languages = navigator.languages?.length ? navigator.languages : [navigator.language];
  const primaryLang = languages[0]?.toLowerCase() ?? "en";

  let country: PricingCountry = TIMEZONE_COUNTRY[timeZone] ?? "OTHER";
  if (country === "OTHER") {
    if (languages.some((l) => /-IN\b/i.test(l))) country = "IN";
    else if (languages.some((l) => /-AE\b|-SA\b|-BH\b|-OM\b|-QA\b|-KW\b/i.test(l))) {
      const match = languages.find((l) => /-(AE|SA|BH|OM|QA|KW)\b/i.test(l));
      const code = match?.split("-")[1]?.toUpperCase();
      if (code === "AE" || code === "SA" || code === "BH" || code === "OM" || code === "QA" || code === "KW") {
        country = code;
      } else {
        country = "AE";
      }
    } else if (languages.some((l) => /-GB\b/i.test(l))) country = "GB";
    else if (languages.some((l) => /-US\b/i.test(l))) country = "US";
  }

  const currency = getCountryDefaultCurrency(country);
  let language: PricingLanguage = "en";
  if (primaryLang.startsWith("hi")) language = "hi";
  else if (primaryLang.startsWith("ar")) language = "ar";

  return { country, currency, language };
}

export function applyPricingLanguage(language: PricingLanguage) {
  if (typeof document !== "undefined") {
    document.documentElement.lang = language;
  }
}
