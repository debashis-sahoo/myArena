import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router/dom';
import { router } from './app/router';
import { ErrorBoundary } from './app/ErrorBoundary';
import './styles/tokens.css';
import './styles/themes.css';
import './styles/layout.css';
import './styles/components.css';
import './styles/art.css';
import './styles/focus.css';
import './styles/motion.css';
import './features/lobby/RoomPage.css';
import './features/landing/landing.css';

// Applied before the first render so a chosen theme never flashes the wrong colors.
try {
  const stored = localStorage.getItem('myarena-theme');
  if (stored === 'light' || stored === 'dark') document.documentElement.dataset.theme = stored;
} catch { /* Storage is optional. */ }

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary><RouterProvider router={router} /></ErrorBoundary>
  </StrictMode>,
);
