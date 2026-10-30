import { describe, expect, it } from 'vitest';
import { GameRegistry } from '../../src/games/registry.js';
import { createOnlineStubGame, createStubGame } from '../../src/games/stub-game.js';
import { allowedRange, validateRoomSetup } from '../../src/rooms/room-setup.js';

const games = new GameRegistry([
  createStubGame(),
  createOnlineStubGame(),
  createStubGame({ descriptor: { id: 'solo-only', modes: ['SOLO_AI'], minParticipants: 1, maxParticipants: 1 } }),
  createStubGame({ descriptor: { id: 'wide-min', minParticipants: 1, maxParticipants: 8, defaultParticipants: undefined } }),
]);
const fields = (result: ReturnType<typeof validateRoomSetup>) => (result.ok ? [] : result.fieldErrors?.map((error) => error.field));

describe('allowedRange', () => {
  it('is max(2, game min) to min(100, game max)', () => {
    expect(allowedRange({ minParticipants: 1, maxParticipants: 8 })).toEqual({ lo: 2, hi: 8 });
    expect(allowedRange({ minParticipants: 3, maxParticipants: 250 })).toEqual({ lo: 3, hi: 100 });
  });
});

describe('validateRoomSetup', () => {
  it('keeps the old behavior when neither field is given', () => {
    expect(validateRoomSetup(games, {})).toEqual({ ok: true, setup: null });
  });

  it('defaults to the game default, else the range maximum', () => {
    expect(validateRoomSetup(games, { gameId: 'test-online' })).toEqual({ ok: true, setup: { gameId: 'test-online', maxParticipants: 4 } });
    expect(validateRoomSetup(games, { gameId: 'test-stub' })).toEqual({ ok: true, setup: { gameId: 'test-stub', maxParticipants: 100 } });
  });

  it('accepts the bounds and rejects values outside them with a field error', () => {
    expect(validateRoomSetup(games, { gameId: 'test-online', maxParticipants: 2 }).ok).toBe(true);
    expect(validateRoomSetup(games, { gameId: 'test-online', maxParticipants: 6 }).ok).toBe(true);
    for (const value of [1, 7, 0, -3, 101, 2.5, Number.NaN]) {
      const result = validateRoomSetup(games, { gameId: 'test-online', maxParticipants: value });
      expect(result, String(value)).toMatchObject({ ok: false, code: 'VALIDATION_FAILED' });
      expect(fields(result)).toEqual(['maxParticipants']);
    }
  });

  it('never allows fewer than 2 seats even when the game minimum is 1', () => {
    expect(validateRoomSetup(games, { gameId: 'wide-min', maxParticipants: 1 }).ok).toBe(false);
    expect(validateRoomSetup(games, { gameId: 'wide-min', maxParticipants: 2 }).ok).toBe(true);
    expect(validateRoomSetup(games, { gameId: 'wide-min' })).toEqual({ ok: true, setup: { gameId: 'wide-min', maxParticipants: 8 } });
  });

  it('requires a game when a count is given', () => {
    expect(validateRoomSetup(games, { maxParticipants: 4 })).toMatchObject({ ok: false, code: 'VALIDATION_FAILED' });
    expect(fields(validateRoomSetup(games, { maxParticipants: 4 }))).toEqual(['maxParticipants']);
  });

  it('treats unknown games and games without online rooms as unavailable', () => {
    expect(validateRoomSetup(games, { gameId: 'missing' })).toEqual({ ok: false, code: 'GAME_UNAVAILABLE' });
    expect(validateRoomSetup(games, { gameId: 'solo-only' })).toEqual({ ok: false, code: 'GAME_UNAVAILABLE' });
    expect(validateRoomSetup(games, { gameId: 'missing', maxParticipants: 3 })).toEqual({ ok: false, code: 'GAME_UNAVAILABLE' });
  });
});
