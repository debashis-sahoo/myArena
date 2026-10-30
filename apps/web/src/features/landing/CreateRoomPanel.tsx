import { useEffect, useState, type FormEvent } from 'react';
import type { CatalogEntry } from '@myarena/protocol';
import { ErrorSummary, type FormError } from '../../a11y/ErrorSummary';
import { ApiError } from '../../platform/api-client';
import { validateName } from '../entry/entry-errors';
import { useEntrySubmit } from '../entry/useEntrySubmit';
import { PlayerCountField } from './PlayerCountField';

interface CreateRoomPanelProps {
  entry: CatalogEntry;
  displayName: string;
  onNameChange: (name: string) => void;
  /** The server no longer offers this game; the page refreshes the catalog and returns to the games. */
  onGameUnavailable: () => void;
}

export function playerRangeFor(entry: Pick<CatalogEntry, 'minParticipants' | 'maxParticipants' | 'defaultParticipants'>) {
  const min = Math.max(2, entry.minParticipants);
  const max = Math.min(100, entry.maxParticipants);
  const initial = Math.min(max, Math.max(min, entry.defaultParticipants));
  return { min, max, initial };
}

export function CreateRoomPanel({ entry, displayName, onNameChange, onGameUnavailable }: CreateRoomPanelProps) {
  const { min, max, initial } = playerRangeFor(entry);
  const [count, setCount] = useState(String(initial));
  const { errors, setErrors, busy, submit, inputsChanged } = useEntrySubmit('create-name', { maxParticipants: 'create-count' });

  useEffect(() => { document.getElementById('create-name')?.focus(); }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const found: FormError[] = [];
    const checked = validateName(displayName, 'create-name');
    if ('errors' in checked) found.push(...checked.errors);
    const parsed = Number(count);
    if (count.trim() === '' || !Number.isInteger(parsed) || parsed < min || parsed > max) {
      found.push({ message: `Choose a number of players from ${min} to ${max}.`, nextStep: 'Pick a number in that range.', fieldId: 'create-count' });
    }
    if (found.length || !('name' in checked)) { setErrors(found); return; }
    const result = await submit('/api/rooms', { displayName: checked.name, gameId: entry.id, maxParticipants: parsed });
    if (!result.ok && result.error instanceof ApiError && result.error.code === 'GAME_UNAVAILABLE') onGameUnavailable();
  }

  const countError = errors.find((error) => error.fieldId === 'create-count')?.message;
  return (
    <form onSubmit={onSubmit} noValidate className="stack" aria-label={`Create a private room for ${entry.name}`}>
      <ErrorSummary errors={errors} />
      <div className="field">
        <label htmlFor="create-name">Display name</label>
        <input id="create-name" name="displayName" autoComplete="nickname" value={displayName}
          onChange={(event) => { onNameChange(event.target.value); inputsChanged(); }} />
      </div>
      <PlayerCountField min={min} max={max} value={count} error={countError} onChange={(value) => { setCount(value); inputsChanged(); }} />
      <div><button type="submit" className="btn-primary" disabled={busy}>{busy ? 'Creating…' : 'Create room'}</button></div>
    </form>
  );
}
