import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Ball } from './Ball';
import { MasterBoard } from './MasterBoard';
import { rollIn } from './anim/ballRoll';
import { planBall, planRecentCalls, useRegionSize } from './useFit';
import { sfx } from '../../audio/sfx';
import { useReducedMotion } from '../../state/viewport';
import './BallConsole.css';

export function BallConsole({ called }: { called: number[] }) {
  const reduced = useReducedMotion();
  const body = useRegionSize<HTMLDivElement>();
  const grid = useRegionSize<HTMLDivElement>();
  const ballRef = useRef<HTMLDivElement>(null);
  const prevLen = useRef(called.length);
  const [viewAll, setViewAll] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const historyRef = useRef<HTMLButtonElement>(null);

  const current = called.length > 0 ? (called[called.length - 1] ?? null) : null;

  useEffect(() => {
    if (called.length > prevLen.current) {
      rollIn(ballRef.current, reduced);
      sfx.ballRoll();
    }
    prevLen.current = called.length;
  }, [called.length, reduced]);

  useEffect(() => {
    if (!viewAll) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setViewAll(false);
        requestAnimationFrame(() => historyRef.current?.focus());
      }
      if (e.key === 'Tab') {
        const focusable = [...document.querySelectorAll<HTMLButtonElement>('.hz-bc-dialog button:not(:disabled)')];
        if (focusable.length === 0) return;
        const first = focusable[0] as HTMLButtonElement;
        const last = focusable[focusable.length - 1] as HTMLButtonElement;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [viewAll]);

  const { ball: plannedBall } = planBall(body.width, body.height);
  const ball = Math.min(plannedBall, Math.max(54, Math.floor(body.height * 0.42)));
  const previousCount = Math.max(0, called.length - 1);
  const plan = planRecentCalls(grid.width, grid.height, body.width, body.height, previousCount);
  const previous = called.slice(0, -1).reverse().slice(0, plan.visible);

  const gridStyle = {
    '--chip': `${plan.chip}px`,
    '--chip-w': `${plan.chipWidth}px`,
    '--cols': plan.columns,
  } as CSSProperties;
  const closeHistory = (): void => {
    setViewAll(false);
    requestAnimationFrame(() => historyRef.current?.focus());
  };

  return (
    <section className="hz-panel hz-bc" aria-label="Current ball">
      <h2 className="hz-title">Current ball</h2>
      <div className="hz-bc-body" ref={body.ref}>
        <div className="hz-bc-ball">
          <Ball ref={ballRef} number={current} size={ball} />
        </div>
        <div className="hz-bc-side">
          <div className="hz-bc-count">
            Called {called.length} of 90
          </div>
          <div className="hz-bc-grid-region" ref={grid.ref}>
            {plan.columns > 0 && plan.rows > 0 && previousCount > 0 && (
              <div className="hz-bc-grid" style={gridStyle}>
                {previous.map((n) => (
                  <span key={n} className="hz-bc-chip">
                    {n}
                  </span>
                ))}
                <button
                  ref={historyRef}
                  type="button"
                  className="hz-bc-chip all"
                  style={{ gridColumn: `span ${plan.historySpan}` }}
                  onClick={() => setViewAll(true)}
                  aria-haspopup="dialog"
                >
                  View all
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <span className="hz-bc-sr" aria-live="polite">
        {current === null ? '' : `Ball ${current}`}
      </span>
      {viewAll && (
        <div className="hz-bc-overlay" onClick={closeHistory}>
          <div className="hz-bc-dialog" role="dialog" aria-modal="true" aria-label="All called numbers" onClick={(e) => e.stopPropagation()}>
            <div className="hz-bc-dialog-head">
              <span className="hz-title">Called {called.length} of 90</span>
              <button ref={closeRef} type="button" className="hz-btn small" onClick={closeHistory} aria-label="Close">
                Close
              </button>
            </div>
            <div className="hz-bc-dialog-board">
              <MasterBoard called={called} current={current} />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
