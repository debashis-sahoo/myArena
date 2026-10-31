import { isProtectedRing, ringIndexOf, type LudoMatchView } from '@myarena/ludo';

/** Pawns are numbered 1 to 4 for people; the game uses 0 to 3. */
export const pawnNumber = (pawn: number): number => pawn + 1;

function positionText(step: number): string {
  if (step === -1) return 'in base';
  if (step >= 51) return 'in its home lane';
  return step === 0 ? 'on its start square' : `${step} steps from start`;
}

/** Where a pawn lands and what that does, in plain words (for the chooser buttons). */
export function describePawnMove(view: LudoMatchView, pawn: number): string {
  const seat = view.seats[view.you ?? -1];
  const dice = view.turn.dice;
  if (!seat || dice === null) return `Pawn ${pawnNumber(pawn)}`;
  const from = seat.pawns[pawn]!;
  const to = from === -1 ? 0 : from + dice;
  let effect: string;
  if (to === 56) effect = 'and reach home';
  else if (to >= 51) effect = 'and enter the home lane';
  else {
    const ring = ringIndexOf(seat.color, to)!;
    const victim = isProtectedRing(ring) ? undefined : view.seats.find((other) => other.index !== seat.index && !other.left
      && other.pawns.some((step) => ringIndexOf(other.color, step) === ring));
    if (victim) effect = `and capture ${victim.label}'s pawn`;
    else if (from === -1) effect = 'to leave base onto the start square';
    else if (isProtectedRing(ring)) effect = 'and land on a protected square';
    else effect = `to ${to} steps from start`;
  }
  return `Pawn ${pawnNumber(pawn)}, ${positionText(from)}: move ${dice} ${effect}`;
}

/** The one plain-language sentence that describes what is happening now. `revealed` is false while this viewer's die is still rolling. */
export function statusText(view: LudoMatchView, settled: boolean, revealed = true): string {
  const { turn } = view;
  if (turn.phase === 'ENDED') {
    const winner = view.winner === null ? null : view.seats[view.winner];
    return winner ? `${winner.label} wins the match.` : 'The match is over.';
  }
  const seat = turn.seat === null ? null : view.seats[turn.seat];
  if (!seat) return '';
  const mine = turn.seat === view.you;
  const who = mine ? 'You' : seat.label;
  if (turn.phase === 'ROLL') return mine ? 'Your turn: roll the die.' : `${seat.label}'s turn to roll.`;
  if (!revealed) return mine ? 'You are rolling the die.' : `${seat.label} is rolling the die.`;
  if (!settled) return `${who} rolled a ${turn.dice}.`;
  if (turn.legalPawns.length === 0) return `${who} rolled a ${turn.dice}. No pawn can move.`;
  return mine ? `You rolled a ${turn.dice}. Choose a pawn to move.` : `${seat.label} rolled a ${turn.dice} and is choosing a pawn.`;
}

const COLOR_NAMES: Record<string, string> = { RED: 'Red', GREEN: 'Green', YELLOW: 'Yellow', BLUE: 'Blue' };

function pawnPlace(step: number): string {
  if (step === 0) return 'on its start square';
  if (step >= 51) return `in its home lane, ${step - 50} of 5`;
  return `${step} steps from start`;
}

/** One line per seat, in turn order, for the visually hidden board description. */
export function describeSeat(view: LudoMatchView, index: number): string {
  const seat = view.seats[index]!;
  const name = `${COLOR_NAMES[seat.color] ?? seat.color}, ${seat.label}${index === view.you ? ' (you)' : ''}`;
  if (seat.left) return `${name}, left the match`;
  const base = seat.pawns.filter((step) => step === -1).length;
  const parts: string[] = [];
  if (base > 0) parts.push(`${base} ${base === 1 ? 'pawn' : 'pawns'} in base`);
  for (const step of seat.pawns) if (step >= 0 && step < 56) parts.push(`1 pawn ${pawnPlace(step)}`);
  if (seat.home > 0) parts.push(`${seat.home} ${seat.home === 1 ? 'pawn' : 'pawns'} home`);
  return `${name}, ${parts.join(', ')}${seat.away ? ', away' : ''}`;
}

/** The hidden board description: every seat, then the current phase. */
export function describeBoard(view: LudoMatchView): string[] {
  return [...view.seats.map((_, index) => describeSeat(view, index)), statusText(view, true)];
}

type Announced = { kind?: unknown; seat?: unknown; pawn?: unknown; from?: unknown; to?: unknown; captured?: { seat?: unknown; pawn?: unknown }; reason?: unknown };

/**
 * The extra announcement for one live update (moves, captures, automatic play, away, a seat leaving), or null. The status
 * line already covers turns, and a roll is announced by the die when it settles, so neither is repeated here.
 */
export function announcementFor(view: LudoMatchView, events: readonly unknown[]): string | null {
  const sentences: string[] = [];
  const who = (seat: unknown): string => (typeof seat === 'number' && seat === view.you ? 'You' : view.seats[Number(seat)]?.label ?? 'A player');
  for (const raw of events) {
    const event = raw as Announced;
    switch (event.kind) {
      case 'MOVED': {
        const base = `${who(event.seat)} moved pawn ${pawnNumber(Number(event.pawn))} from ${event.from === -1 ? 'base' : `${String(event.from)} steps`} to ${String(event.to)} steps`;
        const victim = event.captured ? ` and captured ${event.captured.seat === view.you ? 'your pawn' : `${who(event.captured.seat)}'s pawn`}` : '';
        sentences.push(`${base}${victim}.`);
        break;
      }
      case 'AUTO_PLAYED': sentences.push(`${who(event.seat)} ${event.reason === 'AWAY' ? 'is away, so the game played for them' : 'ran out of time, so the game played for them'}.`); break;
      case 'AWAY_SET': sentences.push(`${who(event.seat)} is away.`); break;
      case 'AWAY_CLEARED': sentences.push(`${who(event.seat)} is back.`); break;
      case 'SEAT_LEFT': sentences.push(`${who(event.seat)} left the match.`); break;
      case 'WON': sentences.push(`${who(event.seat)} won the match.`); break;
      default: break;
    }
  }
  return sentences.length > 0 ? sentences.join(' ') : null;
}
