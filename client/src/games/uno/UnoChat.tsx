import './UnoChat.css';
import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactElement } from 'react';
import type { ChatMessage } from '@myarena/shared';
import { ChatPanel } from '../../components/room/ChatPanel';
import { useChatPref } from '../../state/chatPrefs';
import { setDrawerOpen, useRoom } from '../../state/roomStore';

/*
 * The match chat, people only (FR-046): messages with kind 'player'. Not mounted at all in AI rooms (the screen decides).
 *   dock    a panel that fills its parent: the right column on wide screens, with a Minimize button in its header
 *   rail    the minimized dock: a 44 px column with the chat icon, the unread count and an Open chat button
 *   drawer  a header icon button with an unread count; the sheet drops down over the table only while open. Put it inside the header
 *           (a <header> element is preferred: the sheet is anchored just under it). The sheet has a Minimize button too.
 * Minimizing and restoring are recorded in the per-device chat preference ('uno'), so rotating, replaying and reloading keep the choice.
 * While minimized the chat reports itself closed (setDrawerOpen(false)), so people's new messages raise the unread count; viewing it clears the count.
 */
export interface UnoChatProps {
  messages: ChatMessage[];
  youId: string;
  mode: 'dock' | 'drawer' | 'rail';
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
  if (mode === 'dock') return <Dock messages={typed} youId={youId} />;
  if (mode === 'rail') return <Rail />;
  return <Drawer messages={typed} youId={youId} />;
}

function ChatHead({ onMinimize }: { onMinimize: () => void }): ReactElement {
  return (
    <div className="un-chat-head">
      <h3 className="un-chat-title">Chat</h3>
      <button type="button" className="un-chat-min" aria-label="Minimize chat" onClick={onMinimize}>
        <span aria-hidden="true">Minimize</span>
      </button>
    </div>
  );
}

function Dock({ messages, youId }: { messages: ChatMessage[]; youId: string }): ReactElement {
  const [, setPref] = useChatPref('uno');
  useEffect(() => {
    setDrawerOpen(true);
    return () => setDrawerOpen(false);
  }, []);

  return (
    <section className="un-chat-dock" aria-label="Game chat">
      <ChatHead onMinimize={() => setPref('minimized')} />
      <ChatPanel messages={messages} youId={youId} className="un-chat-panel" />
    </section>
  );
}

function Rail(): ReactElement {
  const [, setPref] = useChatPref('uno');
  const { unread } = useRoom();
  useEffect(() => {
    setDrawerOpen(false);
  }, []);

  return (
    <button
      type="button"
      className="un-chat-rail"
      title="Open chat"
      aria-label={unread > 0 ? `Open chat, ${unread} unread` : 'Open chat'}
      onClick={() => setPref('open')}
    >
      <span className="un-chat-rail-icon">
        <ChatIcon />
        {unread > 0 && (
          <span className="un-chat-unread" aria-hidden="true">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </span>
      <span className="un-chat-rail-text" aria-hidden="true">
        Open chat
      </span>
    </button>
  );
}

function Drawer({ messages, youId }: { messages: ChatMessage[]; youId: string }): ReactElement {
  const [pref, setPref] = useChatPref('uno');
  const open = pref === 'open';
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
      setPref('minimized');
      bar.current?.focus();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, setPref]);

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
        onClick={() => setPref(open ? 'minimized' : 'open')}
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
          <ChatHead
            onMinimize={() => {
              setPref('minimized');
              bar.current?.focus();
            }}
          />
          <ChatPanel messages={messages} youId={youId} className="un-chat-panel" />
        </div>
      )}
    </div>
  );
}
