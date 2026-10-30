import { describe, expect, it } from 'vitest';
import { initialRoomState, reduceRoomMessage } from '../../src/platform/room-state';
import type { LobbyView } from '@myarena/protocol';

const participantId = 'c03e5f50-d21d-41c5-9537-e335ae4326aa';
const lobby: LobbyView = {
  id: '98cbf5c1-c22c-4da9-bfc6-df56b99430c8', version: 1, status: 'LOBBY',
  selectedGameId: null, settings: { maxParticipants: 100, gameSettings: {} }, matchStatus: 'NONE',
  participants: [{ id: participantId, displayLabel: 'Sam', role: 'HOST', ready: false, connection: 'CONNECTED' }],
  chat: [], self: { id: participantId, role: 'HOST' },
};
const snapshot = () => reduceRoomMessage(initialRoomState, { v: 1, type: 'snapshot', version: 1, lobby, self: lobby.self });

describe('room synchronization', () => {
  it('applies snapshots and consecutive events', () => {
    const result = reduceRoomMessage(snapshot(), { v: 1, type: 'event', version: 2, kind: 'participant.ready', data: { participantId, ready: true } });
    expect(result.lobby?.participants[0]?.ready).toBe(true);
    expect(result.version).toBe(2);
  });
  it('does not partially apply events across a version gap', () => {
    const result = reduceRoomMessage(snapshot(), { v: 1, type: 'event', version: 3, kind: 'participant.ready', data: { participantId, ready: true } });
    expect(result.needsResync).toBe(true);
    expect(result.lobby?.participants[0]?.ready).toBe(false);
    expect(result.version).toBe(1);
  });
  it('ignores duplicate events and replaces state on resync', () => {
    const message = { v: 1, type: 'event', version: 1, kind: 'participant.ready', data: { participantId, ready: true } } as const;
    expect(reduceRoomMessage(snapshot(), message)).toEqual(snapshot());
    expect(reduceRoomMessage({ ...snapshot(), needsResync: true }, { v: 1, type: 'snapshot', version: 1, lobby, self: lobby.self }).needsResync).toBe(false);
  });
});