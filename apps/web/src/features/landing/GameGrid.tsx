import type { ReactNode } from 'react';
import type { CatalogEntry } from '@myarena/protocol';
import type { CatalogState } from './useCatalog';
import { GameTile } from './GameTile';

interface GameGridProps {
  state: CatalogState;
  selectedId: string | null;
  onSelect: (entry: CatalogEntry) => void;
  onUnavailable: (entry: CatalogEntry) => void;
  onRetry: () => void;
  /** Rendered directly below the Playable group, where the options panel sits. */
  afterPlayable?: ReactNode;
}

function TileList({ entries, selectedId, onSelect, onUnavailable }: Pick<GameGridProps, 'selectedId' | 'onSelect' | 'onUnavailable'> & { entries: CatalogEntry[] }) {
  return (
    <ul className="tile-grid">
      {entries.map((entry) => (
        <li key={entry.id}><GameTile entry={entry} selected={entry.id === selectedId} onSelect={onSelect} onUnavailable={onUnavailable} /></li>
      ))}
    </ul>
  );
}

export function GameGrid({ state, selectedId, onSelect, onUnavailable, onRetry, afterPlayable }: GameGridProps) {
  if (state.status === 'loading') return <p role="status" className="muted">Loading games…</p>;
  if (state.status === 'error') {
    return (
      <div role="alert" className="banner stack">
        <p>The games could not be loaded. Check your connection, then try again. You can still join a room with a code below.</p>
        <div><button type="button" onClick={onRetry}>Try again</button></div>
      </div>
    );
  }
  const playable = state.entries.filter((entry) => entry.status === 'PLAYABLE');
  const soon = state.entries.filter((entry) => entry.status === 'COMING_SOON');
  const handlers = { selectedId, onSelect, onUnavailable };
  return (
    <>
      <section aria-labelledby="games-heading" className="stack">
        <h2 id="games-heading" tabIndex={-1}>Playable Games</h2>
        {playable.length > 0
          ? <TileList entries={playable} {...handlers} />
          : <p className="panel">No games are ready to play yet, but new ones are on the way. You can still join a friend&rsquo;s room with a code below.</p>}
      </section>
      {afterPlayable}
      {soon.length > 0 ? (
        <section aria-labelledby="catalog-heading" className="stack">
          <h2 id="catalog-heading">Future Arena Catalog</h2>
          <TileList entries={soon} {...handlers} />
        </section>
      ) : null}
    </>
  );
}
