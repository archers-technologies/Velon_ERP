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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  countryOptions,
  currencyOptions,
  defaultPricingPreference,
  looksLikeIndiaVisitor,
  PRICING_PREFERENCE_KEY,
  PRICING_PROMPT_DISMISSED_KEY,
  readPricingPreference,
  savePricingPreference,
  type PricingCountry,
  type PricingCurrency,
  type PricingPreference,
} from "@/lib/pricing-preferences";

function getCountryDefaultCurrency(country: PricingCountry): PricingCurrency {
  return (
    countryOptions.find((option) => option.value === country)?.defaultCurrency ??
    defaultPricingPreference.currency
  );
}

export function usePricingPreference() {
  const [preference, setPreference] = useState<PricingPreference>(defaultPricingPreference);

  useEffect(() => {
    setPreference(readPricingPreference());

    function onStorage(event: StorageEvent) {
      if (event.key === PRICING_PREFERENCE_KEY) {
        setPreference(readPricingPreference());
      }
    }

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  function updatePreference(next: PricingPreference) {
    setPreference(next);
    savePricingPreference(next);
  }

  return { preference, updatePreference };
}

export function PricingPreferencePrompt() {
  const { preference, updatePreference } = usePricingPreference();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<PricingPreference>(preference);

  useEffect(() => {
    const hasPreference = window.localStorage.getItem(PRICING_PREFERENCE_KEY);
    const dismissed = window.localStorage.getItem(PRICING_PROMPT_DISMISSED_KEY);

    if (!hasPreference && !dismissed && !looksLikeIndiaVisitor()) {
      setDraft({ country: "OTHER", currency: "USD" });
      setOpen(true);
    }
  }, []);

  function closePrompt() {
    window.localStorage.setItem(PRICING_PROMPT_DISMISSED_KEY, "true");
    setOpen(false);
  }

  function saveDraft() {
    updatePreference(draft);
    closePrompt();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) closePrompt();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Choose your country and currency</DialogTitle>
          <DialogDescription>
            Velon-ERP pricing is shown in Indian Rupees by default. Select your region if you prefer
            another currency.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Country / region</label>
            <Select
              value={draft.country}
              onValueChange={(value) => {
                const country = value as PricingCountry;
                setDraft({ country, currency: getCountryDefaultCurrency(country) });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent>
                {countryOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Currency</label>
            <Select
              value={draft.currency}
              onValueChange={(value) =>
                setDraft((current) => ({ ...current, currency: value as PricingCurrency }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                {currencyOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={closePrompt}>
            Keep INR
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
    <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
      <span>
        Showing {preference.currency} pricing{compact ? "" : ` for ${countryLabel}`}
      </span>
      <Select
        value={preference.country}
        onValueChange={(value) => {
          const country = value as PricingCountry;
          onChange({ country, currency: getCountryDefaultCurrency(country) });
        }}
      >
        <SelectTrigger className="h-8 w-[150px] rounded-full bg-background text-xs">
          <SelectValue aria-label={countryLabel} />
        </SelectTrigger>
        <SelectContent>
          {countryOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={preference.currency}
        onValueChange={(value) => onChange({ ...preference, currency: value as PricingCurrency })}
      >
        <SelectTrigger className="h-8 w-[100px] rounded-full bg-background text-xs">
          <SelectValue aria-label={preference.currency} />
        </SelectTrigger>
        <SelectContent>
          {currencyOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.value}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
