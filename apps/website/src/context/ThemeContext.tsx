import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

export type ThemeChoice = 'light' | 'dark' | 'system';
const KEY = 'gnk-site-theme';

interface ThemeState {
  choice: ThemeChoice;
  resolved: 'light' | 'dark';
  setChoice: (c: ThemeChoice) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeState | null>(null);

const read = (): ThemeChoice => {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
};
const systemDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches;

/** Light / dark / follow the device. The no-flash script in index.html applies it before paint. */
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [choice, setChoiceState] = useState<ThemeChoice>(read);
  const [system, setSystem] = useState(systemDark);
  const resolved = choice === 'system' ? (system ? 'dark' : 'light') : choice;

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setSystem(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', resolved === 'dark');
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', resolved === 'dark' ? '#060f22' : '#f5f7fa');
  }, [resolved]);

  const setChoice = useCallback((c: ThemeChoice) => {
    setChoiceState(c);
    try {
      if (c === 'system') localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, c);
    } catch {
      /* private mode */
    }
  }, []);
  const toggle = useCallback(
    () => setChoice(resolved === 'dark' ? 'light' : 'dark'),
    [resolved, setChoice],
  );

  return (
    <ThemeContext.Provider value={{ choice, resolved, setChoice, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
};
