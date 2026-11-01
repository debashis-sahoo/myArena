import type { ReactElement } from 'react';
import { GAMES, type GameDefinition } from '@myarena/shared';
import { GameCard } from './GameCard';

export function GameGrid({ onPlay }: { onPlay: (game: GameDefinition) => void }): ReactElement {
  return (
    <main className="game-grid" aria-label="Games">
      {GAMES.map((game, i) => (
        <GameCard key={game.id} game={game} index={i} onPlay={onPlay} />
      ))}
    </main>
  );
}
