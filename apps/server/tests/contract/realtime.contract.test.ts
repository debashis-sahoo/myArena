import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { clientIntentSchema, eventSchema, parseClientFrame, rejections, serverMessageSchema } from '@myarena/protocol';

const doc = readFileSync(new URL('../../../../specs/001-base-platform-experience/contracts/realtime-protocol.md', import.meta.url), 'utf8');
// The 003 game channel adds one intent and one rejection code on top of the 001 documents.
const channelDoc = readFileSync(new URL('../../../../specs/003-ludo-game/contracts/game-channel.md', import.meta.url), 'utf8');
const section = (title: string) => doc.split(/^## /m).find((part) => part.startsWith(title)) ?? '';
const firstColumn = (text: string) => [...text.matchAll(/^\| `([A-Za-z_.]+)` \|/gm)].map((match) => match[1]!).filter((name) => name !== 'type');
const channelIntents = firstColumn((channelDoc.split(/^### Client to server/m)[1] ?? '').split(/^### /m)[0] ?? '');
const channelRejections = [...channelDoc.matchAll(/New code `([A-Z_]+)`/g)].map((match) => match[1]!);

const uuid = () => randomUUID();
const participant = { id: uuid(), displayLabel: 'Sam', role: 'HOST', ready: false, connection: 'CONNECTED' };
const settings = { maxParticipants: 10, gameSettings: {} };
const invitation = { code: 'ABCDEFGH23', link: '/join/ABCDEFGH23' };
const message = { id: uuid(), senderParticipantId: uuid(), senderLabel: 'Sam', text: 'hi', sentAt: 1 };

const intents: Record<string, Record<string, unknown>> = {
  'ready.set': { ready: true }, 'chat.send': { text: 'hi' }, 'game.select': { gameId: 'g' },
  'settings.update': { changes: { maxParticipants: 5 } }, 'match.start': {}, 'match.rematch': {},
  'match.returnToLobby': {}, 'invite.regenerate': {}, 'host.transfer': { targetParticipantId: uuid() },
  'member.remove': { targetParticipantId: uuid() }, 'room.close': {}, resync: { lastVersion: 3 }, ping: {},
  'game.action': { action: { type: 'roll' } },
};
const events: Record<string, Record<string, unknown>> = {
  'participant.joined': { participant }, 'participant.left': { participantId: uuid() },
  'participant.connection': { participantId: uuid(), connection: 'DISCONNECTED' },
  'participant.ready': { participantId: uuid(), ready: true }, 'participant.removed': { participantId: uuid() },
  'chat.message': { message }, 'game.selected': { gameId: 'g', settings }, 'settings.updated': { settings },
  'match.started': {}, 'match.ended': {}, 'match.rematch': {}, 'match.returnedToLobby': {},
  'invite.regenerated': { invitation }, 'host.changed': { hostParticipantId: uuid(), previousHostParticipantId: uuid() },
  'room.closed': {},
};

describe('realtime protocol contract', () => {
  it('documents exactly the intents, events, and rejection codes the schemas accept', () => {
    const documentedIntents = [...firstColumn(section('Client to server')), ...channelIntents];
    expect(documentedIntents.sort()).toEqual(Object.keys(intents).sort());
    expect(clientIntentSchema.options.map((option) => option.shape.type.value).sort()).toEqual(documentedIntents);

    const kinds = [...(/Event `kind` values: ([^]*?)\.\s+Event payloads/.exec(doc)?.[1] ?? '').matchAll(/`([a-zA-Z.]+)`/g)].map((match) => match[1]!);
    expect(eventSchema.options.map((option) => option.shape.kind.value).sort()).toEqual(kinds.sort());
    expect(kinds.sort()).toEqual(Object.keys(events).sort());

    expect(Object.keys(rejections).sort()).toEqual([...firstColumn(section('Rejection codes')), ...channelRejections].sort());
  });

  it.each(Object.entries(intents))('accepts a valid %s intent and rejects unknown fields', (type, fields) => {
    const base = { v: 1, type, clientActionId: uuid(), ...fields };
    expect(clientIntentSchema.safeParse(base).success).toBe(true);
    expect(clientIntentSchema.safeParse({ ...base, extra: 1 }).success).toBe(false);
    expect(clientIntentSchema.safeParse({ ...base, v: 2 }).success).toBe(false);
    expect(clientIntentSchema.safeParse({ ...base, clientActionId: undefined }).success).toBe(false);
    expect(() => parseClientFrame(JSON.stringify({ ...base, userId: 'someone' }))).toThrow();
  });

  it.each(Object.entries(events))('accepts a valid %s event and rejects unknown data fields', (kind, data) => {
    const base = { v: 1, type: 'event', version: 4, kind, data };
    expect(serverMessageSchema.safeParse(base).success).toBe(true);
    expect(serverMessageSchema.safeParse({ ...base, data: { ...data, token: 'x' } }).success).toBe(false);
  });

  it('allows a version-only invitation event for non-hosts', () => {
    expect(serverMessageSchema.safeParse({ v: 1, type: 'event', version: 4, kind: 'invite.regenerated', data: {} }).success).toBe(true);
  });

  it('describes every rejection with a plain-language detail and next step', () => {
    for (const rejection of Object.values(rejections)) {
      expect(rejection.detail.length).toBeGreaterThan(5);
      expect(rejection.nextStep.length).toBeGreaterThan(5);
    }
    const ack = { v: 1, type: 'ack', clientActionId: uuid(), version: 1 };
    expect(serverMessageSchema.safeParse({ ...ack, status: 'ACCEPTED' }).success).toBe(true);
    expect(serverMessageSchema.safeParse({ ...ack, status: 'REJECTED', code: 'NOT_HOST', ...rejections.NOT_HOST }).success).toBe(true);
    expect(serverMessageSchema.safeParse({ ...ack, status: 'REJECTED', code: 'INVENTED', detail: 'x', nextStep: 'y' }).success).toBe(false);
  });
});
