import type { UnoColor, UnoDirection, UnoPending, UnoPhase } from '@myarena/shared';
import type { GameContext } from '../registry.js';

export interface Seat {
  playerId: string;
  name: string;
  kind: 'human' | 'bot';
  /** 0 = host seat; seats stay in slot order. */
  slot: number;
  /** Card ids. Private: never sent to another viewer. */
  hand: number[];
  status: 'active' | 'left';
  calledUno: boolean;
  /** Consecutive missed turns. */
  missed: number;
  /** Two misses reached (shows the warning). */
  warned: boolean;
}

export interface CatchWindow {
  victim: string;
  /** ctx.now() epoch when the window ends. */
  closesAt: number;
  cancel: () => void;
}

/**
 * Invariants:
 * - Every card id 0..107 appears exactly once across all hands, `drawPile`, `discard` and (momentarily) the `drawn` slot.
 * - `turn` is null only when `phase` is 'finished'.
 * - `pending` is non-null only when `turn` is the target of a Draw 2 or Wild Draw 4.
 * - At most one catch window is open.
 */
export interface Match {
  ctx: GameContext;
  /** Slot order; left seats stay in the list. */
  seats: Seat[];
  /** 1 for the first deal, +1 on each Play again. */
  matchNo: number;
  /** Index into `seats`. */
  dealer: number;
  /** Top = last element. Never sent. */
  drawPile: number[];
  /** Top = last element. */
  discard: number[];
  /** playerId whose turn it is (or will be once settled). */
  turn: string | null;
  /** +1 = seat order (clockwise on screen), -1 = reversed. */
  direction: UnoDirection;
  activeColor: UnoColor;
  pending: UnoPending | null;
  phase: UnoPhase;
  /** The playable card just drawn. */
  drawn: { playerId: string; card: number } | null;
  catchWindow: CatchWindow | null;
  /** ctx.now() epoch when the human countdown ends. */
  deadline: number | null;
  /** Bot playerId during its pause. */
  thinking: string | null;
  /** Last event sequence. */
  seq: number;
  /** Cancel functions for every pending ctx.schedule. */
  timers: Set<() => void>;
  releasing: Map<string, 'inactive'>;
  disposed: boolean;
}
