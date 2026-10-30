import type { CatalogEntry } from '@myarena/protocol';
import { GameArt } from './GameArt';

export function waysToPlay(modes: CatalogEntry['modes']): string {
  const solo = modes.includes('SOLO_AI');
  const online = modes.includes('ONLINE');
  if (solo && online) return 'Solo vs AI & Online';
  return solo ? 'Solo vs AI' : 'Online';
}

export const playerRange = (entry: CatalogEntry): string =>
  entry.minParticipants === entry.maxParticipants ? `${entry.minParticipants} players` : `${entry.minParticipants} to ${entry.maxParticipants} players`;

export const durationRange = (entry: CatalogEntry): string =>
  entry.durationMinutes.min === entry.durationMinutes.max ? `${entry.durationMinutes.min} min` : `${entry.durationMinutes.min} to ${entry.durationMinutes.max} min`;

interface GameTileProps {
  entry: CatalogEntry;
  selected: boolean;
  onSelect: (entry: CatalogEntry) => void;
  onUnavailable: (entry: CatalogEntry) => void;
}

export function GameTile({ entry, selected, onSelect, onUnavailable }: GameTileProps) {
  const playable = entry.status === 'PLAYABLE';
  const base = `tile-${entry.id}`;
  // The name carries every visible word (WCAG 2.5.3), led by the title and status.
  const labelledBy = [`${base}-title`, `${base}-status`, entry.test ? `${base}-test` : null, `${base}-details`].filter(Boolean).join(' ');
  return (
    <button
      type="button" id={base} className={`tile${selected ? ' tile--selected' : ''}`}
      aria-labelledby={labelledBy}
      {...(playable ? { 'aria-pressed': selected } : { 'aria-disabled': true })}
      onClick={() => (playable ? onSelect(entry) : onUnavailable(entry))}
    >
      <GameArt art={entry.art} />
      <span className="tile-heading">
        <span id={`${base}-title`} className="tile-title">{entry.name}</span>{' '}
        <span id={`${base}-status`} className={`badge ${playable ? 'badge--playable' : 'badge--soon'}`}>{playable ? 'Playable' : 'Coming soon'}</span>{' '}
        {entry.test ? <span id={`${base}-test`} className="badge badge--test">Test game</span> : null}
      </span>{' '}
      <span id={`${base}-details`} className="tile-details">
        <span className="tile-description">{entry.description}</span>{' '}
        <span className="tile-meta">{playerRange(entry)}</span>{' '}
        <span className="tile-meta">{durationRange(entry)}</span>{' '}
        <span className="tile-meta">{waysToPlay(entry.modes)}</span>
      </span>
    </button>
  );
}
