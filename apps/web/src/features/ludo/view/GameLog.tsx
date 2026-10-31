import type { LudoMatchView } from '@myarena/ludo';

/** Everything that happened, in plain words, oldest first. It is separate from the room chat. */
export function GameLog({ view, className = '' }: { view: LudoMatchView; className?: string }) {
  return (
    <section aria-labelledby="ludo-log-heading" className={`panel stack ludo-log ${className}`.trim()}>
      <h2 id="ludo-log-heading">Game log</h2>
      <div tabIndex={0} role="region" aria-label="Game log entries" className="ludo-log-scroll">
        <ol>
          {view.log.map((entry) => <li key={entry.n}>{entry.text}</li>)}
        </ol>
      </div>
    </section>
  );
}
