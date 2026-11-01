import { useCallback, useEffect, useRef, useState } from 'react';
import {
  HOME_CELEBRATE_MS,
  ROLL_TUMBLE_MS,
  moveDurationMs,
  type LudoEvent,
  type LudoState,
} from '@myarena/shared';
import { sfx } from '../../audio/sfx';
import { toast } from '../../components/common/Toast';
import { commitGame, getRoomView, sendGameAction, skipGameToLatest, useRoom } from '../../state/roomStore';
import { useReducedMotion } from '../../state/viewport';
import { REDUCED_STEP_MS } from './anim/hop';

export interface AnimState {
  id: number;
  event: LudoEvent;
}

export interface LudoApi {
  state: LudoState | null;
  anim: AnimState | null;
  youId: string;
  isMyTurn: boolean;
  canRoll: boolean;
  /** My pawns that may move right now. */
  eligible: number[];
  countdownMs: number | null;
  pending: 'roll' | 'move' | null;
  /** A short result line for the console ("Roll again!", "No pawn can move"). */
  notice: string | null;
  roll: () => void;
  move: (pawn: number) => void;
}

/** `useLudo` once a game snapshot exists. */
export type ReadyLudo = LudoApi & { state: LudoState };

/** How long clients take to show an event; mirrors the server's pacing (shared/timing.ts). */
function durationOf(ev: LudoEvent, reduced: boolean): number {
  if (ev.type === 'rolled') return reduced ? 400 : ROLL_TUMBLE_MS;
  if (ev.type === 'moved') {
    const hops = ev.path.length;
    const captured = ev.captured.length > 0;
    if (reduced) return hops * REDUCED_STEP_MS + 150 + (captured ? 300 : 0);
    return moveDurationMs(hops, captured) + (ev.reachedHome ? HOME_CELEBRATE_MS : 0);
  }
  return 0;
}

function noticeFor(ev: LudoEvent): string | null | undefined {
  switch (ev.type) {
    case 'turn':
      return ev.reason === 'bonus' ? 'Roll again!' : null;
    case 'no_move':
      return ev.reason === 'three_sixes' ? 'Three sixes in a row: turn lost' : 'No pawn can move';
    case 'timeout':
      return "Time's up: played automatically";
    case 'moved':
      if (ev.captured.length > 0) return 'Captured! Roll again';
      if (ev.reachedHome) return 'A pawn is home! Roll again';
      return ev.bonus ? 'Roll again!' : null;
    case 'finished':
      return null;
    default:
      return undefined;
  }
}

/**
 * The game slice as the screen needs it: plays queued events in order (tumble, then hops, then the next state),
 * skips animations after a join, reconnect, hidden tab or a long backlog, and sends intents to the server.
 */
export function useLudo(youId: string): LudoApi {
  const { game } = useRoom();
  const reduced = useReducedMotion();
  const { state, queue } = game;
  const [anim, setAnim] = useState<AnimState | null>(null);
  const [pending, setPending] = useState<'roll' | 'move' | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const busy = useRef(false);
  const idRef = useRef(0);
  const timer = useRef<number | undefined>(undefined);
  const stampRef = useRef({ rev: -1, at: Date.now() });

  if (state && stampRef.current.rev !== state.matchRev) stampRef.current = { rev: state.matchRev, at: Date.now() };

  // Event driver: one event at a time, strictly in seq order.
  useEffect(() => {
    if (busy.current || queue.length === 0) return;
    if (document.hidden || queue.length > 3 || !state) {
      skipGameToLatest();
      return;
    }
    const ev = queue[0] as LudoEvent;
    const n = noticeFor(ev);
    if (n !== undefined) setNotice(n);

    if (ev.type !== 'rolled' && ev.type !== 'moved') {
      if (ev.type === 'finished') sfx.success();
      commitGame(ev.state, 1);
      return;
    }
    busy.current = true;
    const id = ++idRef.current;
    setAnim({ id, event: ev });
    // Rolls show the new (rolling) state while the die tumbles; moves keep the old board until the hops are done.
    if (ev.type === 'rolled') commitGame(ev.state, 1);
    timer.current = window.setTimeout(() => {
      busy.current = false;
      timer.current = undefined;
      if (ev.type === 'moved' && getRoomView().game.queue[0]?.seq === ev.seq) commitGame(ev.state, 1);
      setAnim(null);
    }, durationOf(ev, reduced));
  }, [queue, state, anim, reduced]);

  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
    },
    [],
  );

  // Coming back to a hidden tab: show the newest state at once instead of replaying a backlog.
  useEffect(() => {
    const onVisible = (): void => {
      if (document.hidden) return;
      window.clearTimeout(timer.current);
      timer.current = undefined;
      busy.current = false;
      setAnim(null);
      skipGameToLatest();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  // A server event answers the request in flight.
  const rev = state?.matchRev;
  useEffect(() => {
    setPending(null);
  }, [rev]);
  useEffect(() => {
    if (!pending) return;
    const id = window.setTimeout(() => setPending(null), 6000);
    return () => window.clearTimeout(id);
  }, [pending]);

  // Local countdown from the snapshot's remaining duration.
  const timed = state?.remainingMs !== null && state?.remainingMs !== undefined;
  useEffect(() => {
    if (!timed) return;
    const id = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(id);
  }, [timed, rev]);
  const countdownMs =
    state && state.remainingMs !== null
      ? Math.min(state.remainingMs, Math.max(0, state.remainingMs - (now - stampRef.current.at)))
      : null;

  const settled = !anim && queue.length === 0;
  const isMyTurn = !!state && state.turn === youId;
  const canRoll = isMyTurn && settled && !pending && state?.phase === 'waiting_roll' && state.remainingMs !== null;
  const eligible = isMyTurn && settled && !pending && state?.phase === 'waiting_move' ? state.eligible : [];

  const latest = useRef({ canRoll, eligible });
  latest.current = { canRoll, eligible };

  const roll = useCallback((): void => {
    if (!latest.current.canRoll) return;
    setPending('roll');
    sfx.tap();
    void sendGameAction({ type: 'roll' }).then((res) => {
      if (!res.ok) {
        setPending(null);
        toast(res.message);
      }
    });
  }, []);

  const move = useCallback((pawn: number): void => {
    if (!latest.current.eligible.includes(pawn)) return;
    setPending('move');
    void sendGameAction({ type: 'move', pawn }).then((res) => {
      if (!res.ok) {
        setPending(null);
        toast(res.message);
      }
    });
  }, []);

  return { state, anim, youId, isMyTurn, canRoll, eligible, countdownMs, pending, notice, roll, move };
}
