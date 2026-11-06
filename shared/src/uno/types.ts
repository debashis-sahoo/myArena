/** UNO wire types. Authoritative description: specs/006-uno-game-module/contracts/uno-protocol.md and data-model.md section 4. */
import type { UnoColor } from './cards.js';

export type UnoPhase = 'settling' | 'turn' | 'drawn' | 'finished';
export type UnoDirection = 1 | -1;
export type UnoPendingKind = 'draw2' | 'wild4';

export interface UnoPending {
  kind: UnoPendingKind;
  total: number;
}

export interface UnoSeatView {
  playerId: string;
  slot: number;
  name: string;
  kind: 'human' | 'bot';
  status: 'active' | 'left';
  handCount: number;
  calledUno: boolean;
  warned: boolean;
}

export interface UnoStanding {
  playerId: string;
  name: string;
  place: number;
  /** null for a seat that left. */
  cardsLeft: number | null;
  status: 'active' | 'left';
}

/** Public: identical for every viewer. */
export interface UnoTable {
  matchNo: number;
  phase: UnoPhase;
  turn: string | null;
  direction: UnoDirection;
  activeColor: UnoColor;
  /** Card id on top of the Discard Pile. */
  top: number;
  drawCount: number;
  discardCount: number;
  pending: UnoPending | null;
  catchWindow: { victim: string; remainingMs: number } | null;
  /** Human countdown; null for bots, settling and finished. */
  remainingMs: number | null;
  /** playerId of a bot that is thinking. */
  thinking: string | null;
  /** Slot order. */
  players: UnoSeatView[];
  winner: string | null;
  /** Set when finished. */
  standings: UnoStanding[] | null;
}

/** Private: only the viewer's own copy carries it. */
export interface UnoYou {
  playerId: string;
  hand: number[];
  /** Card ids the viewer may play right now. */
  playable: number[];
  /** The card the viewer just drew and may play or keep. */
  drawn: number | null;
  canDraw: boolean;
  canKeep: boolean;
  /** Exactly 2 cards, or a catch window is open against the viewer. */
  canCallUno: boolean;
  unoCalled: boolean;
}

/** The receiver's snapshot (create, join and resume acknowledgements). `you` is null for a viewer who is not seated. */
export interface UnoView {
  seq: number;
  table: UnoTable;
  you: UnoYou | null;
}

export type UnoEffect = 'none' | 'skip' | 'reverse' | 'draw2' | 'wild' | 'wild4';
export type UnoDrawReason = 'turn' | 'pending' | 'timeout' | 'catch' | 'start';
export type UnoCatchCloseReason = 'called' | 'caught' | 'expired' | 'hand_changed' | 'left' | 'finished';

export interface UnoEventBase {
  seq: number;
  table: UnoTable;
  you: UnoYou | null;
}

export type UnoEventPayload =
  | { type: 'deal'; dealer: string }
  | { type: 'turn'; player: string }
  | { type: 'play'; by: string; card: number; color: UnoColor; effect: UnoEffect; skipped?: string; stacked?: boolean }
  | { type: 'draw'; by: string; count: number; why: UnoDrawReason; reshuffled: boolean; cards?: number[] }
  | { type: 'keep'; by: string }
  | { type: 'uno'; by: string }
  | { type: 'catchOpen'; victim: string; windowMs: number }
  | { type: 'caught'; victim: string; by: string }
  | { type: 'catchClosed'; victim: string; reason: UnoCatchCloseReason }
  | { type: 'warning'; player: string }
  | { type: 'timeout'; by: string; action: 'draw' | 'keep' }
  | { type: 'released'; player: string; reason: 'left' | 'inactive' }
  | { type: 'finished'; winner: string; forfeit: boolean };

/** One game:event for one viewer: the step, the public table after it, and the viewer's own private block. */
export type UnoEvent = UnoEventBase & UnoEventPayload;

/** What the server builds before it adds `seq`, `table` and `you` for each viewer. */
export type UnoEventInput = UnoEventPayload;

/** game:action intents. The server schema is the strict version of this union. */
export type UnoAction =
  | { type: 'playCard'; card: number; color?: UnoColor }
  | { type: 'drawCard' }
  | { type: 'keepCard' }
  | { type: 'callUno' }
  | { type: 'catchPlayer'; player: string }
  | { type: 'playAgain' };
