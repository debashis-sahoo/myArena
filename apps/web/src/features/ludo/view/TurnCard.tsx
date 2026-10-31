import type { LudoMatchView } from '@myarena/ludo';

/** Whose turn it is, with their colour, and the time left to decide (spoken countdown points stay in the status bar). */
export function TurnCard({ view, seconds }: { view: LudoMatchView; seconds: number | null }) {
  const { seat, phase } = view.turn;
  const current = phase === 'ENDED' || seat === null ? null : view.seats[seat] ?? null;
  const mine = current !== null && seat === view.you;
  const name = phase === 'ENDED' ? 'Match over' : current === null ? 'Waiting' : mine ? 'Your turn' : `${current.label}'s turn`;
  return (
    <div className={`ludo-turn${current ? ` ludo-turn--${current.color.toLowerCase()}` : ''}`} data-turn={current ? current.color.toLowerCase() : 'none'}>
      <span className="ludo-turn-dot" aria-hidden="true" />
      <span className="ludo-turn-name">{name}</span>
      {seconds !== null ? <span className="ludo-countdown" aria-hidden="true">Time left: {seconds} s</span> : null}
    </div>
  );
}
