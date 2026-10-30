import { randomUUID } from 'node:crypto';
import type { ChatMessage } from '@myarena/protocol';
import { ok, reject, type Context, type Outcome } from './outcome.js';

export const CHAT_HISTORY_LIMIT = 200;

export function sendChat({ room, actor, now, emit }: Context, text: string): Outcome {
  const trimmed = text.trim();
  if (!trimmed) return reject('VALIDATION_FAILED');
  const message: ChatMessage = { id: randomUUID(), senderParticipantId: actor.id, senderLabel: actor.displayLabel, text: trimmed, sentAt: now };
  room.chat.push(message);
  if (room.chat.length > CHAT_HISTORY_LIMIT) room.chat.splice(0, room.chat.length - CHAT_HISTORY_LIMIT);
  emit('chat.message', { message });
  return ok;
}
