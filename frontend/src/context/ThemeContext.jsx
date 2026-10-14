import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const ThemeContext = createContext({ theme: 'light', toggle: () => {} });

const initialTheme = () => {
  try {
    const stored = localStorage.getItem('theme');
    if (stored) return stored;
  } catch {
    return 'light';
  }
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(initialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try {
      localStorage.setItem('theme', theme);
    } catch {
      return;
    }
  }, [theme]);

  const toggle = useCallback(() => setTheme((current) => (current === 'dark' ? 'light' : 'dark')), []);
  const value = useMemo(() => ({ theme, toggle }), [theme, toggle]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);
