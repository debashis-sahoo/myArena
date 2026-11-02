import { useEffect, useId, useRef, type ReactElement } from 'react';
import { COLOR_HEX, getPattern, type ResultEntry } from '@myarena/shared';
import { useReducedMotion } from '../../state/viewport';
import './ResultsOverlay.css';

export interface ResultsOverlayProps {
  results: ResultEntry[];
  calledCount: number;
  isHost: boolean;
  onNewRound: () => void;
  onLeave: () => void;
}

export function ResultsOverlay({ results, calledCount, isHost, onNewRound, onLeave }: ResultsOverlayProps): ReactElement {
  const titleId = useId();
  const firstBtn = useRef<HTMLButtonElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    firstBtn.current?.focus();
  }, []);

  return (
    <div className={`hz-results ${reduced ? 'calm' : ''}`}>
      <div className="hzr-panel" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <h2 id={titleId} className="hzr-title">
          Match over
        </h2>
        <p className="hzr-sub">
          {calledCount} {calledCount === 1 ? 'ball' : 'balls'} called
        </p>
        <ul className="hzr-list">
          {results.map((r) => (
            <li key={r.combo} className="hzr-row">
              <span className="hzr-combo">{getPattern(r.combo)?.name ?? r.combo}</span>
              {r.winner ? (
                <span className="hzr-winner">
                  <span className="hzr-dot" style={{ background: COLOR_HEX[r.winner.color] ?? '#fff' }} aria-hidden="true" />
                  <span className="hzr-name">{r.winner.name}</span>
                </span>
              ) : (
                <span className="hzr-none">No winner</span>
              )}
            </li>
          ))}
        </ul>
        <div className="hzr-actions">
          <button ref={firstBtn} type="button" className="hz-btn" onClick={onLeave}>
            Leave
          </button>
          {isHost && (
            <button type="button" className="hz-btn gold" onClick={onNewRound}>
              New round
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
