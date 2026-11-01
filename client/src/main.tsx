import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { App } from './App';
import './styles/tokens.css';
import './styles/animations.css';
import './styles/controls.css';
import './styles/common.css';
import './styles/hub.css';
import './styles/room.css';
import './styles/chat.css';

// StrictMode is intentionally off: its dev-only double mount would run the room-leave cleanup.
createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
);
