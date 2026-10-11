import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { setVelonThemeMode, VELON_THEME_STORAGE_KEY } from '@/lib/shared/document-theme';
import { PRINTER_SETTINGS_STORAGE_KEYS } from '@/lib/shared/printer-settings';

const STORAGE_LOW_STOCK = 'velon-workspace-pref-low-stock-email';
const STORAGE_DAILY = 'velon-workspace-pref-daily-summary';
const STORAGE_CITY = 'velon-workspace-pref-city';
const STORAGE_COUNTRY = 'velon-workspace-pref-country';
const STORAGE_REGION = 'velon-workspace-pref-region';

/** Keys cleared by “Reset to defaults” (currency keys live in workspace-currency). */
export const WORKSPACE_RESET_STORAGE_KEYS = [
  VELON_THEME_STORAGE_KEY,
  STORAGE_LOW_STOCK,
  STORAGE_DAILY,
  STORAGE_CITY,
  STORAGE_COUNTRY,
  STORAGE_REGION,
  'velon-workspace-currency-preset',
  'velon-workspace-currency-custom-symbol',
  ...PRINTER_SETTINGS_STORAGE_KEYS,
] as const;

export type WorkspaceThemeMode = 'light' | 'dark';

const DEFAULTS = {
  theme: 'light' as WorkspaceThemeMode,
  lowStockEmailAlerts: true,
  dailySummaryReport: true,
  city: 'Mumbai',
  country: 'India',
  region: 'West India',
};

function readBool(key: string, defaultValue: boolean): boolean {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const v = localStorage.getItem(key);
    if (v === null) return defaultValue;
    return v === '1' || v === 'true';
  } catch {
    return defaultValue;
  }
}

function writeBool(key: string, value: boolean) {
  try {
    localStorage.setItem(key, value ? '1' : '0');
  } catch {
    /* ignore */
  }
}

function readString(key: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  try {
    const v = localStorage.getItem(key);
    return v !== null && v.trim() !== '' ? v : fallback;
  } catch {
    return fallback;
  }
}

function writeString(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

function readTheme(): WorkspaceThemeMode {
  if (typeof window === 'undefined') return 'light';
  try {
    return localStorage.getItem(VELON_THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

function applyThemeClass(mode: WorkspaceThemeMode) {
  setVelonThemeMode(mode);
}

type WorkspacePreferencesContextValue = {
  theme: WorkspaceThemeMode;
  setTheme: (mode: WorkspaceThemeMode) => void;
  toggleTheme: () => void;
  lowStockEmailAlerts: boolean;
  setLowStockEmailAlerts: (v: boolean) => void;
  dailySummaryReport: boolean;
  setDailySummaryReport: (v: boolean) => void;
  city: string;
  setCity: (v: string) => void;
  country: string;
  setCountry: (v: string) => void;
  region: string;
  setRegion: (v: string) => void;
  resetToFactoryDefaults: () => void;
};

const WorkspacePreferencesContext = createContext<WorkspacePreferencesContextValue | null>(null);

export function WorkspacePreferencesProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<WorkspaceThemeMode>(DEFAULTS.theme);
  const [lowStockEmailAlerts, setLowStockEmailAlertsState] = useState(DEFAULTS.lowStockEmailAlerts);
  const [dailySummaryReport, setDailySummaryReportState] = useState(DEFAULTS.dailySummaryReport);
  const [city, setCityState] = useState(DEFAULTS.city);
  const [country, setCountryState] = useState(DEFAULTS.country);
  const [region, setRegionState] = useState(DEFAULTS.region);

  useEffect(() => {
    setThemeState(readTheme());
    setLowStockEmailAlertsState(readBool(STORAGE_LOW_STOCK, DEFAULTS.lowStockEmailAlerts));
    setDailySummaryReportState(readBool(STORAGE_DAILY, DEFAULTS.dailySummaryReport));
    setCityState(readString(STORAGE_CITY, DEFAULTS.city));
    setCountryState(readString(STORAGE_COUNTRY, DEFAULTS.country));
    setRegionState(readString(STORAGE_REGION, DEFAULTS.region));
  }, []);

  useEffect(() => {
    applyThemeClass(theme);
  }, [theme]);

  const setTheme = useCallback((mode: WorkspaceThemeMode) => {
    setThemeState(mode);
    setVelonThemeMode(mode);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next: WorkspaceThemeMode = prev === 'dark' ? 'light' : 'dark';
      setVelonThemeMode(next);
      return next;
    });
  }, []);

  const setLowStockEmailAlerts = useCallback((v: boolean) => {
    setLowStockEmailAlertsState(v);
    writeBool(STORAGE_LOW_STOCK, v);
  }, []);

  const setDailySummaryReport = useCallback((v: boolean) => {
    setDailySummaryReportState(v);
    writeBool(STORAGE_DAILY, v);
  }, []);

  const setCity = useCallback((v: string) => {
    setCityState(v);
    writeString(STORAGE_CITY, v);
  }, []);

  const setCountry = useCallback((v: string) => {
    setCountryState(v);
    writeString(STORAGE_COUNTRY, v);
  }, []);

  const setRegion = useCallback((v: string) => {
    setRegionState(v);
    writeString(STORAGE_REGION, v);
  }, []);

  const resetToFactoryDefaults = useCallback(() => {
    try {
      for (const k of WORKSPACE_RESET_STORAGE_KEYS) {
        localStorage.removeItem(k);
      }
    } catch {
      /* ignore */
    }
    setVelonThemeMode('light');
    window.location.reload();
  }, []);

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      toggleTheme,
      lowStockEmailAlerts,
      setLowStockEmailAlerts,
      dailySummaryReport,
      setDailySummaryReport,
      city,
      setCity,
      country,
      setCountry,
      region,
      setRegion,
      resetToFactoryDefaults,
    }),
    [
      theme,
      setTheme,
      toggleTheme,
      lowStockEmailAlerts,
      setLowStockEmailAlerts,
      dailySummaryReport,
      setDailySummaryReport,
      city,
      setCity,
      country,
      setCountry,
      region,
      setRegion,
      resetToFactoryDefaults,
    ],
  );

  return (
    <WorkspacePreferencesContext.Provider value={value}>
      {children}
    </WorkspacePreferencesContext.Provider>
  );
}

export function useWorkspacePreferences(): WorkspacePreferencesContextValue {
  const ctx = useContext(WorkspacePreferencesContext);
  if (!ctx)
    throw new Error('useWorkspacePreferences must be used within WorkspacePreferencesProvider');
  return ctx;
}
