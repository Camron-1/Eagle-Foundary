export type ThemePreference = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'ef-theme';

/** User-saved choice only; `null` means follow OS until the user toggles. */
export function getStoredPreference(): ThemePreference | null {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    if (v === 'light' || v === 'dark') return v;
  } catch {
    /* ignore */
  }
  return null;
}

export function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Saved preference, or OS appearance when nothing is stored. */
export function getInitialTheme(): ThemePreference {
  return getStoredPreference() ?? getSystemTheme();
}

export function applyThemeToDocument(theme: 'light' | 'dark'): void {
  document.documentElement.setAttribute('data-theme', theme);
}

export function persistPreference(preference: ThemePreference): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    /* ignore */
  }
}

/** Read resolved theme from DOM (works before React mounts). */
export function getThemeFromDocument(): 'light' | 'dark' {
  const t = document.documentElement.getAttribute('data-theme');
  return t === 'light' ? 'light' : 'dark';
}
