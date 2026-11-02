import { useEffect, useSyncExternalStore, type ReactElement } from 'react';
import type { ChatMessage } from '@myarena/shared';
import { ChatPanel } from '../../components/room/ChatPanel';
import { setDrawerOpen, useRoom } from '../../state/roomStore';
import './ChatDock.css';

const KEY = 'myarena.housie.chat';

function read(): boolean {
  try {
    const stored = localStorage.getItem(KEY);
    if (stored !== null) return stored === 'minimized';
    // First visit: the chat is open in the landscape dock and closed as the portrait drawer.
    return !window.matchMedia('(min-width: 720px) and (min-aspect-ratio: 5/4)').matches;
  } catch {
    return false;
  }
}

let minimized = read();
const listeners = new Set<() => void>();

/** Per-device chat state, shared by every dock and the screen that reads it. */
export function useChatMinimized(): boolean {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => minimized,
    () => false,
  );
}

export function setChatMinimized(min: boolean): void {
  if (min === minimized) return;
  minimized = min;
  try {
    localStorage.setItem(KEY, min ? 'minimized' : 'open');
  } catch {
    /* storage unavailable: the choice lasts for this session only */
  }
  listeners.forEach((l) => l());
}

export interface ChatDockProps {
  messages: ChatMessage[];
  youId: string;
  mode: 'dock' | 'drawer';
}

function ChatIcon(): ReactElement {
  return (
    <svg className="hzc-icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
      <path
        d="M4 4h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H11l-5 4v-4H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"
        fill="currentColor"
      />
    </svg>
  );
}

function UnreadPill({ count }: { count: number }): ReactElement | null {
  if (count <= 0) return null;
  return (
    <span className="hzc-unread" aria-label={`${count} unread messages`}>
      {count > 99 ? '99+' : count}
    </span>
  );
}

export function ChatDock({ messages, youId, mode }: ChatDockProps): ReactElement {
  const min = useChatMinimized();
  const { unread } = useRoom();
  const visible = !min;

  useEffect(() => {
    setDrawerOpen(visible);
    return () => setDrawerOpen(false);
  }, [visible]);

  useEffect(() => {
    if (mode !== 'drawer' || min) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setChatMinimized(true);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mode, min]);

  if (mode === 'drawer') {
    return (
      <div className="hzc hzc-drawer">
        <button
          type="button"
          className="hzc-bar hzc-bar-btn"
          aria-label={min ? 'Open chat' : 'Close chat'}
          aria-expanded={!min}
          aria-controls="hzc-sheet"
          onClick={() => setChatMinimized(!min)}
        >
          <ChatIcon />
          <span className="hzc-bar-label">Chat</span>
          {min && <UnreadPill count={unread} />}
        </button>
        <div id="hzc-sheet" className={`hzc-sheet ${min ? 'closed' : ''}`} role="region" aria-label="Game chat">
          <div className="hzc-head">
            <h3 className="hz-title">Game chat</h3>
            <button type="button" className="hzc-ctl" aria-label="Minimize chat" onClick={() => setChatMinimized(true)}>
              <span aria-hidden="true">&#x2013;</span>
            </button>
          </div>
          <ChatPanel messages={messages} youId={youId} className="hzc-chat" />
        </div>
      </div>
    );
  }

  return (
    <div className={`hzc hzc-dock ${min ? 'min' : ''}`}>
      {min && (
        <div className="hzc-bar">
          <ChatIcon />
          <span className="hzc-bar-label">Chat</span>
          <UnreadPill count={unread} />
          <span className="hzc-spacer" />
          <button type="button" className="hzc-ctl" aria-label="Restore chat" onClick={() => setChatMinimized(false)}>
            Open
          </button>
        </div>
      )}
      <section className="hzc-body hz-panel" aria-label="Game chat" hidden={min}>
        <div className="hzc-head">
          <h3 className="hz-title">Game chat</h3>
          <button type="button" className="hzc-ctl" aria-label="Minimize chat" onClick={() => setChatMinimized(true)}>
            <span aria-hidden="true">&#x2013;</span>
          </button>
        </div>
        <ChatPanel messages={messages} youId={youId} className="hzc-chat" />
      </section>
    </div>
  );
}
