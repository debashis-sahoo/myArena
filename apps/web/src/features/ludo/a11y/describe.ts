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

/** The one plain-language sentence that describes what is happening now. */
export function statusText(view: LudoMatchView, settled: boolean): string {
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
  if (!settled) return `${who} rolled a ${turn.dice}.`;
  if (turn.legalPawns.length === 0) return `${who} rolled a ${turn.dice}. No pawn can move.`;
  return mine ? `You rolled a ${turn.dice}. Choose a pawn to move.` : `${seat.label} rolled a ${turn.dice} and is choosing a pawn.`;
}
