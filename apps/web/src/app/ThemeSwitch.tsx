import { useEffect, useState } from 'react';
import { SunMoon } from 'lucide-react';

type Theme = 'system' | 'light' | 'dark';
export function ThemeSwitch() {
  const [theme, setTheme] = useState<Theme>(() => {
    try { const stored = localStorage.getItem('myarena-theme'); return stored === 'light' || stored === 'dark' ? stored : 'system'; }
    catch { return 'system'; }
  });
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('myarena-theme', theme); } catch { return; }
  }, [theme]);
  return <label className="theme-switch"><SunMoon aria-hidden="true" size={20} /><span className="sr-only">Color theme</span>
    <select value={theme} onChange={(event) => setTheme(event.target.value as Theme)}>
      <option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option>
    </select>
  </label>;
}