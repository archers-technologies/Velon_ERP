import { useCallback, useState } from 'react';

/** Session-scoped dismiss for alert-style panels (survives navigation until the tab closes). */
export function useDismissiblePanel(storageKey: string) {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return sessionStorage.getItem(storageKey) === '1';
    } catch {
      return false;
    }
  });

  const dismiss = useCallback(() => {
    try {
      sessionStorage.setItem(storageKey, '1');
    } catch {
      /* ignore quota / private mode */
    }
    setDismissed(true);
  }, [storageKey]);

  return { dismissed, dismiss };
}
