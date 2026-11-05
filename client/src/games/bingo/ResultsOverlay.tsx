import { useEffect, useId, useRef, type ReactElement } from 'react';
import { BINGO_BALLS, COLOR_HEX, getBingoPattern, type BingoResultEntry } from '@myarena/shared';

export interface ResultsOverlayProps {
  results: BingoResultEntry[];
  calledCount: number;
  isHost: boolean;
  onNewRound: () => void;
  onLeave: () => void;
}

/** Match results over the dimmed screen: each pattern with its winner (or "No winner"), the call count, Leave and (host) New round. */
export function ResultsOverlay({ results, calledCount, isHost, onNewRound, onLeave }: ResultsOverlayProps): ReactElement {
  const titleId = useId();
  const firstBtn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    firstBtn.current?.focus();
  }, []);

  return (
    <div className="bz-results">
      <div className="bz-results-panel" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <h2 id={titleId} className="bz-results-title">
          Match over
        </h2>
        <p className="bz-results-sub">
          Called {calledCount} of {BINGO_BALLS}
        </p>
        <ul className="bz-results-list">
          {results.map((r) => (
            <li key={r.pattern} className="bz-results-row">
              <span className="bz-results-pattern">{getBingoPattern(r.pattern)?.name ?? r.pattern}</span>
              {r.winner ? (
                <span className="bz-results-winner">
                  <span className="bz-results-dot" style={{ background: COLOR_HEX[r.winner.color] ?? '#fff' }} aria-hidden="true" />
                  <span className="bz-results-name" style={{ color: COLOR_HEX[r.winner.color] ?? undefined }}>
                    {r.winner.name}
                  </span>
                </span>
              ) : (
                <span className="bz-results-none">No winner</span>
              )}
            </li>
          ))}
        </ul>
        <div className="bz-results-actions">
          <button ref={firstBtn} type="button" className="bz-btn" onClick={onLeave}>
            Leave
          </button>
          {isHost && (
            <button type="button" className="bz-btn gold" onClick={onNewRound}>
              New round
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
