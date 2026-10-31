import type { LudoMatchView } from '@myarena/ludo';

/** Shown only to the viewer while their seat is away: the game is playing for them until they come back. */
export function AwayBanner({ view, onResume }: { view: LudoMatchView; onResume: () => void }) {
  const seat = view.you === null ? null : view.seats[view.you];
  if (!seat?.away) return null;
  return (
    <div className="panel stack ludo-away" role="region" aria-label="Away">
      <p>You are marked away after missing three turns in a row. The game is playing for you.</p>
      <button type="button" className="btn-primary" onClick={onResume}>I&apos;m back</button>
    </div>
  );
}
