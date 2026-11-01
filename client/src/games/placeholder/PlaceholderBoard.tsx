import type { CSSProperties, ReactElement } from 'react';
import { COLOR_HEX, getGame } from '@myarena/shared';
import { Avatar } from '../../art/Avatars';
import { BingoArt } from '../../art/BingoArt';
import { HousieArt } from '../../art/HousieArt';
import { LudoArt } from '../../art/LudoArt';
import { SnakesLaddersArt } from '../../art/SnakesLaddersArt';
import type { GameBoardProps } from '../types';

const ART: Record<string, () => ReactElement> = {
  ludo: LudoArt,
  'snakes-and-ladders': SnakesLaddersArt,
  housie: HousieArt,
  bingo: BingoArt,
};

/** Placeholder board: shows the game's art, the match state, and the seated players (FR-032). */
export function PlaceholderBoard({ room, matchState, stageSize, reducedMotion }: GameBoardProps): ReactElement {
  const game = getGame(room.gameId);
  const Art = ART[room.gameId] ?? LudoArt;
  const live = matchState === 'in_progress';
  const players = room.seats.flatMap((s) => (s.occupant ? [s.occupant] : []));

  // Everything scales from the stage size so the board never overflows it.
  const style = { '--u': `${Math.max(stageSize, 120) / 100}px` } as CSSProperties;

  return (
    <div className={`placeholder-board ${live ? 'live' : ''} ${reducedMotion ? 'still' : ''}`} style={style}>
      <div className="pb-art">
        <Art />
      </div>
      <div className="pb-status">
        <span className="pb-state">{live ? 'Match in progress' : 'Lobby'}</span>
        <span className="pb-sub">
          {live
            ? `${game?.name ?? 'The game'} board arrives in the next update.`
            : 'Waiting for the host to start the match.'}
        </span>
      </div>
      <ul className="pb-players" aria-label="Players">
        {players.map((p) => (
          <li key={p.playerId} style={{ '--c': COLOR_HEX[p.color] ?? '#fff' } as CSSProperties}>
            <Avatar k={p.avatar} size={Math.max(20, stageSize / 14)} ring={COLOR_HEX[p.color]} />
            <span>{p.displayName}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
