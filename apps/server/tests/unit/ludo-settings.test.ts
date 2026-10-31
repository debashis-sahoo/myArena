import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import type { ClientIntent } from '@myarena/protocol';
import { GameRegistry } from '../../src/games/registry.js';
import { createLudoGame } from '../../src/games/ludo/ludo-game.js';
import { ludoSettingsSchema } from '../../src/games/ludo/settings.js';
import { RoomService } from '../../src/rooms/room-service.js';
import { TestClock, testConfig } from '../integration/helpers.js';

describe('Ludo settings schema', () => {
  it('defaults to the Classic theme and a 60 second turn limit', () => {
    expect(ludoSettingsSchema.parse({})).toEqual({ theme: 'classic', turnLimitSeconds: 60 });
  });

  it('accepts exactly the five themes', () => {
    for (const theme of ['classic', 'super-heroes', 'halloween', 'diwali', 'winter']) {
      expect(ludoSettingsSchema.safeParse({ theme }).success).toBe(true);
    }
    for (const theme of ['Classic', 'neon', '', 3, null]) expect(ludoSettingsSchema.safeParse({ theme }).success).toBe(false);
  });

  it('accepts exactly the turn limits 0, 30, 60 and 90', () => {
    for (const turnLimitSeconds of [0, 30, 60, 90]) expect(ludoSettingsSchema.safeParse({ turnLimitSeconds }).success).toBe(true);
    for (const turnLimitSeconds of [1, 45, 120, -30, '60', null]) expect(ludoSettingsSchema.safeParse({ turnLimitSeconds }).success).toBe(false);
  });

  it('rejects unknown keys', () => {
    expect(ludoSettingsSchema.safeParse({ theme: 'classic', extra: true }).success).toBe(false);
  });
});

describe('the platform and Ludo settings', () => {
  const intent = (type: string, extra: object = {}) => ({ v: 1, clientActionId: randomUUID(), type, ...extra }) as unknown as ClientIntent;

  it('merges a theme change, and refuses any change once the match has started', () => {
    const rooms = new RoomService({ config: testConfig(), clock: new TestClock(), games: new GameRegistry([createLudoGame()]) });
    const host = rooms.createRoom('Host');
    const friend = rooms.joinRoom(host.room.invitation.code, 'Friend');
    const run = (who: { participant: Parameters<RoomService['perform']>[1] }, type: string, extra?: object) => rooms.perform(host.room, who.participant, intent(type, extra));
    expect(run(host, 'game.select', { gameId: 'ludo' }).ok).toBe(true);
    expect(run(host, 'settings.update', { changes: { gameSettings: { theme: 'diwali' } } }).ok).toBe(true);
    expect(host.room.settings.gameSettings).toEqual({ theme: 'diwali', turnLimitSeconds: 60 });
    expect(run(host, 'settings.update', { changes: { gameSettings: { theme: 'neon' } } })).toEqual({ ok: false, code: 'VALIDATION_FAILED' });
    expect(run(host, 'settings.update', { changes: { maxParticipants: 5 } })).toEqual({ ok: false, code: 'VALIDATION_FAILED' });
    expect(run(friend, 'ready.set', { ready: true }).ok).toBe(true);
    expect(run(host, 'match.start').ok).toBe(true);
    expect(run(host, 'settings.update', { changes: { gameSettings: { theme: 'winter' } } }).ok).toBe(false);
    expect(host.room.settings.gameSettings).toEqual({ theme: 'diwali', turnLimitSeconds: 60 });
  });
});
