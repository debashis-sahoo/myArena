import { CHAT_HISTORY, CHAT_TEXT_MAX, CHAT_TEXT_MIN, type ChatMessage, type SystemCode } from '@myarena/shared';

/** Strips control characters and trims. Returns null when the result is not 1..500 characters. */
export function sanitizeChatText(raw: string): string | null {
  // eslint-disable-next-line no-control-regex
  const cleaned = raw.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
  if (cleaned.length < CHAT_TEXT_MIN || cleaned.length > CHAT_TEXT_MAX) return null;
  return cleaned;
}

/** Per-room ring buffer of the most recent messages (FR-031). */
export class ChatBuffer {
  private messages: ChatMessage[] = [];
  private nextId = 1;

  player(playerId: string, name: string, color: string, text: string): ChatMessage {
    return this.push({ kind: 'player', playerId, name, color, text });
  }

  system(code: SystemCode, text: string, name = 'myArena', color = 'system'): ChatMessage {
    return this.push({ kind: 'system', systemCode: code, name, color, text });
  }

  history(): ChatMessage[] {
    return this.messages.map((m) => ({ ...m }));
  }

  private push(partial: Omit<ChatMessage, 'id' | 'ts'>): ChatMessage {
    const message: ChatMessage = { ...partial, id: this.nextId++, ts: Date.now() };
    this.messages.push(message);
    if (this.messages.length > CHAT_HISTORY) this.messages.shift();
    return message;
  }
}
