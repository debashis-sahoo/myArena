import './UnoChat.css';
import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactElement } from 'react';
import type { ChatMessage } from '@myarena/shared';
import { ChatPanel } from '../../components/room/ChatPanel';
import { setDrawerOpen, useRoom } from '../../state/roomStore';

/*
 * The match chat, people only (FR-046): messages with kind 'player'. Not mounted at all in AI rooms (the screen decides).
 *   dock    a panel that fills its parent: the right column on wide screens
 *   drawer  a header icon button with an unread count; the sheet drops down over the table only while open. Put it inside the header
 *           (a <header> element is preferred: the sheet is anchored just under it).
 */
export interface UnoChatProps {
  messages: ChatMessage[];
  youId: string;
  mode: 'dock' | 'drawer';
}

function ChatIcon(): ReactElement {
  return (
    <svg className="un-chat-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
      <path d="M4 4h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H11l-5 4v-4H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" fill="currentColor" />
    </svg>
  );
}

export function UnoChat({ messages, youId, mode }: UnoChatProps): ReactElement {
  const typed = messages.filter((m) => m.kind === 'player');
  return mode === 'dock' ? <Dock messages={typed} youId={youId} /> : <Drawer messages={typed} youId={youId} />;
}

function Dock({ messages, youId }: { messages: ChatMessage[]; youId: string }): ReactElement {
  useEffect(() => {
    setDrawerOpen(true);
    return () => setDrawerOpen(false);
  }, []);

  return (
    <section className="un-chat-dock" aria-label="Game chat">
      <ChatPanel messages={messages} youId={youId} className="un-chat-panel" />
    </section>
  );
}

function Drawer({ messages, youId }: { messages: ChatMessage[]; youId: string }): ReactElement {
  const [open, setOpen] = useState(false);
  const [top, setTop] = useState(52);
  const { unread } = useRoom();
  const sheetId = useId();
  const bar = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setDrawerOpen(open);
    return () => setDrawerOpen(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      bar.current?.focus();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;
    const place = (): void => {
      const anchor = bar.current?.closest('header') ?? bar.current;
      if (anchor) setTop(Math.round(anchor.getBoundingClientRect().bottom) + 6);
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [open]);

  return (
    <div className="un-chat-drawer">
      <button
        ref={bar}
        type="button"
        className="un-chat-bar"
        title="Chat"
        aria-expanded={open}
        aria-controls={open ? sheetId : undefined}
        aria-label={open ? 'Close chat' : unread > 0 ? `Open chat, ${unread} unread` : 'Open chat'}
        onClick={() => setOpen((v) => !v)}
      >
        <ChatIcon />
        {!open && unread > 0 && (
          <span className="un-chat-unread" aria-hidden="true">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div id={sheetId} className="un-chat-sheet" role="region" aria-label="Game chat" style={{ '--un-chat-top': `${top}px` } as CSSProperties}>
          <ChatPanel messages={messages} youId={youId} className="un-chat-panel" />
        </div>
      )}
    </div>
  );
}
