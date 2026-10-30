import { useState, type FormEvent } from 'react';
import { ErrorSummary, type FormError } from '../../a11y/ErrorSummary';
import { getPreferences } from '../../platform/preferences';
import { validateName } from './entry-errors';
import { useEntrySubmit } from './useEntrySubmit';

export function JoinRoomForm({ initialCode = '', heading = 'Join a room' }: { initialCode?: string; heading?: string }) {
  const [code, setCode] = useState(initialCode);
  const [name, setName] = useState(() => getPreferences().displayName);
  const { errors, setErrors, busy, submit, inputsChanged } = useEntrySubmit('join-name');

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const found: FormError[] = [];
    if (!code.trim()) found.push({ message: 'Enter the room code.', nextStep: 'Ask the host for the code or the invite link.', fieldId: 'join-code' });
    const checked = validateName(name, 'join-name');
    if ('errors' in checked) found.push(...checked.errors);
    if (found.length || !('name' in checked)) { setErrors(found); return; }
    await submit('/api/rooms/join', { code, displayName: checked.name });
  }

  return (
    <section aria-labelledby="join-heading" className="panel">
      <h2 id="join-heading">{heading}</h2>
      <form onSubmit={onSubmit} noValidate className="stack">
        <ErrorSummary errors={errors} />
        <div className="field">
          <label htmlFor="join-code">Room code</label>
          <input id="join-code" name="code" autoComplete="off" autoCapitalize="characters" spellCheck={false} value={code}
            onChange={(event) => { setCode(event.target.value); inputsChanged(); }} />
        </div>
        <div className="field">
          <label htmlFor="join-name">Display name</label>
          <input id="join-name" name="displayName" autoComplete="nickname" value={name}
            onChange={(event) => { setName(event.target.value); inputsChanged(); }} />
        </div>
        <button type="submit" className="btn-primary" disabled={busy}>{busy ? 'Joining…' : 'Join room'}</button>
      </form>
    </section>
  );
}
