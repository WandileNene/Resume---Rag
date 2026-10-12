import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

type Theme = 'dark' | 'light';

const storageKey = 'recruitbot-theme';

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => {
    const savedTheme = window.localStorage.getItem(storageKey);
    return savedTheme === 'light' ? 'light' : 'dark';
  });

  useEffect(() => {
    document.body.dataset.theme = theme;
    window.localStorage.setItem(storageKey, theme);
  }, [theme]);

  const isLight = theme === 'light';

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={() => setTheme(isLight ? 'dark' : 'light')}
      aria-label={`Switch to ${isLight ? 'dark' : 'light'} mode`}
      title={`Switch to ${isLight ? 'dark' : 'light'} mode`}
    >
      {isLight ? <Moon size={16} aria-hidden="true" /> : <Sun size={16} aria-hidden="true" />}
      <span>{isLight ? 'Light mode' : 'Dark mode'}</span>
    </button>
  );
}