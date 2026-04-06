import { createContext, useContext, useEffect, useMemo, useState } from 'react';

type Theme = 'light' | 'dark';
const THEME_COOKIE_NAME = 'panahgah_ui_theme';

type ThemeContextValue = {
  theme: Theme;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function readThemeCookie(): Theme {
  const cookieValue = document.cookie
    .split('; ')
    .find((cookie) => cookie.startsWith(`${THEME_COOKIE_NAME}=`))
    ?.split('=')[1];

  return cookieValue === 'dark' ? 'dark' : 'light';
}

function writeThemeCookie(theme: Theme) {
  const maxAgeSeconds = 60 * 60 * 24 * 365;
  document.cookie = `${THEME_COOKIE_NAME}=${theme}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax`;
}

function applyTheme(theme: Theme) {
  document.body.classList.toggle('theme-dark', theme === 'dark');
  document.body.classList.toggle('theme-light', theme === 'light');
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => readThemeCookie());

  useEffect(() => {
    applyTheme(theme);
    writeThemeCookie(theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((current) => (current === 'light' ? 'dark' : 'light'));
  };

  const value = useMemo(() => ({ theme, toggleTheme }), [theme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
