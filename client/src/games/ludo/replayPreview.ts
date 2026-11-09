import type { LudoColor, LudoState } from '@myarena/shared';
import type { PlayerInfo } from './playerInfo';

/** Who plays the next match, who left and who is disconnected; used to show the next table and to disable the button (the server decides). */
export interface ReplayPreview {
  /** Players still seated, in their existing order. */
  players: { playerId: string; name: string; color: LudoColor }[];
  /** Names of players who left the match. */
  left: string[];
  /** Names of seated humans who are not connected right now. */
  disconnected: string[];
  /** At least two players and nobody disconnected. */
  canStart: boolean;
}

/** "A", "A and B" or "A, B and C". */
export function formatNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

export function buildReplayPreview(state: LudoState, info: Map<string, PlayerInfo>): ReplayPreview {
  const nameOf = (id: string): string => info.get(id)?.name ?? 'Player';
  const seated = state.players.filter((p) => p.status === 'active');
  const players = seated.map((p) => ({ playerId: p.playerId, name: nameOf(p.playerId), color: p.color }));
  const left = state.players.filter((p) => p.status === 'left').map((p) => nameOf(p.playerId));
  const disconnected = seated
    .filter((p) => p.kind === 'human' && (info.get(p.playerId)?.connection ?? 'gone') !== 'connected')
    .map((p) => nameOf(p.playerId));
  return { players, left, disconnected, canStart: players.length >= 2 && disconnected.length === 0 };
}
