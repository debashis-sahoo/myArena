import { describe, expect, it } from 'vitest';
import type { LobbyView, ServerMessage } from '@myarena/protocol';
import { initialRoomState, reduceRoomMessage, type RoomState } from '../../src/platform/room-state';

const participantId = 'c03e5f50-d21d-41c5-9537-e335ae4326aa';
const matchA = '0c9c2c9c-1b1c-4d7a-9a2c-3f2f4b9f2a11';
const matchB = 'a5f0b2e0-4d4a-4b8c-8b7e-6a1f0c0d9e22';
const lobby: LobbyView = {
  id: '98cbf5c1-c22c-4da9-bfc6-df56b99430c8', version: 1, status: 'IN_MATCH',
  selectedGameId: 'test-channel', settings: { maxParticipants: 4, gameSettings: {} }, matchStatus: 'IN_PROGRESS',
  participants: [{ id: participantId, displayLabel: 'Sam', role: 'HOST', ready: false, connection: 'CONNECTED' }],
  chat: [], self: { id: participantId, role: 'HOST' },
};
const snapshot = (game?: { matchId: string; seq: number; state: unknown } | null, version = 1): ServerMessage =>
  ({ v: 1, type: 'snapshot', version, lobby, self: lobby.self, ...(game !== undefined ? { game } : {}) }) as ServerMessage;
const gameMessage = (matchId: string, seq: number, state: unknown = { n: seq }, events: unknown[] = []): ServerMessage =>
  ({ v: 1, type: 'game', matchId, seq, state, events }) as ServerMessage;
const event = (version: number, kind: string): ServerMessage => ({ v: 1, type: 'event', version, kind, data: {} }) as ServerMessage;
const apply = (state: RoomState, ...messages: ServerMessage[]) => messages.reduce(reduceRoomMessage, state);

describe('game state in the room reducer', () => {
  it('starts with no game', () => {
    expect(initialRoomState.game).toBeNull();
  });

  it('applies a game message with its state and events', () => {
    const state = apply(initialRoomState, snapshot(), gameMessage(matchA, 1, { a: 1 }, [{ kind: 'ROLLED' }]));
    expect(state.game).toEqual({ matchId: matchA, seq: 1, state: { a: 1 }, events: [{ kind: 'ROLLED' }] });
  });

  it('ignores a message whose sequence is not greater than the last for the same match', () => {
    const base = apply(initialRoomState, snapshot(), gameMessage(matchA, 3));
    expect(apply(base, gameMessage(matchA, 3, { x: 1 })).game?.state).toEqual({ n: 3 });
    expect(apply(base, gameMessage(matchA, 2, { x: 1 })).game?.seq).toBe(3);
    expect(apply(base, gameMessage(matchA, 5)).game?.seq).toBe(5);
  });

  it('replaces everything when the match id changes, even with a lower sequence', () => {
    const base = apply(initialRoomState, snapshot(), gameMessage(matchA, 7));
    expect(apply(base, gameMessage(matchB, 1)).game).toMatchObject({ matchId: matchB, seq: 1 });
  });

  it('applies the game in a snapshot, and keeps a newer game message for the same match', () => {
    expect(apply(initialRoomState, snapshot({ matchId: matchA, seq: 4, state: { s: 4 } })).game).toEqual({ matchId: matchA, seq: 4, state: { s: 4 }, events: [] });
    const newer = apply(initialRoomState, snapshot(), gameMessage(matchA, 9));
    expect(apply(newer, snapshot({ matchId: matchA, seq: 4, state: { s: 4 } }, 2)).game?.seq).toBe(9);
    expect(apply(newer, snapshot({ matchId: matchB, seq: 1, state: {} }, 2)).game?.matchId).toBe(matchB);
    expect(apply(newer, snapshot(null, 2)).game).toBeNull();
  });

  it('clears the game on match.started, match.rematch and match.returnedToLobby', () => {
    for (const kind of ['match.started', 'match.rematch', 'match.returnedToLobby']) {
      const base = apply(initialRoomState, snapshot(), gameMessage(matchA, 2));
      expect(apply(base, event(2, kind)).game).toBeNull();
    }
  });

  it('keeps the game when other room events arrive', () => {
    const base = apply(initialRoomState, snapshot(), gameMessage(matchA, 2));
    expect(apply(base, event(2, 'match.ended')).game?.seq).toBe(2);
  });

  it('does not touch the room version or ask for a resync because of game messages', () => {
    const base = apply(initialRoomState, snapshot());
    const next = apply(base, gameMessage(matchA, 1), gameMessage(matchA, 2), gameMessage(matchA, 5));
    expect(next.version).toBe(base.version);
    expect(next.needsResync).toBe(false);
    expect(apply(next, event(2, 'match.ended')).needsResync).toBe(false);
  });
});
