import { useEffect, useId, useState, type ReactElement } from 'react';
import type { ChatMessage } from '@myarena/shared';
import { ChatPanel } from '../../components/room/ChatPanel';
import { setDrawerOpen, useRoom } from '../../state/roomStore';

export interface BingoChatProps {
  messages: ChatMessage[];
  youId: string;
  /** dock: fixed panel in the landscape right column; drawer: header button that drops a chat sheet down on narrow screens (render it inside the header). */
  mode: 'dock' | 'drawer';
}

function ChatIcon(): ReactElement {
  return (
    <svg className="bz-chat-icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
      <path d="M4 4h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H11l-5 4v-4H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" fill="currentColor" />
    </svg>
  );
}

/** The match chat shows only what people typed (FR-031); lobby join and leave lines are left out. */
export function BingoChat({ messages, youId, mode }: BingoChatProps): ReactElement {
  const typed = messages.filter((m) => m.kind === 'player');
  return mode === 'dock' ? <Dock messages={typed} youId={youId} /> : <Drawer messages={typed} youId={youId} />;
}

function Dock({ messages, youId }: { messages: ChatMessage[]; youId: string }): ReactElement {
  useEffect(() => {
    setDrawerOpen(true);
    return () => setDrawerOpen(false);
  }, []);

  return (
    <section className="bz-chat bz-panel" aria-label="Game chat">
      <ChatPanel messages={messages} youId={youId} className="bz-chat-panel" />
    </section>
  );
}

function Drawer({ messages, youId }: { messages: ChatMessage[]; youId: string }): ReactElement {
  const [open, setOpen] = useState(false);
  const { unread } = useRoom();
  const sheetId = useId();

  useEffect(() => {
    setDrawerOpen(open);
    return () => setDrawerOpen(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className="bz-chat-drawer">
      <button
        type="button"
        className="bz-chat-bar"
        title="Chat"
        aria-expanded={open}
        aria-controls={sheetId}
        aria-label={open ? 'Close chat' : unread > 0 ? `Open chat, ${unread} unread` : 'Open chat'}
        onClick={() => setOpen((v) => !v)}
      >
        <ChatIcon />
        {!open && unread > 0 && (
          <span className="bz-chat-unread" aria-hidden="true">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>
      <div id={sheetId} className={`bz-chat-sheet${open ? '' : ' is-closed'}`} role="region" aria-label="Game chat">
        <ChatPanel messages={messages} youId={youId} className="bz-chat-panel" />
      </div>
    </div>
  );
}
