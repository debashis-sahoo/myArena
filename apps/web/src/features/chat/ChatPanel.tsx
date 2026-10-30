import { useState, type FormEvent } from 'react';
import type { ChatMessage } from '@myarena/protocol';
import type { RunIntent } from '../lobby/useRoom';

export function ChatPanel({ messages, run, className = '' }: { messages: ChatMessage[]; run: RunIntent; className?: string }) {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!text.trim()) return;
    const problem = await run({ type: 'chat.send', text });
    setError(problem);
    if (!problem) setText('');
  }

  return (
    <section aria-labelledby="chat-heading" className={`panel stack ${className}`.trim()}>
      <h2 id="chat-heading">Chat</h2>
      <div role="log" aria-label="Chat messages" tabIndex={0} className="chat-log">
        {messages.length === 0 ? <p>No messages yet.</p> : (
          <ol>
            {messages.map((message) => (
              <li key={message.id}><strong>{message.senderLabel}:</strong> <span>{message.text}</span></li>
            ))}
          </ol>
        )}
      </div>
      <form onSubmit={submit} className="stack">
        <div className="field">
          <label htmlFor="chat-text">Message</label>
          <input id="chat-text" value={text} maxLength={500} autoComplete="off" onChange={(event) => setText(event.target.value)} />
        </div>
        <button type="submit">Send</button>
        {error ? <p role="alert">{error}</p> : null}
      </form>
    </section>
  );
}
