import { useCallback, useEffect, useMemo, useState } from 'react';
import type { LudoMatchView, LudoView } from '@myarena/ludo';
import { useAnnouncer } from '../../../a11y/announcer';
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

export const TIMEOUT_NOTICE = 'You ran out of time, so the game played for you.';
const NOTICE_MS = 10_000;

const playedForViewer = (events: readonly unknown[], you: number | null): boolean => you !== null && events.some((event) => {
  const entry = event as { kind?: unknown; seat?: unknown; reason?: unknown };
  return entry.kind === 'AUTO_PLAYED' && entry.seat === you && entry.reason === 'TIMEOUT';
});

/** The viewer's Ludo view from the room's game state, and a way to send actions to the server. */
export function useRoomGame(game: GameState | null, run: RunIntent) {
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const announce = useAnnouncer();
  const view = useMemo(() => (game ? parseLudoView(game.state) : null), [game]);
  const you = view?.kind === 'MATCH' ? view.you : null;
  const seq = game?.seq ?? 0;
  const events = game?.events;

  // A notice about automatic play is shown for a while, and only for a live update: a snapshot after a reconnect has no events.
  useEffect(() => {
    if (!events || !playedForViewer(events, you)) return undefined;
    setNotice(TIMEOUT_NOTICE);
    announce(TIMEOUT_NOTICE);
    const timer = window.setTimeout(() => setNotice(null), NOTICE_MS);
    return () => window.clearTimeout(timer);
  }, [seq, events, you, announce]);

  const act = useCallback(async (action: { type: 'roll' | 'resume' } | { type: 'move'; payload: { pawn: number } }) => {
    const problem = await run({ type: 'game.action', action });
    setError(problem);
    return problem;
  }, [run]);

  return {
    view,
    seq,
    events,
    error,
    notice,
    roll: () => act({ type: 'roll' }),
    move: (pawn: number) => act({ type: 'move', payload: { pawn } }),
    resume: () => act({ type: 'resume' }),
  };
}
