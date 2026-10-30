import { describe, expect, it } from 'vitest';
import { GameRegistry } from '../../src/games/registry.js';
import { createStubGame } from '../../src/games/stub-game.js';
import { startBlockedReason } from '../../src/rooms/match.js';
import { RoomService } from '../../src/rooms/room-service.js';
import { testConfig } from '../integration/helpers.js';

const game = createStubGame();
const catalog = new GameRegistry([game]);

function lobby(playerCount: number) {
  const rooms = new RoomService({ config: testConfig(), games: catalog });
  const { room } = rooms.createRoom('Host');
  for (let index = 0; index < playerCount; index++) rooms.joinRoom(room.invitation.code, `Player ${index}`);
  room.selectedGameId = 'test-stub';
  const players = room.participants.filter((member) => member.role === 'PLAYER');
  players.forEach((player) => { player.ready = true; });
  return { room, host: room.participants[0]!, players };
}

describe('start eligibility', () => {
  it('allows a start when a game is selected, the count fits, and every player is connected and ready', () => {
    expect(startBlockedReason(lobby(1).room, game)).toBeNull();
  });

  it('requires a selected, available game', () => {
    const { room } = lobby(1);
    room.selectedGameId = null;
    expect(startBlockedReason(room, undefined)).toBe('NO_GAME_SELECTED');
    room.selectedGameId = 'removed-game';
    expect(startBlockedReason(room, undefined)).toBe('GAME_UNAVAILABLE');
  });

  it('enforces the game participant range', () => {
    expect(startBlockedReason(lobby(0).room, game)).toBe('START_BLOCKED_PARTICIPANT_COUNT');
    const small = { ...game, descriptor: { ...game.descriptor, maxParticipants: 2 } };
    expect(startBlockedReason(lobby(2).room, small)).toBe('START_BLOCKED_PARTICIPANT_COUNT');
  });

  it('blocks on players who are not ready or disconnected, disconnection first', () => {
    const state = lobby(2);
    state.players[0]!.ready = false;
    expect(startBlockedReason(state.room, game)).toBe('START_BLOCKED_NOT_READY');
    state.players[1]!.connection = 'DISCONNECTED';
    expect(startBlockedReason(state.room, game)).toBe('START_BLOCKED_DISCONNECTED');
  });

  it('counts the host as ready and ignores the host connection state', () => {
    const state = lobby(1);
    state.host.ready = false;
    state.host.connection = 'DISCONNECTED';
    expect(startBlockedReason(state.room, game)).toBeNull();
  });
});
