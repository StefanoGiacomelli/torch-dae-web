import { useEffect, useState } from 'react';

type Theme = 'day' | 'night';

function readTheme(): Theme {
  const current = document.documentElement.dataset.theme;
  return current === 'night' ? 'night' : 'day';
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('day');

  useEffect(() => setTheme(readTheme()), []);

  function choose(next: Theme) {
    document.documentElement.dataset.theme = next;
    document.documentElement.style.colorScheme = next === 'night' ? 'dark' : 'light';
    localStorage.setItem('torch-dae-theme', next);
    setTheme(next);
  }

  return (
    <div className="theme-toggle" role="group" aria-label="Color theme">
      <button aria-pressed={theme === 'day'} onClick={() => choose('day')} type="button">
        <span aria-hidden="true">☀</span> Day
      </button>
      <button aria-pressed={theme === 'night'} onClick={() => choose('night')} type="button">
        <span aria-hidden="true">☾</span> Night
      </button>
    </div>
  );
}
