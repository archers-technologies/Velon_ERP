import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  applyPricingLanguage,
  defaultPricingPreference,
  ensureDetectedPricingPreference,
  getCountryLabel,
  hasConfirmedLanguage,
  LANGUAGE_LABELS,
  languageChoicesForCountry,
  markLanguageConfirmed,
  PRICING_PREFERENCE_KEY,
  readPricingPreference,
  savePricingPreference,
  type PricingLanguage,
  type PricingPreference,
} from '@/lib/billing/pricing-preferences';

type PricingPreferenceContextValue = {
  preference: PricingPreference;
  updatePreference: (next: PricingPreference) => void;
};

const PricingPreferenceContext = createContext<PricingPreferenceContextValue | null>(null);

export function PricingPreferenceProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useState<PricingPreference>(defaultPricingPreference);

  useEffect(() => {
    const next = ensureDetectedPricingPreference();
    setPreference(next);
    applyPricingLanguage(next.language);

    function onStorage(event: StorageEvent) {
      if (event.key === PRICING_PREFERENCE_KEY) {
        const saved = readPricingPreference();
        setPreference(saved);
        applyPricingLanguage(saved.language);
      }
    }

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const updatePreference = useCallback((next: PricingPreference) => {
    setPreference(next);
    savePricingPreference(next);
    applyPricingLanguage(next.language);
  }, []);

  const value = useMemo(() => ({ preference, updatePreference }), [preference, updatePreference]);

  return (
    <PricingPreferenceContext.Provider value={value}>{children}</PricingPreferenceContext.Provider>
  );
}

export function usePricingPreference() {
  const ctx = useContext(PricingPreferenceContext);
  if (!ctx) {
    throw new Error('usePricingPreference must be used within PricingPreferenceProvider');
  }
  return ctx;
}

/**
 * First-visit language confirmation. Country and currency are auto-detected —
 * visitors only confirm language (when more than one option applies).
 */
export function PricingPreferencePrompt({ skipAutoOpen = false }: { skipAutoOpen?: boolean }) {
  const { preference, updatePreference } = usePricingPreference();
  const [open, setOpen] = useState(false);

  const languageChoices = useMemo(
    () => languageChoicesForCountry(preference.country),
    [preference.country],
  );

  const regionLabel = useMemo(() => getCountryLabel(preference.country), [preference.country]);
  const isArabicDefault = preference.language === 'ar';

  useEffect(() => {
    if (skipAutoOpen) return;
    if (hasConfirmedLanguage()) return;
    if (languageChoices.length <= 1) {
      markLanguageConfirmed();
      return;
    }
    setOpen(true);
  }, [skipAutoOpen, languageChoices.length]);

  function confirmLanguage(language: PricingLanguage) {
    updatePreference({ ...preference, language });
    markLanguageConfirmed();
    setOpen(false);
  }

  function closePrompt() {
    markLanguageConfirmed();
    setOpen(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) closePrompt();
      }}
    >
      <DialogContent className="max-w-sm text-center sm:text-center">
        <DialogHeader className="items-center text-center sm:text-center">
          <DialogTitle className="text-xl">
            {isArabicDefault ? 'مرحباً بكم في VelonERP' : 'Welcome to VelonERP'}
          </DialogTitle>
          <DialogDescription className="text-center leading-relaxed">
            {isArabicDefault ? (
              <>
                تم اكتشاف موقعك: <span className="text-foreground font-medium">{regionLabel}</span>
              </>
            ) : (
              <>
                We detected your region:{' '}
                <span className="text-foreground font-medium">{regionLabel}</span>
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <p className="text-muted-foreground text-sm">
          {isArabicDefault ? 'اختر اللغة:' : 'Continue in:'}
        </p>

        <div className="flex flex-col gap-2">
          {languageChoices.map((language) => (
            <Button
              key={language}
              variant={language === preference.language ? 'default' : 'outline'}
              className={
                language === preference.language
                  ? 'bg-foreground text-background hover:bg-foreground/90'
                  : undefined
              }
              onClick={() => confirmLanguage(language)}
            >
              {LANGUAGE_LABELS[language]}
            </Button>
          ))}
        </div>

        <p className="text-muted-foreground text-xs">
          {isArabicDefault
            ? 'يمكنك تغيير هذا لاحقاً من الإعدادات.'
            : 'You can change this later from settings.'}
        </p>
      </DialogContent>
    </Dialog>
  );
}

/** Read-only pricing locale note — no public selectors (region is auto-detected). */
export function PricingPreferenceControl({
  preference,
  compact = false,
}: {
  preference: PricingPreference;
  compact?: boolean;
}) {
  const countryLabel = useMemo(() => getCountryLabel(preference.country), [preference.country]);

  return (
    <p className="text-muted-foreground relative z-10 text-center text-xs">
      Showing {preference.currency} pricing{compact ? '' : ` for ${countryLabel}`}
    </p>
  );
}
