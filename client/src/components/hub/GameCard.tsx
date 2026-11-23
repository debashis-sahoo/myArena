import { useState, type CSSProperties, type ReactElement } from 'react';
import type { GameDefinition } from '@myarena/shared';
import { HubArtFallback } from '../../art/HubArtFallback';
import { sfx } from '../../audio/sfx';
import type { HubEntryMode } from '../../routes/HubPage';

const GAME_ART: Readonly<Record<string, string>> = {
  ludo: '/brand/games/ludo.webp',
  housie: '/brand/games/housie.webp',
  bingo: '/brand/games/bingo.webp',
  uno: '/brand/games/uno.webp',
};

interface Props {
  game: GameDefinition;
  index: number;
  onPlay?: (game: GameDefinition) => void;
  entryMode: HubEntryMode;
}

/** Premium active-game card. Host mode launches; player mode remains a clear non-interactive showcase. */
export function GameCard({ game, index, onPlay, entryMode }: Props): ReactElement {
  const [artFailed, setArtFailed] = useState(false);
  const artPath = GAME_ART[game.id];
  const interactive = entryMode === 'host' && onPlay !== undefined;
  const style = {
    '--accent': game.theme.accent,
    '--accent-2': game.theme.accent2,
    '--i': index,
  } as CSSProperties;

  const play = (): void => {
    if (!interactive) return;
    sfx.tap();
    onPlay?.(game);
  };

  return (
    <article
      className={`game-card reveal ${interactive ? 'active' : 'showcase'}`}
      style={style}
      aria-label={game.name}
      onClick={interactive ? play : undefined}
    >
      <span className="card-badge live">Active</span>
      <div className="card-inner">
        <div className="card-art">
          {artPath && !artFailed ? (
            <img
              src={artPath}
              alt=""
              width="768"
              height="768"
              loading={index < 2 ? 'eager' : 'lazy'}
              decoding="async"
              fetchPriority={index === 0 ? 'high' : 'auto'}
              onError={() => setArtFailed(true)}
            />
          ) : (
            <HubArtFallback />
          )}
        </div>
        <h2 className="card-title">{game.name}</h2>
        <p className="card-tagline">{game.tagline}</p>
        {interactive ? (
          <button
            type="button"
            className="btn card-play"
            onClick={(event) => {
              event.stopPropagation();
              play();
            }}
          >
            PLAY NOW
          </button>
        ) : (
          <div className="soon-label">ASK A HOST FOR THE ROOM CODE</div>
        )}
      </div>
    </article>
  );
}
