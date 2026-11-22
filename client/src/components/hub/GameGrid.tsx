import type { ReactElement } from 'react';
import { GAMES, type GameDefinition } from '@myarena/shared';
import type { HubEntryMode } from '../../routes/HubPage';
import { GameCard } from './GameCard';

export function GameGrid({
  onPlay,
  entryMode,
}: {
  onPlay?: (game: GameDefinition) => void;
  entryMode: HubEntryMode;
}): ReactElement {
  const activeGames = GAMES.filter((game) => game.status === 'active');

  return (
    <main className="game-grid" aria-label={entryMode === 'host' ? 'Create a game room' : 'Available games'}>
      {activeGames.map((game, i) => (
        <GameCard key={game.id} game={game} index={i} onPlay={onPlay} entryMode={entryMode} />
      ))}
    </main>
  );
}
