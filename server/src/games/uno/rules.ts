import {
  unoCardOf,
  type UnoColor,
  type UnoDirection,
  type UnoEffect,
  type UnoPending,
  type UnoPhase,
  type UnoStanding,
} from '@myarena/shared';

/** What the rules need to know about the table. A `Match` (or an `UnoTable` plus the viewer's `drawn`) maps onto it directly. */
export interface RuleTable {
  /** Card id on top of the Discard Pile. */
  top: number;
  activeColor: UnoColor;
  pending: UnoPending | null;
  phase: UnoPhase;
  /** The card the player just drew and may play (phase 'drawn'), otherwise null. */
  drawn: number | null;
  direction: UnoDirection;
}

/** A seat in slot order (left seats stay in the list). */
export interface SeatRef {
  playerId: string;
  status: 'active' | 'left';
}

export interface SeatLike extends SeatRef {
  hand: readonly number[];
}

export interface NamedSeatLike extends SeatLike {
  name: string;
}

/** Colour, number or kind match against the top card; Wilds always match. Ignores pending penalties and phases. */
export function matches(card: number, top: number, activeColor: UnoColor): boolean {
  const c = unoCardOf(card);
  if (c.color === null || c.color === activeColor) return true;
  const t = unoCardOf(top);
  return c.kind === 'number' ? t.kind === 'number' && t.rank === c.rank : t.kind === c.kind;
}

/** May the player whose turn it is play this card now? Order: phase 'drawn', pending penalty, then `matches`. */
export function canPlay(table: RuleTable, card: number): boolean {
  if (table.phase === 'drawn') return card === table.drawn;
  if (table.phase !== 'turn') return false;
  if (table.pending) return unoCardOf(card).kind === table.pending.kind;
  return matches(card, table.top, table.activeColor);
}

/** The cards of `hand` that `canPlay`; empty in phases 'settling' and 'finished'. */
export function playable(table: RuleTable, hand: readonly number[]): number[] {
  return hand.filter((id) => canPlay(table, id));
}

/** True when a penalty is pending and `hand` holds a draw card of its kind (a Draw 2 on a Draw 2, a Wild Draw 4 on a Wild Draw 4). Phase is ignored. */
export function canStack(table: RuleTable, hand: readonly number[]): boolean {
  const kind = table.pending?.kind;
  return kind !== undefined && hand.some((id) => unoCardOf(id).kind === kind);
}

/** Index of the seat reached by passing `steps` active seats from `fromIndex` in `direction`; -1 when no seat is active. */
export function nextActive(
  seats: readonly { status: 'active' | 'left' }[],
  fromIndex: number,
  direction: UnoDirection,
  steps = 1,
): number {
  const n = seats.length;
  if (!seats.some((s) => s.status === 'active')) return -1;
  let index = fromIndex;
  let moved = 0;
  while (moved < steps) {
    index = (index + direction + n) % n;
    if (seats[index]?.status === 'active') moved++;
  }
  return index;
}

export interface PlayEffect {
  /** For the `play` event. A two-seat Reverse stays 'reverse'. */
  effect: UnoEffect;
  activeColor: UnoColor;
  direction: UnoDirection;
  /** The pending total after the card (this card included), or null. */
  pending: UnoPending | null;
  /** Active seats to pass from the player, in the returned `direction`: 1, or 2 for a Skip and a two-seat Reverse. */
  advance: number;
  /** The seat passed over by a Skip or a two-seat Reverse. */
  skipped: string | null;
}

/**
 * Effects of a legal play by the seat at `fromIndex` (the caller has checked legality and, for a Wild, the colour).
 * The next turn belongs to `nextActive(seats, fromIndex, result.direction, result.advance)`.
 */
