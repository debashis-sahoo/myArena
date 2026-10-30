import type { ActionResult, Clock, GameAction, GameLifecycle } from '@myarena/game-sdk';
import type { RejectionCode } from '@myarena/protocol';
import type { GameCatalog } from './catalog.js';
import { ok, reject, type Context, type Outcome } from './outcome.js';
import type { Room } from './room.js';

export function startBlockedReason(room: Room, game: GameLifecycle | undefined): RejectionCode | null {
  if (room.selectedGameId === null) return 'NO_GAME_SELECTED';
  if (!game) return 'GAME_UNAVAILABLE';
  const { minParticipants, maxParticipants } = game.descriptor;
  if (room.participants.length < minParticipants || room.participants.length > maxParticipants) return 'START_BLOCKED_PARTICIPANT_COUNT';
  const players = room.participants.filter((member) => member.role === 'PLAYER');
  if (players.some((player) => player.connection !== 'CONNECTED')) return 'START_BLOCKED_DISCONNECTED';
  if (players.some((player) => !player.ready)) return 'START_BLOCKED_NOT_READY';
  return null;
}

// Drives the game lifecycle through the SDK only; it holds no game rules.
export class MatchManager {
  private readonly tokens = new Map<string, object>();
  constructor(private readonly clock: Clock) {}

  start(ctx: Context, kind: 'match.started' | 'match.rematch'): Outcome {
    const { room, games, emit } = ctx;
    const expected = kind === 'match.started' ? room.status === 'LOBBY' : room.matchStatus === 'ENDED';
    if (!expected) return reject('MATCH_NOT_ENDED');
    const game = room.selectedGameId ? games.get(room.selectedGameId) : undefined;
    const reason = startBlockedReason(room, game);
    if (reason || !game) return reject(reason ?? 'GAME_UNAVAILABLE');
    const token = {};
    this.tokens.set(room.id, token);
    room.status = 'IN_MATCH';
    room.matchStatus = 'IN_PROGRESS';
    emit(kind, {});
    game.onMatchStart({
      roomId: room.id,
      participantIds: room.participants.map((member) => member.id),
      settings: room.settings.gameSettings,
      clock: this.clock,
      endMatch: () => this.end(ctx, game, token),
    });
    return ok;
  }

  // The actor's room role is never consulted: the host is held to the same game rules as any player.
  submitAction(room: Room, actorId: string, action: GameAction, games: GameCatalog): ActionResult {
    if (room.matchStatus !== 'IN_PROGRESS' || !room.participants.some((member) => member.id === actorId)) {
      return { accepted: false, reason: 'NOT_IN_MATCH' };
    }
    const game = room.selectedGameId ? games.get(room.selectedGameId) : undefined;
    if (!game?.onAction) return { accepted: false, reason: 'NO_ACTIONS' };
    return game.onAction(room.id, actorId, action);
  }

  abort(room: Room, games: GameCatalog): void {
    this.tokens.delete(room.id);
    if (room.matchStatus === 'IN_PROGRESS') (room.selectedGameId ? games.get(room.selectedGameId) : undefined)?.onMatchEnd(room.id);
  }

  returnToLobby({ room, emit }: Context): Outcome {
    if (room.matchStatus !== 'ENDED') return reject('MATCH_NOT_ENDED');
    room.status = 'LOBBY';
    room.matchStatus = 'NONE';
    emit('match.returnedToLobby', {});
    return ok;
  }

  private end({ room, emit }: Context, game: GameLifecycle, token: object): void {
    if (this.tokens.get(room.id) !== token || room.matchStatus !== 'IN_PROGRESS') return;
    this.tokens.delete(room.id);
    room.matchStatus = 'ENDED';
    game.onMatchEnd(room.id);
    emit('match.ended', {});
  }
}
