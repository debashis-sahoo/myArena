import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Ball } from './Ball';
import { MasterBoard } from './MasterBoard';
import { rollIn } from './anim/ballRoll';
import { planBall, useRegionSize } from './useFit';
import { sfx } from '../../audio/sfx';
import { useReducedMotion } from '../../state/viewport';
import './BallConsole.css';

const GAP = 6;

export function BallConsole({ called }: { called: number[] }) {
  const reduced = useReducedMotion();
  const body = useRegionSize<HTMLDivElement>();
  const grid = useRegionSize<HTMLDivElement>();
  const ballRef = useRef<HTMLDivElement>(null);
  const prevLen = useRef(called.length);
  const [viewAll, setViewAll] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

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
      if (e.key === 'Escape') setViewAll(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [viewAll]);

  const { ball, chip } = planBall(body.width, body.height);
  const chipW = Math.round(chip * 1.3);
  const cols = Math.max(0, Math.floor((grid.width + GAP) / (chipW + GAP)));
  const rows = Math.max(0, Math.floor((grid.height + GAP) / (chip + GAP)));
  const span = cols >= 3 ? 2 : 1;
  const shown = Math.max(0, cols * rows - span);
  const previous = called.slice(0, -1).reverse().slice(0, shown);

  const gridStyle = {
    '--chip': `${chip}px`,
    '--chip-w': `${chipW}px`,
    '--cols': cols,
  } as CSSProperties;

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
            {cols > 0 && rows > 0 && (
              <div className="hz-bc-grid" style={gridStyle}>
                {previous.map((n) => (
                  <span key={n} className="hz-bc-chip">
                    {n}
                  </span>
                ))}
                <button
                  type="button"
                  className="hz-bc-chip all"
                  style={{ gridColumn: `span ${span}` }}
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
        <div className="hz-bc-overlay" onClick={() => setViewAll(false)}>
          <div className="hz-bc-dialog" role="dialog" aria-modal="true" aria-label="All called numbers" onClick={(e) => e.stopPropagation()}>
            <div className="hz-bc-dialog-head">
              <span className="hz-title">Called {called.length} of 90</span>
              <button ref={closeRef} type="button" className="hz-btn small" onClick={() => setViewAll(false)} aria-label="Close">
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
