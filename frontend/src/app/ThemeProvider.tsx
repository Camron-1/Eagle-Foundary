import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  applyThemeToDocument,
  getInitialTheme,
  persistPreference,
  type ThemePreference,
} from '@/app/theme';

type ThemeContextValue = {
  /** Current UI theme (always `light` or `dark`). */
  preference: ThemePreference;
  resolved: ThemePreference;
  setPreference: (p: ThemePreference) => void;
  /** Switches between light and dark; persists the choice. */
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }): JSX.Element {
  const [theme, setTheme] = useState<ThemePreference>(() =>
    typeof window !== 'undefined' ? getInitialTheme() : 'dark'
  );

  useEffect(() => {
    applyThemeToDocument(theme);
  }, [theme]);

  const setPreferenceWrapped = useCallback((p: ThemePreference) => {
    persistPreference(p);
    setTheme(p);
  }, []);

  const toggleTheme = useCallback(() => {
    const next: ThemePreference = theme === 'light' ? 'dark' : 'light';
    setPreferenceWrapped(next);
  }, [theme, setPreferenceWrapped]);

  const value = useMemo(
    () => ({
      preference: theme,
      resolved: theme,
      setPreference: setPreferenceWrapped,
      toggleTheme,
    }),
    [theme, setPreferenceWrapped, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
}

/** Safe when ThemeProvider is absent (e.g. tests); uses DOM. */
export function useOptionalTheme(): ThemeContextValue | null {
  return useContext(ThemeContext);
}
