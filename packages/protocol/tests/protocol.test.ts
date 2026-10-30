import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { displayNameSchema, parseClientFrame, clientIntentSchema, serverMessageSchema } from '../src/index.js';

describe('display names', () => {
  it('trims and NFC normalizes supported names', () => {
    expect(displayNameSchema.parse('  Jose\u0301  ')).toBe('Jos\u00e9');
    expect(displayNameSchema.parse("O'Brien-2_ .")).toBe("O'Brien-2_ .");
  });
  it.each(['', ' '.repeat(3), 'a'.repeat(25), 'A\u200bB', 'A\u202eB', 'A\nB', '<b>Sam</b>'])('rejects invalid names', (name) => {
    expect(displayNameSchema.safeParse(name).success).toBe(false);
  });
});

describe('wire protocol', () => {
  const ready = () => ({ v: 1, type: 'ready.set', clientActionId: randomUUID(), ready: true });
  it('accepts a valid own-readiness intent', () => {
    expect(clientIntentSchema.parse(ready()).type).toBe('ready.set');
  });
  it.each(['userId', 'hostId', 'role', 'participantId'])('rejects forged identity fields', (field) => {
    expect(clientIntentSchema.safeParse({ ...ready(), [field]: 'forged' }).success).toBe(false);
  });
  it('requires a UUID on every intent', () => {
    expect(clientIntentSchema.safeParse({ ...ready(), clientActionId: 'not-a-uuid' }).success).toBe(false);
  });
  it('limits chat and frame sizes', () => {
    const chat = { v: 1, type: 'chat.send', clientActionId: randomUUID() };
    expect(clientIntentSchema.safeParse({ ...chat, text: 'a'.repeat(500) }).success).toBe(true);
    expect(clientIntentSchema.safeParse({ ...chat, text: 'a'.repeat(501) }).success).toBe(false);
    expect(() => parseClientFrame(' '.repeat(4097))).toThrow();
    expect(() => parseClientFrame('{')).toThrow();
  });
  it('supports member removal without allowing unknown fields', () => {
    expect(clientIntentSchema.safeParse({ v: 1, type: 'member.remove', clientActionId: randomUUID(), targetParticipantId: randomUUID() }).success).toBe(true);
    expect(serverMessageSchema.safeParse({ v: 1, type: 'event', version: 1, kind: 'participant.removed', data: { participantId: randomUUID() } }).success).toBe(true);
  });
});