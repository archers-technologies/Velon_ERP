import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const STORAGE_PRESET = "velon-workspace-currency-preset";
const STORAGE_CUSTOM = "velon-workspace-currency-custom-symbol";

export type WorkspaceCurrencyPreset = "INR" | "USD" | "EUR" | "GBP" | "AED" | "CUSTOM";

const PRESET_META: Record<
  Exclude<WorkspaceCurrencyPreset, "CUSTOM">,
  { currency: string; locale: string }
> = {
  INR: { currency: "INR", locale: "en-IN" },
  USD: { currency: "USD", locale: "en-US" },
  EUR: { currency: "EUR", locale: "de-DE" },
  GBP: { currency: "GBP", locale: "en-GB" },
  AED: { currency: "AED", locale: "en-AE" },
};

function isPreset(v: string): v is WorkspaceCurrencyPreset {
  return v === "INR" || v === "USD" || v === "EUR" || v === "GBP" || v === "AED" || v === "CUSTOM";
}

type WorkspaceCurrencyContextValue = {
  formatCurrency: (amount: number) => string;
  preset: WorkspaceCurrencyPreset;
  setPreset: (p: WorkspaceCurrencyPreset) => void;
  customSymbol: string;
  setCustomSymbol: (s: string) => void;
};

const WorkspaceCurrencyContext = createContext<WorkspaceCurrencyContextValue | null>(null);

export function WorkspaceCurrencyProvider({ children }: { children: ReactNode }) {
  const [preset, setPresetState] = useState<WorkspaceCurrencyPreset>("INR");
  const [customSymbol, setCustomSymbolState] = useState("₹");

  useEffect(() => {
    try {
      const p = localStorage.getItem(STORAGE_PRESET);
      if (p && isPreset(p) && p !== "CUSTOM") {
        setPresetState(p);
      } else if (p === "CUSTOM") {
        localStorage.setItem(STORAGE_PRESET, "INR");
        localStorage.removeItem(STORAGE_CUSTOM);
        setPresetState("INR");
        setCustomSymbolState("₹");
      }
      const c = localStorage.getItem(STORAGE_CUSTOM);
      if (c !== null && p !== "CUSTOM") setCustomSymbolState(c);
    } catch {
      /* ignore */
    }
  }, []);

  const setPreset = useCallback((p: WorkspaceCurrencyPreset) => {
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
      if (preset === "CUSTOM") {
        const sym = customSymbol.trim() || "₹";
        return `${sym}${new Intl.NumberFormat("en-IN", {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        }).format(amount)}`;
      }
      const m = PRESET_META[preset];
      return new Intl.NumberFormat(m.locale, { style: "currency", currency: m.currency }).format(
        amount,
      );
    },
    [preset, customSymbol],
  );

  const value = useMemo(
    () => ({ formatCurrency, preset, setPreset, customSymbol, setCustomSymbol }),
    [formatCurrency, preset, setPreset, customSymbol, setCustomSymbol],
  );

  return (
    <WorkspaceCurrencyContext.Provider value={value}>{children}</WorkspaceCurrencyContext.Provider>
  );
}

export function useWorkspaceCurrency(): WorkspaceCurrencyContextValue {
  const ctx = useContext(WorkspaceCurrencyContext);
  if (!ctx) throw new Error("useWorkspaceCurrency must be used within WorkspaceCurrencyProvider");
  return ctx;
}

const PRESET_BOOKS_IN: Record<Exclude<WorkspaceCurrencyPreset, "CUSTOM">, string> = {
  INR: "Indian Rupee · INR (₹)",
  USD: "US Dollar · USD ($)",
  EUR: "Euro · EUR (€)",
  GBP: "Pound sterling · GBP (£)",
  AED: "UAE Dirham · AED",
};

/** Short line for header: workspace books are denominated in this currency. */
export function workspaceBooksCurrencyLine(
  preset: WorkspaceCurrencyPreset,
  customSymbol: string,
): string {
  if (preset === "CUSTOM") {
    const sym = customSymbol.trim() || "—";
    return `Custom symbol · ${sym}`;
  }
  return PRESET_BOOKS_IN[preset];
}

/** Controlled pair for currency fields before Save (e.g. Settings → Regional). */
export type WorkspaceCurrencyDraft = {
  preset: WorkspaceCurrencyPreset;
  customSymbol: string;
};

/** Select + optional symbol field when preset is Custom (for Settings and other forms). */
export function WorkspaceCurrencySelect({
  className,
  draft,
  onDraftChange,
}: {
  className?: string;
  /** When both are set, the control edits draft only until the parent persists (Save). */
  draft?: WorkspaceCurrencyDraft;
  onDraftChange?: (next: WorkspaceCurrencyDraft) => void;
}) {
  const ctx = useWorkspaceCurrency();
  const controlled = draft !== undefined && onDraftChange !== undefined;
  const preset = controlled ? draft.preset : ctx.preset;
  const customSymbol = controlled ? draft.customSymbol : ctx.customSymbol;

  function applyPreset(next: WorkspaceCurrencyPreset) {
    if (controlled) onDraftChange({ preset: next, customSymbol });
    else ctx.setPreset(next);
  }

  function applySymbol(next: string) {
    if (controlled) onDraftChange({ preset, customSymbol: next });
    else ctx.setCustomSymbol(next);
  }

  return (
    <div
      className={cn("flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-2", className)}
    >
      <Select value={preset} onValueChange={(v) => applyPreset(v as WorkspaceCurrencyPreset)}>
        <SelectTrigger
          className="h-9 min-w-[200px] max-w-full rounded-lg border-border bg-muted/60 text-xs sm:max-w-[280px]"
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
        </SelectContent>
      </Select>
      {preset === "CUSTOM" && (
        <Input
          value={customSymbol}
          onChange={(e) => applySymbol(e.target.value)}
          maxLength={6}
          className="h-9 w-[72px] rounded-lg border-border bg-muted/60 px-2 text-xs"
          placeholder="₹"
          aria-label="Custom currency symbol"
        />
      )}
    </div>
  );
}
