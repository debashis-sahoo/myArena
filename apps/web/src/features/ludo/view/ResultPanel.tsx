import type { LudoMatchView } from '@myarena/ludo';

/** The winner and what every seat achieved; the room's own buttons offer a rematch and the way back. */
export function ResultPanel({ view }: { view: LudoMatchView }) {
  const winner = view.winner === null ? null : view.seats[view.winner];
  return (
    <section className="panel stack" aria-labelledby="ludo-result-heading">
      <h2 id="ludo-result-heading" tabIndex={-1}>{winner ? `${winner.label} wins!` : 'The match is over'}</h2>
      <ul>
        {view.seats.map((seat) => (
          <li key={seat.index}>{seat.label}{seat.left ? ' (left the match)' : ''}: {seat.home} of 4 pawns home</li>
        ))}
      </ul>
    </section>
  );
}
