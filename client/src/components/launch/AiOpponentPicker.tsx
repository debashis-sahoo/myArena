import { useState, type CSSProperties, type ReactElement } from 'react';

interface Props {
  max: number;
  /** Opponent count preselected when the step opens. */
  defaultCount: number;
  onConfirm: (botCount: number) => void;
  onBack: () => void;
  busy: boolean;
}

/** Choose 1 to `max` computer opponents (`defaultCount` preselected) and confirm with one tap (FR-011). */
export function AiOpponentPicker({ max, defaultCount, onConfirm, onBack, busy }: Props): ReactElement {
  const [count, setCount] = useState(defaultCount);
  const options = Array.from({ length: max }, (_, i) => i + 1);
  return (
    <div className="launch-step">
      <h2 className="modal-title">How many opponents?</h2>
      <p className="hint">Pick the computer players you want to play against.</p>
      <div
        className="opponent-row"
        role="radiogroup"
        aria-label="Number of computer opponents"
        style={{ '--cols': options.length } as CSSProperties}
      >
        {options.map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={count === n}
            className={`opponent ${count === n ? 'on' : ''}`}
            onClick={() => setCount(n)}
            disabled={busy}
          >
            <span className="opponent-num">{n}</span>
            <span className="opponent-bots" aria-hidden="true">
              {'🤖'.repeat(n)}
            </span>
          </button>
        ))}
      </div>
      <div className="launch-actions">
        <button type="button" className="btn ghost" onClick={onBack} disabled={busy}>
          Back
        </button>
        <button type="button" className="btn lime" onClick={() => onConfirm(count)} disabled={busy}>
          {busy ? 'Creating...' : `Start vs ${count} bot${count > 1 ? 's' : ''}`}
        </button>
      </div>
    </div>
  );
}
