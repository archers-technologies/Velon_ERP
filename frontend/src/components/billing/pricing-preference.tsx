import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { NativeSelect } from "@/components/ui/native-select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  countryOptions,
  currencyOptions,
  defaultPricingPreference,
  detectVisitorPricingPreference,
  getCountryDefaultCurrency,
  PRICING_PREFERENCE_KEY,
  PRICING_PROMPT_DISMISSED_KEY,
  readPricingPreference,
  savePricingPreference,
  applyPricingLanguage,
  type PricingCountry,
  type PricingCurrency,
  type PricingLanguage,
  type PricingPreference,
} from "@/lib/billing/pricing-preferences";

const languageOptions: Array<{ value: PricingLanguage; label: string }> = [
  { value: "en", label: "English" },
  { value: "hi", label: "Hindi" },
  { value: "ar", label: "Arabic" },
];

export function usePricingPreference() {
  const [preference, setPreference] = useState<PricingPreference>(defaultPricingPreference);

  useEffect(() => {
    const saved = readPricingPreference();
    setPreference(saved);
    applyPricingLanguage(saved.language);

    function onStorage(event: StorageEvent) {
      if (event.key === PRICING_PREFERENCE_KEY) {
        const next = readPricingPreference();
        setPreference(next);
        applyPricingLanguage(next.language);
      }
    }

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  function updatePreference(next: PricingPreference) {
    setPreference(next);
    savePricingPreference(next);
    applyPricingLanguage(next.language);
  }

  return { preference, updatePreference };
}

export function PricingPreferencePrompt({ skipAutoOpen = false }: { skipAutoOpen?: boolean }) {
  const { preference, updatePreference } = usePricingPreference();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<PricingPreference>(preference);

  useEffect(() => {
    if (skipAutoOpen) return;

    const hasPreference = window.localStorage.getItem(PRICING_PREFERENCE_KEY);
    const dismissed = window.localStorage.getItem(PRICING_PROMPT_DISMISSED_KEY);

    if (!hasPreference && !dismissed) {
      setDraft(detectVisitorPricingPreference());
      setOpen(true);
    }
  }, [skipAutoOpen]);

  const countrySelectOptions = useMemo(
    () => countryOptions.map((option) => ({ value: option.value, label: option.label })),
    [],
  );

  function closePrompt() {
    window.localStorage.setItem(PRICING_PROMPT_DISMISSED_KEY, "true");
    setOpen(false);
  }

  function saveDraft() {
    updatePreference(draft);
    closePrompt();
  }

  function useDetectedDefaults() {
    const detected = detectVisitorPricingPreference();
    updatePreference(detected);
    closePrompt();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) closePrompt();
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Choose your country, currency &amp; language</DialogTitle>
          <DialogDescription>
            Velon-ERP tailors public pricing and defaults to your region. You can change this anytime
            from the pricing section on the homepage.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="pricing-country">
              Country / region
            </label>
            <SearchableSelect
              id="pricing-country"
              value={draft.country}
              onChange={(value) => {
                const country = value as PricingCountry;
                setDraft({ ...draft, country, currency: getCountryDefaultCurrency(country) });
              }}
              options={countrySelectOptions}
              placeholder="Select country"
              searchPlaceholder="Search countries…"
              emptyMessage="No country found."
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="pricing-currency">
              Currency
            </label>
            <NativeSelect
              id="pricing-currency"
              value={draft.currency}
              onChange={(value) =>
                setDraft((current) => ({ ...current, currency: value as PricingCurrency }))
              }
              options={currencyOptions.map((option) => ({
                value: option.value,
                label: option.label,
              }))}
              placeholder="Select currency"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="pricing-language">
              Language
            </label>
            <NativeSelect
              id="pricing-language"
              value={draft.language}
              onChange={(value) =>
                setDraft((current) => ({ ...current, language: value as PricingLanguage }))
              }
              options={languageOptions}
              placeholder="Select language"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={useDetectedDefaults}>
            Use detected defaults
          </Button>
          <Button
            className="bg-foreground text-background hover:bg-foreground/90"
            onClick={saveDraft}
          >
            Save preference
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PricingPreferenceControl({
  preference,
  onChange,
  compact = false,
}: {
  preference: PricingPreference;
  onChange: (preference: PricingPreference) => void;
  compact?: boolean;
}) {
  const countryLabel = useMemo(
    () => countryOptions.find((option) => option.value === preference.country)?.label ?? "India",
    [preference.country],
  );

  return (
    <div className="relative z-10 flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
      <span>
        Showing {preference.currency} pricing{compact ? "" : ` for ${countryLabel}`}
      </span>
      <SearchableSelect
        value={preference.country}
        onChange={(value) => {
          const country = value as PricingCountry;
          onChange({
            ...preference,
            country,
            currency: getCountryDefaultCurrency(country),
          });
        }}
        options={countryOptions.map((option) => ({ value: option.value, label: option.label }))}
        placeholder="Country"
        searchPlaceholder="Search countries…"
        className="h-8 w-[min(100%,180px)] rounded-full text-xs"
      />
      <NativeSelect
        value={preference.currency}
        onChange={(value) => onChange({ ...preference, currency: value as PricingCurrency })}
        options={currencyOptions.map((option) => ({
          value: option.value,
          label: option.value,
        }))}
        className="h-8 w-[min(100%,110px)] rounded-full text-xs"
      />
      <NativeSelect
        value={preference.language}
        onChange={(value) => onChange({ ...preference, language: value as PricingLanguage })}
        options={languageOptions}
        className="h-8 w-[min(100%,100px)] rounded-full text-xs"
      />
    </div>
  );
}
