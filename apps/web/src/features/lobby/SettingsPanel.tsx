import { useEffect, useState, type FormEvent } from 'react';
import type { RoomSettings } from '@myarena/protocol';
import { describeGameSettings } from './GameSelect';
import type { RunIntent } from './useRoom';

export function SettingsPanel({ settings, seats, isHost, editable, run }: {
  settings: RoomSettings; seats: number; isHost: boolean; editable: boolean; run: RunIntent;
}) {
  const [value, setValue] = useState(String(settings.maxParticipants));
  const [error, setError] = useState<string | null>(null);
  useEffect(() => setValue(String(settings.maxParticipants)), [settings.maxParticipants]);
  const gameSettings = describeGameSettings(settings.gameSettings);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(await run({ type: 'settings.update', changes: { maxParticipants: Number(value) } }));
  }

  return (
    <section aria-labelledby="settings-heading" className="panel stack">
      <h2 id="settings-heading">Room settings</h2>
      {isHost && editable ? (
        <form onSubmit={submit} className="stack">
          <div className="field">
            <label htmlFor="max-participants">Maximum participants (1 to 100)</label>
            <input id="max-participants" type="number" inputMode="numeric" min={Math.max(1, seats)} max={100} value={value}
              onChange={(event) => setValue(event.target.value)} />
          </div>
          <button type="submit">Save settings</button>
        </form>
      ) : (
        <p>Maximum participants: {settings.maxParticipants}</p>
      )}
      {gameSettings.length ? <ul aria-label="Game settings">{gameSettings.map((line) => <li key={line}>{line}</li>)}</ul> : null}
      {error ? <p role="alert">{error}</p> : null}
    </section>
  );
}
