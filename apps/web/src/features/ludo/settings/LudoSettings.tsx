import { useState } from 'react';
import { TURN_LIMITS, type ThemeId, type TurnLimit } from '@myarena/ludo';
import type { GameSettingsProps } from '../../games/registry';
import { RadioGroup } from '../view/RadioGroup';
import { ThemePicker } from '../themes/ThemePicker';
import { themeOf } from '../themes/themes';
import { turnLimitText } from '../themes/names';

const limitOptions: { value: TurnLimit; label: string }[] = [
  { value: 30, label: '30 seconds' }, { value: 60, label: '60 seconds' }, { value: 90, label: '90 seconds' }, { value: 0, label: 'No limit' },
];

const isLimit = (value: unknown): value is TurnLimit => TURN_LIMITS.includes(value as TurnLimit);

// The host changes theme, turn time and room size in the lobby; everyone else, and everyone during a match, reads them.
export function LudoSettings({ settings, isHost, editable, seats, run }: GameSettingsProps) {
  const [error, setError] = useState<string | null>(null);
  const theme = themeOf(settings.gameSettings.theme).id;
  const limit: TurnLimit = isLimit(settings.gameSettings.turnLimitSeconds) ? settings.gameSettings.turnLimitSeconds : 60;
  const send = async (changes: { maxParticipants?: number; gameSettings?: { theme: ThemeId; turnLimitSeconds: TurnLimit } }): Promise<void> => {
    setError(await run({ type: 'settings.update', changes }));
  };
  const sizes = [2, 3, 4].filter((count) => count >= Math.max(2, seats)).map((count) => ({ value: count, label: String(count) }));

  return (
    <section aria-labelledby="ludo-settings-heading" className="panel stack">
      <h2 id="ludo-settings-heading">Room settings</h2>
      {isHost && editable ? (
        <div className="stack">
          <RadioGroup legend="Maximum players" value={settings.maxParticipants} options={sizes} onChange={(count) => void send({ maxParticipants: count })} />
          <ThemePicker value={theme} onChange={(next) => void send({ gameSettings: { theme: next, turnLimitSeconds: limit } })} />
          <RadioGroup legend="Turn time limit" value={limit} options={limitOptions} onChange={(seconds) => void send({ gameSettings: { theme, turnLimitSeconds: seconds } })} />
        </div>
      ) : (
        <div className="stack">
          <p>Maximum players: {settings.maxParticipants}</p>
          <p>Theme: {themeOf(theme).name}</p>
          <p>Turn limit: {turnLimitText(limit)}</p>
        </div>
      )}
      {error ? <p role="alert">{error}</p> : null}
    </section>
  );
}