export function applyEffect(
  table: RuleTable,
  seats: readonly SeatRef[],
  fromIndex: number,
  card: number,
  chosenColor: UnoColor | null,
): PlayEffect {
  const c = unoCardOf(card);
  const result: PlayEffect = {
    effect: 'none',
    activeColor: c.color ?? chosenColor ?? table.activeColor,
    direction: table.direction,
    pending: null,
    advance: 1,
    skipped: null,
  };
  const passedOver = (direction: UnoDirection): string | null => seats[nextActive(seats, fromIndex, direction, 1)]?.playerId ?? null;
  const running = (kind: 'draw2' | 'wild4', add: number): UnoPending => ({
    kind,
    total: (table.pending?.kind === kind ? table.pending.total : 0) + add,
  });

  switch (c.kind) {
    case 'skip':
      result.effect = 'skip';
      result.advance = 2;
      result.skipped = passedOver(result.direction);
      break;
    case 'reverse':
      result.effect = 'reverse';
      result.direction = table.direction === 1 ? -1 : 1;
      if (seats.filter((s) => s.status === 'active').length === 2) {
        result.advance = 2;
        result.skipped = passedOver(result.direction);
      }
      break;
    case 'draw2':
      result.effect = 'draw2';
      result.pending = running('draw2', 2);
      break;
    case 'wild':
      result.effect = 'wild';
      break;
    case 'wild4':
      result.effect = 'wild4';
      result.pending = running('wild4', 4);
      break;
    case 'number':
      break;
  }
  return result;
}

/** Index of the dealer for match `matchNo` (1-based): the active seat before the first player, who is active seat `(matchNo - 1) mod n`. */
export function dealerOf(seats: readonly SeatRef[], matchNo: number): number {
  const active = seats.flatMap((s, i) => (s.status === 'active' ? [i] : []));
  const n = active.length;
  return n === 0 ? -1 : (active[(((matchNo - 1) % n) - 1 + n) % n] as number);
}

export interface StartEffect {
  effect: UnoEffect;
  activeColor: UnoColor;
  direction: UnoDirection;
  /** Seat whose turn starts. */
  first: number;
  /** The seat passed over by a starting Skip or a two-seat Reverse. */
  skipped: string | null;
  /** A starting Draw 2: this seat draws `count` at once, cannot stack, and loses the turn (`first` is the seat after it). */
  draw: { seat: number; count: number } | null;
}

/** FR-019: the starting card (never a Wild) acts as if the dealer at `dealer` had played it. */
export function startCardEffect(card: number, seats: readonly SeatRef[], dealer: number): StartEffect {
  const activeColor = unoCardOf(card).color as UnoColor;
  const table: RuleTable = { top: card, activeColor, pending: null, phase: 'settling', drawn: null, direction: 1 };
  const played = applyEffect(table, seats, dealer, card, null);
  if (played.effect === 'draw2') {
    const target = nextActive(seats, dealer, 1, 1);
    const first = nextActive(seats, target, 1, 1);
    return { effect: 'draw2', activeColor, direction: 1, first, skipped: null, draw: { seat: target, count: 2 } };
  }
  return {
    effect: played.effect,
    activeColor,
    direction: played.direction,
    first: nextActive(seats, dealer, played.direction, played.advance),
    skipped: played.skipped,
    draw: null,
  };
}

/** Winner first, then active seats by fewest cards (ties by slot), then left seats in slot order with `cardsLeft: null`. */
export function standingsOf(seats: readonly NamedSeatLike[], winnerId: string): UnoStanding[] {
  const slotted = seats.map((seat, slot) => ({ seat, slot }));
  const winner = slotted.find((x) => x.seat.playerId === winnerId && x.seat.status === 'active');
  const others = slotted
    .filter((x) => x !== winner && x.seat.status === 'active')
    .sort((a, b) => a.seat.hand.length - b.seat.hand.length || a.slot - b.slot);
  const left = slotted.filter((x) => x.seat.status === 'left');
  const standings: UnoStanding[] = [];
  for (const { seat } of [...(winner ? [winner] : []), ...others]) {
    standings.push({ playerId: seat.playerId, name: seat.name, place: standings.length + 1, cardsLeft: seat.hand.length, status: 'active' });
  }
  for (const { seat } of left) {
    standings.push({ playerId: seat.playerId, name: seat.name, place: standings.length + 1, cardsLeft: null, status: 'left' });
  }
  return standings;
}
