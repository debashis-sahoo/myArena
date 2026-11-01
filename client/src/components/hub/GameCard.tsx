import type { CSSProperties, ReactElement } from 'react';
import type { GameDefinition } from '@myarena/shared';
import { BingoArt } from '../../art/BingoArt';
import { HousieArt } from '../../art/HousieArt';
import { LudoArt } from '../../art/LudoArt';
import { SnakesLaddersArt } from '../../art/SnakesLaddersArt';
import { sfx } from '../../audio/sfx';

const ART: Record<string, () => ReactElement> = {
  ludo: LudoArt,
  'snakes-and-ladders': SnakesLaddersArt,
  housie: HousieArt,
  bingo: BingoArt,
};

interface Props {
  game: GameDefinition;
  index: number;
  onPlay: (game: GameDefinition) => void;
}

/** Uniform glossy card. Active games lift on hover or tap; coming-soon games are frosted and inert. */
export function GameCard({ game, index, onPlay }: Props): ReactElement {
  const Art = ART[game.id] ?? LudoArt;
  const active = game.status === 'active';
  const style = {
    '--accent': game.theme.accent,
    '--accent-2': game.theme.accent2,
    '--i': index,
  } as CSSProperties;

  const play = (): void => {
    sfx.tap();
    onPlay(game);
  };

  return (
    <article
      className={`game-card reveal ${active ? 'active' : 'soon'}`}
      style={style}
      aria-label={game.name}
      onClick={active ? play : undefined}
    >
      <span className={`card-badge ${active ? 'live' : ''}`}>{active ? 'Active' : 'Coming Soon'}</span>
      <div className="card-inner">
        <div className="card-art">
          <Art />
        </div>
        <h2 className="card-title">{game.name}</h2>
        <p className="card-tagline">{game.tagline}</p>
        {active ? (
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
            COMING SOON
          </div>
        )}
      </div>
    </article>
  );
}
