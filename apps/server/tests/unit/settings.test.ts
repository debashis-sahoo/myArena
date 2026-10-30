import { describe, expect, it } from 'vitest';
import { GameRegistry } from '../../src/games/registry.js';
import { createStubGame } from '../../src/games/stub-game.js';
import { validateSettingsChange } from '../../src/rooms/lobby.js';
import { RoomService } from '../../src/rooms/room-service.js';
import { testConfig } from '../integration/helpers.js';

const game = createStubGame();

function roomWith(playerCount: number) {
  const rooms = new RoomService({ config: testConfig(), games: new GameRegistry([game]) });
  const { room } = rooms.createRoom('Host');
  for (let index = 0; index < playerCount; index++) rooms.joinRoom(room.invitation.code, `Player ${index}`);
  return room;
}

describe('platform settings', () => {
  it('accepts 1 to 100 and rejects values outside the range', () => {
    const room = roomWith(0);
    expect(validateSettingsChange(room, undefined, { maxParticipants: 1 })).toMatchObject({ ok: true });
    expect(validateSettingsChange(room, undefined, { maxParticipants: 100 })).toMatchObject({ ok: true });
    for (const maxParticipants of [0, 101, -1, 1.5]) {
      expect(validateSettingsChange(room, undefined, { maxParticipants })).toEqual({ ok: false, code: 'VALIDATION_FAILED' });
    }
  });

  it('never goes below the current seat count', () => {
    const room = roomWith(2);
    expect(validateSettingsChange(room, undefined, { maxParticipants: 2 })).toEqual({ ok: false, code: 'VALIDATION_FAILED' });
    expect(validateSettingsChange(room, undefined, { maxParticipants: 3 })).toMatchObject({ ok: true, settings: { maxParticipants: 3 } });
  });
});

describe('game settings', () => {
  it('require a selected game', () => {
    expect(validateSettingsChange(roomWith(1), undefined, { gameSettings: { durationSeconds: 5 } })).toEqual({ ok: false, code: 'NO_GAME_SELECTED' });
  });

  it('are validated by the game schema, including its defaults and bounds', () => {
    const room = roomWith(1);
    expect(validateSettingsChange(room, game, { gameSettings: { durationSeconds: 3600 } })).toMatchObject({ ok: true, settings: { gameSettings: { durationSeconds: 3600 } } });
    expect(validateSettingsChange(room, game, { gameSettings: {} })).toMatchObject({ ok: true, settings: { gameSettings: { durationSeconds: 30 } } });
    for (const durationSeconds of [0, 3601, 1.5, 'ten']) {
      expect(validateSettingsChange(room, game, { gameSettings: { durationSeconds } })).toEqual({ ok: false, code: 'VALIDATION_FAILED' });
    }
    expect(validateSettingsChange(room, game, { gameSettings: { unknown: 1 } })).toEqual({ ok: false, code: 'VALIDATION_FAILED' });
  });

  it('are not changed when another part of the same change is invalid', () => {
    const room = roomWith(1);
    const before = JSON.stringify(room.settings);
    expect(validateSettingsChange(room, game, { maxParticipants: 5, gameSettings: { durationSeconds: 0 } }).ok).toBe(false);
    expect(JSON.stringify(room.settings)).toBe(before);
  });
});
