import type { GameLifecycle } from '@myarena/game-sdk';
import type { ClientIntent, RejectionCode, RoomSettings } from '@myarena/protocol';
import { ok, reject, type Context, type Outcome } from './outcome.js';
import type { Room } from './room.js';

export type SettingsChanges = Extract<ClientIntent, { type: 'settings.update' }>['changes'];
export type SettingsResult = { ok: true; settings: RoomSettings } | { ok: false; code: RejectionCode };

const asGameSettings = (value: Record<string, unknown>) => value as RoomSettings['gameSettings'];

export function setReady({ actor, emit }: Context, ready: boolean): Outcome {
  if (actor.ready !== ready) {
    actor.ready = ready;
    emit('participant.ready', { participantId: actor.id, ready });
  }
  return ok;
}

export function selectGame({ room, games, emit }: Context, gameId: string): Outcome {
  if (room.status !== 'LOBBY') return reject('MATCH_NOT_ENDED');
  const game = games.get(gameId);
  if (!game) return reject('GAME_UNAVAILABLE');
  const defaults = game.descriptor.settingsSchema.safeParse({});
  const gameMax = game.descriptor.maxParticipants;
  if (room.participants.length > gameMax) return reject('START_BLOCKED_PARTICIPANT_COUNT');
  room.selectedGameId = gameId;
  room.settings = { ...room.settings, maxParticipants: Math.min(room.settings.maxParticipants, gameMax), gameSettings: defaults.success ? asGameSettings(defaults.data) : {} };
  emit('game.selected', { gameId, settings: room.settings });
  return ok;
}

export function validateSettingsChange(room: Room, game: GameLifecycle | undefined, changes: SettingsChanges): SettingsResult {
  let { maxParticipants, gameSettings } = room.settings;
  if (changes.maxParticipants !== undefined) {
    const next = changes.maxParticipants;
    if (!Number.isInteger(next) || next < 1 || next > 100 || next < room.participants.length) return { ok: false, code: 'VALIDATION_FAILED' };
    if (game && next > game.descriptor.maxParticipants) return { ok: false, code: 'VALIDATION_FAILED' };
    maxParticipants = next;
  }
  if (changes.gameSettings !== undefined) {
    if (!game) return { ok: false, code: 'NO_GAME_SELECTED' };
    const parsed = game.descriptor.settingsSchema.safeParse({ ...gameSettings, ...changes.gameSettings });
    if (!parsed.success) return { ok: false, code: 'VALIDATION_FAILED' };
    gameSettings = asGameSettings(parsed.data);
  }
  return { ok: true, settings: { maxParticipants, gameSettings } };
}

export function updateSettings({ room, games, emit }: Context, changes: SettingsChanges): Outcome {
  if (room.status !== 'LOBBY') return reject('MATCH_NOT_ENDED');
  const game = room.selectedGameId ? games.get(room.selectedGameId) : undefined;
  const result = validateSettingsChange(room, game, changes);
  if (!result.ok) return reject(result.code);
  if (JSON.stringify(result.settings) !== JSON.stringify(room.settings)) {
    room.settings = result.settings;
    emit('settings.updated', { settings: room.settings });
  }
  return ok;
}

export function removeMember({ room, actor, emit }: Context, targetId: string): Outcome {
  if (targetId === actor.id) return reject('CANNOT_REMOVE_SELF');
  const index = room.participants.findIndex((member) => member.id === targetId);
  if (index < 0) return reject('TARGET_NOT_FOUND');
  room.participants.splice(index, 1);
  emit('participant.removed', { participantId: targetId });
  return ok;
}
