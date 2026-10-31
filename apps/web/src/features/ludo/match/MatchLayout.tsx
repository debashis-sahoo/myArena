import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import type { ChatMessage } from '@myarena/protocol';
import { ChatPanel } from '../../chat/ChatPanel';
import type { RunIntent } from '../../lobby/useRoom';
import { GameLog } from '../view/GameLog';
import { MatchView, type MatchViewProps } from './MatchView';
import { useUnread } from './useUnread';

const WIDE = '(min-width: 900px)';

function useWide(): boolean {
  return useSyncExternalStore(
    (notify) => {
      const query = window.matchMedia(WIDE);
      query.addEventListener('change', notify);
      return () => query.removeEventListener('change', notify);
    },
    () => window.matchMedia(WIDE).matches,
    () => true,
  );
}

type SheetId = 'log' | 'chat';

function Sheet({ label, onClose, children }: { label: string; onClose: () => void; children: ReactNode }) {
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => close.current?.focus(), []);
  return (
    <div className="ludo-sheet" role="region" aria-label={`${label} sheet`} onKeyDown={(event) => { if (event.key === 'Escape') onClose(); }}>
      <button type="button" className="btn-quiet ludo-sheet-close" ref={close} onClick={onClose}>Close {label.toLowerCase()}</button>
      <div className="ludo-sheet-body">{children}</div>
    </div>
  );
}

export interface MatchLayoutProps extends MatchViewProps {
  messages: ChatMessage[];
  run: RunIntent;
}

/**
 * The online match with the room's chat. From 900 px wide the game log sits above the chat beside the board;
 * narrower, two buttons open them as sheets of about half the height, so the board stays in view.
 */
export function MatchLayout({ messages, run, ...match }: MatchLayoutProps) {
  const wide = useWide();
  const [open, setOpen] = useState<SheetId | null>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const logKeys = match.view.log.map((entry) => entry.n);
  const chatKeys = messages.map((message) => message.id);
  const unreadLog = useUnread(logKeys, wide || open === 'log');
  const unreadChat = useUnread(chatKeys, wide || open === 'chat');
  const close = (): void => { setOpen(null); opener.current?.focus(); };
  const toggle = (sheet: SheetId, button: HTMLButtonElement): void => { opener.current = button; setOpen(open === sheet ? null : sheet); };

  if (wide) {
    return (
      <div className="ludo-layout ludo-layout--wide">
        <MatchView {...match} />
        <div className="ludo-side stack">
          <GameLog view={match.view} />
          <ChatPanel messages={messages} run={run} className="ludo-chat" />
        </div>
      </div>
    );
  }
  const label = (name: string, unread: number) => (
    <>{name}{unread > 0 ? <>{' '}<span className="ludo-unread" aria-hidden="true">{unread}</span><span className="sr-only">{unread} unread</span></> : null}</>
  );
  return (
    <div className="ludo-layout">
      <MatchView {...match} />
      <div className="cluster ludo-sheet-buttons">
        <button type="button" className="btn-secondary" aria-expanded={open === 'log'} onClick={(event) => toggle('log', event.currentTarget)}>{label('Game log', unreadLog)}</button>
        <button type="button" className="btn-secondary" aria-expanded={open === 'chat'} onClick={(event) => toggle('chat', event.currentTarget)}>{label('Chat', unreadChat)}</button>
      </div>
      {open === 'log' ? <Sheet label="Game log" onClose={close}><GameLog view={match.view} /></Sheet> : null}
      {open === 'chat' ? <Sheet label="Chat" onClose={close}><ChatPanel messages={messages} run={run} className="ludo-chat" /></Sheet> : null}
    </div>
  );
}
