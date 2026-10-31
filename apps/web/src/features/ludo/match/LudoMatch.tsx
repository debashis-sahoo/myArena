import type { GameMatchProps } from '../../games/registry';
import { ChatPanel } from '../../chat/ChatPanel';
import { MatchLayout } from './MatchLayout';
import { useRoomGame } from './useRoomGame';

/** The online match: feeds the shared match view from the room's game channel. */
export function LudoMatch({ lobby, game, run }: GameMatchProps) {
  const { view, seq, events, error, notice, roll, move, resume } = useRoomGame(game, run);
  // The room page leaves the chat to this screen during a match, so every branch keeps it.
  if (!view) {
    return (
      <div className="stack">
        <p role="status">Preparing the match…</p>
        <ChatPanel messages={lobby.chat} run={run} />
      </div>
    );
  }
  if (view.kind === 'WAITING') {
    return (
      <div className="stack">
        <section className="panel stack" aria-labelledby="ludo-waiting-heading">
          <h2 id="ludo-waiting-heading">A Ludo match is in progress</h2>
          <p>You will be able to join the next one.</p>
        </section>
        <ChatPanel messages={lobby.chat} run={run} />
      </div>
    );
  }
  return <MatchLayout view={view} seq={seq} events={events} error={error} notice={notice} onResume={() => void resume()} messages={lobby.chat} run={run} onRoll={() => void roll()} onMove={(pawn) => void move(pawn)} />;
}
