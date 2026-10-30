import type { GameMatchProps } from '../../games/registry';
import { MatchView } from './MatchView';
import { useRoomGame } from './useRoomGame';

/** The online match: feeds the shared match view from the room's game channel. */
export function LudoMatch({ game, run }: GameMatchProps) {
  const { view, seq, error, roll, move } = useRoomGame(game, run);
  if (!view) return <p role="status">Preparing the match…</p>;
  if (view.kind === 'WAITING') {
    return (
      <section className="panel stack" aria-labelledby="ludo-waiting-heading">
        <h2 id="ludo-waiting-heading">A Ludo match is in progress</h2>
        <p>You will be able to join the next one.</p>
      </section>
    );
  }
  return <MatchView view={view} seq={seq} error={error} onRoll={() => void roll()} onMove={(pawn) => void move(pawn)} />;
}
