import { useEffect, useRef, useState, type ReactElement } from 'react';
import { CHAT_TEXT_MAX, COLOR_HEX, type ChatMessage } from '@myarena/shared';
import { sfx } from '../../audio/sfx';
import { sendChat } from '../../state/roomStore';

interface Props {
  messages: ChatMessage[];
  youId: string;
  /** Docked panels fill their parent; the drawer sizes itself. */
  className?: string;
}

function time(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Message bubbles with player color tags and timestamps, plus system announcements (FR-026 to FR-030).
 * Message text is only ever rendered as text, so markup in a message is shown literally.
 */
export function ChatPanel({ messages, youId, className = '' }: Props): ReactElement {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const logRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true);

  useEffect(() => {
    const el = logRef.current;
    if (el && stickRef.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => Math.max(0, c - 250)), 250);
    return () => clearTimeout(id);
  }, [cooldown]);

  const submit = async (): Promise<void> => {
    const clean = text.trim();
    if (!clean || cooldown > 0) return;
    setError(null);
    // Clear at once so text typed while the server replies is never lost; put it back if sending fails.
    setText('');
    stickRef.current = true;
    const res = await sendChat(clean);
    if (res.ok) return;
    sfx.error();
    setText((current) => current || clean);
    if (res.retryAfterMs) setCooldown(res.retryAfterMs);
    setError(res.message);
  };

  return (
    <section className={`chat ${className}`} aria-label="Room chat">
      <h3 className="panel-title">Chat</h3>
      <div
        className="chat-log"
        ref={logRef}
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        onScroll={(e) => {
          const el = e.currentTarget;
          stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
        }}
      >
        {messages.length === 0 && <p className="hint chat-empty">No messages yet. Say hello!</p>}
        {messages.map((m) =>
          m.kind === 'system' ? (
            <div key={m.id} className="chat-system">
              {m.text}
            </div>
          ) : (
            <div key={m.id} className={`bubble-row ${m.playerId === youId ? 'mine' : ''}`}>
              <div className="bubble" style={{ ['--c' as string]: COLOR_HEX[m.color] ?? '#fff' }}>
                <div className="bubble-head">
                  <span className="color-tag" aria-hidden="true" />
                  <span className="bubble-name">{m.name}</span>
                  <time className="bubble-time" dateTime={new Date(m.ts).toISOString()}>
                    {time(m.ts)}
                  </time>
                </div>
                <p className="bubble-text">{m.text}</p>
              </div>
            </div>
          ),
        )}
      </div>
      <form
        className="chat-form"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <label className="sr-only" htmlFor="chat-input">
          Message
        </label>
        <input
          id="chat-input"
          className="field"
          value={text}
          maxLength={CHAT_TEXT_MAX}
          placeholder="Type a message"
          autoComplete="off"
          enterKeyHint="send"
          onChange={(e) => setText(e.target.value)}
        />
        <button type="submit" className="btn cyan small" disabled={!text.trim() || cooldown > 0}>
          Send
        </button>
      </form>
      <div className="chat-meta">
        {error ? (
          <span className="error-text" role="alert">
            {cooldown > 0 ? `${error} Try again in ${Math.ceil(cooldown / 1000)}s.` : error}
          </span>
        ) : (
          text.length > CHAT_TEXT_MAX - 100 && (
            <span className="hint">
              {text.length}/{CHAT_TEXT_MAX}
            </span>
          )
        )}
      </div>
    </section>
  );
}
