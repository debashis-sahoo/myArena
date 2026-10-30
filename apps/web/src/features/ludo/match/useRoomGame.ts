import { useCallback, useMemo, useState } from 'react';
import type { LudoMatchView, LudoView } from '@myarena/ludo';
import type { GameState } from '../../../platform/room-state';
import type { RunIntent } from '../../lobby/useRoom';

/** Narrows an untrusted game state to a Ludo view, or null when it is not one. */
export function parseLudoView(value: unknown): LudoView | null {
  if (typeof value !== 'object' || value === null) return null;
  const kind = (value as { kind?: unknown }).kind;
  if (kind === 'WAITING') return { kind: 'WAITING' };
  if (kind !== 'MATCH') return null;
  const view = value as Partial<LudoMatchView>;
  return Array.isArray(view.seats) && typeof view.turn === 'object' && view.turn !== null ? (value as LudoMatchView) : null;
}

/** The viewer's Ludo view from the room's game state, and a way to send actions to the server. */
export function useRoomGame(game: GameState | null, run: RunIntent) {
  const [error, setError] = useState<string | null>(null);
  const view = useMemo(() => (game ? parseLudoView(game.state) : null), [game]);

  const act = useCallback(async (action: { type: 'roll' | 'resume' } | { type: 'move'; payload: { pawn: number } }) => {
    const problem = await run({ type: 'game.action', action });
    setError(problem);
    return problem;
  }, [run]);

  return {
    view,
    seq: game?.seq ?? 0,
    error,
    roll: () => act({ type: 'roll' }),
    move: (pawn: number) => act({ type: 'move', payload: { pawn } }),
    resume: () => act({ type: 'resume' }),
  };
}
