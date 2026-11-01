import { useEffect, useRef, type CSSProperties, type ReactElement } from 'react';
import { COLOR_HEX, PAWNS_PER_PLAYER, type LudoState } from '@myarena/shared';
import { Avatar } from '../../art/Avatars';
import { Confetti } from '../../components/common/Confetti';
import type { PlayerInfo } from './playerInfo';

interface Props {
  state: LudoState;
  info: Map<string, PlayerInfo>;
  youId: string;
  onHub: () => void;
}

/** Winner announcement and standings (pawns home per player) with a way back to the Hub. */
export function ResultsOverlay({ state, info, youId, onHub }: Props): ReactElement | null {
  const button = useRef<HTMLButtonElement>(null);
  const open = state.phase === 'finished';

  useEffect(() => {
    if (open) button.current?.focus();
  }, [open]);

  if (!open) return null;
  const winner = state.winner ? info.get(state.winner) : undefined;
  const youWon = state.winner === youId;

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
        <button type="button" ref={button} className="btn lime" onClick={onHub}>
          Back to Hub
        </button>
      </div>
    </div>
  );
}
