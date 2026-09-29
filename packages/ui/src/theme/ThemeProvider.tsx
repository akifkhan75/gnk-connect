import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: Theme;
  resolved: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeState | null>(null);
const media = () => window.matchMedia('(prefers-color-scheme: dark)');

function read(key: string): Theme {
  try {
    const v = localStorage.getItem(key);
    return v === 'light' || v === 'dark' || v === 'system' ? v : 'system';
  } catch {
    return 'system';
  }
}

/** Light / dark / system with live system tracking and persistence (plan 08 §3). */
export function ThemeProvider({
  children,
  storageKey = 'gnk-theme',
  onChange,
}: {
  children: ReactNode;
  storageKey?: string;
  /** Called when the user picks a theme, e.g. to save it on their profile. */
  onChange?: (theme: Theme) => void;
}) {
  const [theme, setThemeState] = useState<Theme>(() => read(storageKey));
  const [systemDark, setSystemDark] = useState(() => media().matches);

  useEffect(() => {
    const m = media();
    const listener = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    m.addEventListener('change', listener);
    return () => m.removeEventListener('change', listener);
  }, []);

  const resolved = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', resolved === 'dark');
    root.style.colorScheme = resolved;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', resolved === 'dark' ? '#07122a' : '#f5f8fc');
  }, [resolved]);

  const setTheme = useCallback(
    (t: Theme) => {
      try {
        localStorage.setItem(storageKey, t);
      } catch {
        /* storage unavailable */
      }
      setThemeState(t);
      onChange?.(t);
    },
    [storageKey, onChange],
  );

  return (
    <ThemeContext.Provider value={{ theme, resolved, setTheme }}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
