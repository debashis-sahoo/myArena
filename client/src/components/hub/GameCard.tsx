import type { CSSProperties, ReactElement } from 'react';
import type { GameDefinition } from '@myarena/shared';
import { BingoArt } from '../../art/BingoArt';
import { HousieArt } from '../../art/HousieArt';
import { LudoArt } from '../../art/LudoArt';
import { SnakesLaddersArt } from '../../art/SnakesLaddersArt';
import { UnoArt } from '../../art/UnoArt';
import { sfx } from '../../audio/sfx';
import type { HubEntryMode } from '../../routes/HubPage';

const ART: Record<string, () => ReactElement> = {
  ludo: LudoArt,
  'snakes-and-ladders': SnakesLaddersArt,
  housie: HousieArt,
  bingo: BingoArt,
  uno: UnoArt,
};

interface Props {
  game: GameDefinition;
  index: number;
  onPlay?: (game: GameDefinition) => void;
  entryMode: HubEntryMode;
}

/** Uniform glossy card. Active games lift on hover or tap; coming-soon games are frosted and inert. */
export function GameCard({ game, index, onPlay, entryMode }: Props): ReactElement {
  const Art = ART[game.id] ?? LudoArt;
  const available = game.status === 'active';
  const interactive = available && entryMode === 'host' && onPlay !== undefined;
  const style = {
    '--accent': game.theme.accent,
    '--accent-2': game.theme.accent2,
    '--i': index,
  } as CSSProperties;

  const play = (): void => {
    sfx.tap();
    onPlay?.(game);
  };

  return (
    <article
      className={`game-card reveal ${interactive ? 'active' : available ? 'showcase' : 'soon'}`}
      style={style}
      aria-label={game.name}
      onClick={interactive ? play : undefined}
    >
      <span className={`card-badge ${available ? 'live' : ''}`}>{available ? 'Active' : 'Coming Soon'}</span>
      <div className="card-inner">
        <div className="card-art">
          <Art />
        </div>
        <h2 className="card-title">{game.name}</h2>
        <p className="card-tagline">{game.tagline}</p>
        {interactive ? (
          <button
            type="button"
            className="btn card-play"
            onClick={(e) => {
              e.stopPropagation();
              play();
            }}
          >
            PLAY NOW
          </button>
        ) : (
          <div className="soon-label" aria-disabled="true">
            {available ? 'ASK A HOST FOR THE ROOM CODE' : 'COMING SOON'}
          </div>
        )}
      </div>
    </article>
  );
}
