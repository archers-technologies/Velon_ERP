import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const STORAGE_PRESET = 'velon-admin-currency-preset';
const STORAGE_CUSTOM = 'velon-admin-currency-custom-symbol';

export type AdminCurrencyPreset = 'INR' | 'USD' | 'EUR' | 'GBP' | 'AED' | 'CUSTOM';

const PRESET_META: Record<
  Exclude<AdminCurrencyPreset, 'CUSTOM'>,
  { currency: string; locale: string }
> = {
  INR: { currency: 'INR', locale: 'en-IN' },
  USD: { currency: 'USD', locale: 'en-US' },
  EUR: { currency: 'EUR', locale: 'de-DE' },
  GBP: { currency: 'GBP', locale: 'en-GB' },
  AED: { currency: 'AED', locale: 'en-AE' },
};

function isPreset(v: string): v is AdminCurrencyPreset {
  return v === 'INR' || v === 'USD' || v === 'EUR' || v === 'GBP' || v === 'AED' || v === 'CUSTOM';
}

type AdminCurrencyContextValue = {
  formatCurrency: (amount: number) => string;
  preset: AdminCurrencyPreset;
  setPreset: (p: AdminCurrencyPreset) => void;
  customSymbol: string;
  setCustomSymbol: (s: string) => void;
};

const AdminCurrencyContext = createContext<AdminCurrencyContextValue | null>(null);

export function AdminCurrencyProvider({ children }: { children: ReactNode }) {
  const [preset, setPresetState] = useState<AdminCurrencyPreset>('INR');
  const [customSymbol, setCustomSymbolState] = useState('₹');

  useEffect(() => {
    try {
      const p = localStorage.getItem(STORAGE_PRESET);
      if (p && isPreset(p)) setPresetState(p);
      const c = localStorage.getItem(STORAGE_CUSTOM);
      if (c !== null) setCustomSymbolState(c);
    } catch {
      /* ignore */
    }
  }, []);

  const setPreset = useCallback((p: AdminCurrencyPreset) => {
    setPresetState(p);
    try {
      localStorage.setItem(STORAGE_PRESET, p);
    } catch {
      /* ignore */
    }
  }, []);

  const setCustomSymbol = useCallback((s: string) => {
    setCustomSymbolState(s);
    try {
      localStorage.setItem(STORAGE_CUSTOM, s);
    } catch {
      /* ignore */
    }
  }, []);

  const formatCurrency = useCallback(
    (amount: number) => {
      if (preset === 'CUSTOM') {
        const sym = customSymbol.trim() || '₹';
        return `${sym}${new Intl.NumberFormat('en-IN', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        }).format(amount)}`;
      }
      const m = PRESET_META[preset];
      return new Intl.NumberFormat(m.locale, { style: 'currency', currency: m.currency }).format(
        amount,
      );
    },
    [preset, customSymbol],
  );

  const value = useMemo(
    () => ({ formatCurrency, preset, setPreset, customSymbol, setCustomSymbol }),
    [formatCurrency, preset, setPreset, customSymbol, setCustomSymbol],
  );

  return <AdminCurrencyContext.Provider value={value}>{children}</AdminCurrencyContext.Provider>;
}

export function useAdminCurrency(): AdminCurrencyContextValue {
  const ctx = useContext(AdminCurrencyContext);
  if (!ctx) throw new Error('useAdminCurrency must be used within AdminCurrencyProvider');
  return ctx;
}

const PRESET_BOOKS_IN: Record<Exclude<AdminCurrencyPreset, 'CUSTOM'>, string> = {
  INR: 'Indian Rupee · INR (₹)',
  USD: 'US Dollar · USD ($)',
  EUR: 'Euro · EUR (€)',
  GBP: 'Pound sterling · GBP (£)',
  AED: 'UAE Dirham · AED',
};

export function adminBooksCurrencyLine(preset: AdminCurrencyPreset, customSymbol: string): string {
  if (preset === 'CUSTOM') {
    const sym = customSymbol.trim() || '—';
    return `Custom symbol · ${sym}`;
  }
  return PRESET_BOOKS_IN[preset];
}

export function AdminCurrencySelect() {
  const { preset, setPreset, customSymbol, setCustomSymbol } = useAdminCurrency();

  return (
    <div className="hidden shrink-0 items-center gap-2 md:flex">
      <Select
        value={preset}
        onValueChange={(v) => setPreset(v as AdminCurrencyPreset)}
      >
        <SelectTrigger
          className="border-border bg-muted/60 h-9 w-[132px] rounded-lg text-xs"
          aria-label="Display currency"
        >
          <SelectValue placeholder="Currency" />
        </SelectTrigger>
        <SelectContent align="end">
          <SelectItem value="INR">INR · Indian Rupee (₹)</SelectItem>
          <SelectItem value="USD">USD · US Dollar ($)</SelectItem>
          <SelectItem value="EUR">EUR · Euro (€)</SelectItem>
          <SelectItem value="GBP">GBP · Pound (£)</SelectItem>
          <SelectItem value="AED">AED · UAE Dirham</SelectItem>
          <SelectItem value="CUSTOM">Custom symbol…</SelectItem>
        </SelectContent>
      </Select>
      {preset === 'CUSTOM' && (
        <Input
          value={customSymbol}
          onChange={(e) => setCustomSymbol(e.target.value)}
          maxLength={6}
          className="border-border bg-muted/60 h-9 w-[72px] rounded-lg px-2 text-xs"
          placeholder="₹"
          aria-label="Custom currency symbol"
        />
      )}
    </div>
  );
}
