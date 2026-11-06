import { useState, type CSSProperties, type ReactElement } from 'react';

interface Props {
  min: number;
  max: number;
  /** Capacity preselected when the step opens. */
  defaultCount: number;
  onConfirm: (capacity: number) => void;
  onBack: () => void;
  busy: boolean;
}

/** Choose how many seats an online room has (`min` to `max`) before it is created (FR-004). */
export function CapacityPicker({ min, max, defaultCount, onConfirm, onBack, busy }: Props): ReactElement {
  const [count, setCount] = useState(defaultCount);
  const options = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  return (
    <div className="launch-step">
      <h2 className="modal-title">How many players?</h2>
      <p className="hint">Seats in your private room. You can change this in the lobby.</p>
      <div
        className="opponent-row"
        role="radiogroup"
        aria-label="Number of players"
        style={{ '--cols': options.length } as CSSProperties}
      >
        {options.map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={count === n}
            aria-label={`${n} players`}
            className={`opponent ${count === n ? 'on' : ''}`}
            onClick={() => setCount(n)}
            disabled={busy}
          >
            <span className="opponent-num">{n}</span>
          </button>
        ))}
      </div>
      <div className="launch-actions">
        <button type="button" className="btn ghost" onClick={onBack} disabled={busy}>
          Back
        </button>
        <button type="button" className="btn lime" onClick={() => onConfirm(count)} disabled={busy}>
          {busy ? 'Creating...' : 'Create room'}
        </button>
      </div>
    </div>
  );
}
