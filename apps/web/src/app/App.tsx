import { useEffect } from 'react';
import { Link, Outlet } from 'react-router';
import { Dices } from 'lucide-react';
import { ThemeSwitch } from './ThemeSwitch';
import { HeaderControls } from './HeaderControls';
import { usePreferences } from './usePreferences';
import { AnnouncerProvider } from '../a11y/announcer';

export function App() {
  const { effects } = usePreferences();
  useEffect(() => { document.documentElement.dataset.effects = effects ? 'on' : 'off'; }, [effects]);
  return <AnnouncerProvider>
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="site-header"><div className="header-inner">
      <Link to="/" className="brand touch-link"><Dices size={26} aria-hidden="true" />myArena Hub</Link>
      <div className="header-tools"><HeaderControls /><ThemeSwitch /></div>
    </div></header>
    <main id="main" tabIndex={-1} className="content"><Outlet /></main>
  </AnnouncerProvider>;
}
