import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import type { ClientIntent } from '@myarena/protocol';
import { GameRegistry } from '../../src/games/registry.js';
import { createChannelStubGame, createOnlineStubGame, createStubGame } from '../../src/games/stub-game.js';
import { RoomService } from '../../src/rooms/room-service.js';
import { TestClock, testConfig } from '../integration/helpers.js';

const intent = (type: string, extra: object = {}) => ({ v: 1, clientActionId: randomUUID(), type, ...extra }) as unknown as ClientIntent;

function room(players = 1) {
  const rooms = new RoomService({ config: testConfig(), clock: new TestClock(), games: new GameRegistry([createStubGame(), createOnlineStubGame(), createChannelStubGame()]) });
  const host = rooms.createRoom('Host');
  const others = Array.from({ length: players }, (_, index) => rooms.joinRoom(host.room.invitation.code, `Player ${index + 1}`));
  const act = (entry: { participant: Parameters<RoomService['perform']>[1] }, type: string, extra?: object) => rooms.perform(host.room, entry.participant, intent(type, extra));
  return { rooms, host, others, act };
}

describe('the room limit follows the selected game', () => {
  it('rejects a limit above the selected game maximum', () => {
    const { host, act } = room(1);
    expect(act(host, 'game.select', { gameId: 'test-channel' }).ok).toBe(true);
    expect(act(host, 'settings.update', { changes: { maxParticipants: 5 } })).toEqual({ ok: false, code: 'VALIDATION_FAILED' });
    expect(act(host, 'settings.update', { changes: { maxParticipants: 4 } }).ok).toBe(true);
    expect(host.room.settings.maxParticipants).toBe(4);
  });

  it('keeps the 1 to 100 range while no game is selected', () => {
    const { host, act } = room(1);
    expect(act(host, 'settings.update', { changes: { maxParticipants: 100 } }).ok).toBe(true);
    expect(act(host, 'settings.update', { changes: { maxParticipants: 101 } })).toEqual({ ok: false, code: 'VALIDATION_FAILED' });
  });

  it('lowers a larger limit when a smaller game is selected', () => {
    const { host, act } = room(1);
    expect(host.room.settings.maxParticipants).toBe(100);
    expect(act(host, 'game.select', { gameId: 'test-channel' }).ok).toBe(true);
    expect(host.room.settings.maxParticipants).toBe(4);
  });

  it('refuses to select a game when more people hold seats than its maximum', () => {
    const { host, act } = room(5);
    expect(act(host, 'game.select', { gameId: 'test-channel' })).toEqual({ ok: false, code: 'START_BLOCKED_PARTICIPANT_COUNT' });
    expect(host.room.selectedGameId).toBeNull();
    expect(act(host, 'game.select', { gameId: 'test-online' }).ok).toBe(true);
    expect(host.room.settings.maxParticipants).toBe(6);
  });

  it('keeps a limit already below the game maximum', () => {
    const { host, act } = room(1);
    act(host, 'settings.update', { changes: { maxParticipants: 3 } });
    expect(act(host, 'game.select', { gameId: 'test-channel' }).ok).toBe(true);
    expect(host.room.settings.maxParticipants).toBe(3);
  });
});
