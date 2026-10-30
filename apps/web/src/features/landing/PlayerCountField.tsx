import { Minus, Plus } from 'lucide-react';

interface PlayerCountFieldProps {
  min: number;
  max: number;
  value: string;
  onChange: (value: string) => void;
  error?: string | undefined;
}

const SEGMENTED_LIMIT = 8;
export const PLATFORM_ROOM_LIMIT = 100;

export function PlayerCountField({ min, max, value, onChange, error }: PlayerCountFieldProps) {
  const options = Array.from({ length: max - min + 1 }, (_, index) => String(min + index));
  const range = min === max ? `${min} players` : `${min} to ${max} players`;
  const help = (
    <span id="create-count-help" className="muted">
      {range}.{max === PLATFORM_ROOM_LIMIT ? ' Rooms hold at most 100 players.' : ''}
    </span>
  );
  const errorText = error ? <p id="create-count-error" className="field-error">{error}</p> : null;
  const describedBy = `create-count-help${error ? ' create-count-error' : ''}`;

  if (options.length <= SEGMENTED_LIMIT) {
    return (
      <div className="field">
        <span id="create-count-label" className="field-label">Number of players</span>
        <div id="create-count" role="radiogroup" aria-labelledby="create-count-label" aria-describedby={describedBy} aria-invalid={error ? true : undefined} tabIndex={-1} className="segmented">
          {options.map((option) => (
            <label key={option} className="segment">
              <input type="radio" name="maxParticipants" value={option} checked={value === option} onChange={() => onChange(option)} />
              <span>{option}</span>
            </label>
          ))}
        </div>
        {help}
        {errorText}
      </div>
    );
  }

  const number = Number(value);
  const step = (delta: number) => {
    const current = Number.isInteger(number) ? number : min;
    onChange(String(Math.min(max, Math.max(min, current + delta))));
  };
  return (
    <div className="field">
      <label htmlFor="create-count">Number of players</label>
      <div className="stepper">
        <button type="button" aria-label="Fewer players" onClick={() => step(-1)}><Minus size={18} aria-hidden="true" /></button>
        <input
          id="create-count" name="maxParticipants" type="text" inputMode="numeric" autoComplete="off" value={value}
          aria-describedby={describedBy} aria-invalid={error ? true : undefined} onChange={(event) => onChange(event.target.value)}
        />
        <button type="button" aria-label="More players" onClick={() => step(1)}><Plus size={18} aria-hidden="true" /></button>
      </div>
      {help}
      {errorText}
    </div>
  );
}
