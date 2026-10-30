import { useState } from 'react';
import type { RoomSettings } from '@myarena/protocol';
import type { RunIntent } from './useRoom';

export interface GameSummary { id: string; name: string; minParticipants: number; maxParticipants: number; }

export function GameSelect({ games, selectedGameId, isHost, editable, run }: {
  games: GameSummary[]; selectedGameId: string | null; isHost: boolean; editable: boolean; run: RunIntent;
}) {
  const [error, setError] = useState<string | null>(null);
  const selected = games.find((game) => game.id === selectedGameId);
  return (
    <section aria-labelledby="game-heading" className="panel stack">
      <h2 id="game-heading">Game</h2>
      {isHost && editable ? (
        <div className="field">
          <label htmlFor="game-select">Choose a game</label>
          <select id="game-select" value={selectedGameId ?? ''} disabled={games.length === 0}
            onChange={async (event) => event.target.value && setError(await run({ type: 'game.select', gameId: event.target.value }))}>
            <option value="" disabled>{games.length === 0 ? 'No games available' : 'Select a game'}</option>
            {games.map((game) => <option key={game.id} value={game.id}>{game.name}</option>)}
          </select>
        </div>
      ) : (
        <p>{selected ? `Selected game: ${selected.name}` : 'No game selected yet.'}</p>
      )}
      {selected ? <p>{selected.minParticipants} to {selected.maxParticipants} participants.</p> : null}
      {error ? <p role="alert">{error}</p> : null}
    </section>
  );
}

export function describeGameSettings(settings: RoomSettings['gameSettings']): string[] {
  return Object.entries(settings).map(([key, value]) => `${key}: ${String(value)}`);
}
