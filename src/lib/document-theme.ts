/** Shared with workspace preferences so /app and /admin stay visually in sync. */
export const VELON_THEME_STORAGE_KEY = "velon-workspace-theme";

export function applyVelonThemeFromStorage(): void {
  if (typeof document === "undefined") return;
  try {
    const dark =
      typeof localStorage !== "undefined" &&
      localStorage.getItem(VELON_THEME_STORAGE_KEY) === "dark";
    document.documentElement.classList.toggle("dark", dark);
  } catch {
    document.documentElement.classList.remove("dark");
  }
}

export function setVelonThemeMode(mode: "light" | "dark"): void {
  try {
    localStorage.setItem(VELON_THEME_STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
  if (typeof document !== "undefined") {
    document.documentElement.classList.toggle("dark", mode === "dark");
  }
}

export function toggleVelonTheme(): "light" | "dark" {
  const next = document.documentElement.classList.contains("dark") ? "light" : "dark";
  setVelonThemeMode(next);
  return next;
}

export function isVelonDocumentDark(): boolean {
  return typeof document !== "undefined" && document.documentElement.classList.contains("dark");
}
