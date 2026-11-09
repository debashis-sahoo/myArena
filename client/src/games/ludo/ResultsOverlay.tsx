import { useEffect, useRef, type CSSProperties, type ReactElement } from 'react';
import { COLOR_HEX, PAWNS_PER_PLAYER, type LudoState } from '@myarena/shared';
import { Avatar } from '../../art/Avatars';
import { Confetti } from '../../components/common/Confetti';
import type { PlayerInfo } from './playerInfo';
import { formatNames, type ReplayPreview } from './replayPreview';

interface Props {
  state: LudoState;
  info: Map<string, PlayerInfo>;
  youId: string;
  onHub: () => void;
  isHost: boolean;
  hostName: string;
  preview: ReplayPreview;
  /** A Play again request is waiting for the server. */
  pending: boolean;
  onAgain: () => void;
}

/** Why the host cannot start the next match right now (the server checks the same things in the same order). */
function blockedReason(preview: ReplayPreview): string | null {
  if (preview.players.length < 2) return 'At least two players are needed to play again.';
  const away = preview.disconnected[0];
  return away ? `Waiting for ${away} to reconnect.` : null;
}

/** Winner announcement and standings, then Play again for the host (the players still seated) and a way back to the Hub. */
export function ResultsOverlay({ state, info, youId, onHub, isHost, hostName, preview, pending, onAgain }: Props): ReactElement | null {
  const hubButton = useRef<HTMLButtonElement>(null);
  const againButton = useRef<HTMLButtonElement>(null);
  const open = state.phase === 'finished';
  const canAgain = isHost && preview.canStart;

  useEffect(() => {
    if (!open) return;
    (canAgain ? againButton : hubButton).current?.focus();
  }, [open, canAgain]);

  if (!open) return null;
  const winner = state.winner ? info.get(state.winner) : undefined;
  const youWon = state.winner === youId;
  const reason = isHost ? blockedReason(preview) : null;
  const againLabel = pending ? 'Starting...' : preview.left.length > 0 ? `Play again (${preview.players.length} players)` : 'Play again';

  return (
    <div className="results-backdrop">
      <Confetti count={34} />
      <div className="results" role="dialog" aria-modal="true" aria-label="Match results">
        <span className="trophy" aria-hidden="true">
          🏆
        </span>
        <h2 className="results-title">{youWon ? 'You win!' : `${winner?.name ?? 'A player'} wins!`}</h2>
        <ol className="standings">
          {state.standings.map((s) => {
            const who = info.get(s.playerId);
            return (
              <li key={s.playerId} className="standing" style={{ ['--c' as string]: COLOR_HEX[s.color] ?? '#fff' } as CSSProperties}>
                <span className="rank">{s.rank}</span>
                <Avatar k={who?.avatar ?? 'fox'} size={34} ring={COLOR_HEX[s.color]} />
                <span className="standing-name">
                  {who?.name ?? 'Player'}
                  {s.playerId === youId && <em className="you"> (you)</em>}
                </span>
                <span className="standing-home">
                  {s.home}/{PAWNS_PER_PLAYER} home
                </span>
              </li>
            );
          })}
        </ol>
        {preview.left.length > 0 && (
          <p className="next-match" role="status">
            Next match: {formatNames(preview.players.map((p) => p.name))}. {formatNames(preview.left)} left.
          </p>
        )}
        {isHost ? (
          <div className="results-actions">
            <button
              type="button"
              ref={againButton}
              className="btn lime"
              disabled={!preview.canStart || pending}
              aria-describedby={reason ? 'results-reason' : undefined}
              onClick={onAgain}
            >
              {againLabel}
            </button>
            {reason && (
              <p id="results-reason" className="results-reason" role="status">
                {reason}
              </p>
            )}
            <button type="button" ref={hubButton} className="btn ghost" onClick={onHub}>
              Back to Hub
            </button>
          </div>
        ) : (
          <div className="results-actions">
            <p className="results-wait" role="status">
              Waiting for {hostName} to start the next match.
            </p>
            <button type="button" ref={hubButton} className="btn lime" onClick={onHub}>
              Back to Hub
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
