import { useEffect, useRef, useState, type CSSProperties, type ReactElement } from 'react';
import { BINGO_BALLS, ballLetter } from '@myarena/shared';
import { sfx } from '../../audio/sfx';
import { useReducedMotion } from '../../state/viewport';
import { Ball } from './Ball';
import { MasterBoard } from './MasterBoard';
import { rollIn } from './anim/ballRoll';
import { planBall, useRegionSize } from './useFit';

const GAP = 6;
const TITLE_H = 20;
const STACK_MIN_H = 150; // below this the count moves beside the ball

export interface BallConsoleProps {
  called: number[];
  /** Changes on every new ball so the reveal replays. */
  ballKey: number;
}

/** Player's ball console: the current ball, "Called n of 75", newest-first history chips and a "View all" board. */
export function BallConsole({ called, ballKey }: BallConsoleProps): ReactElement {
  const reduced = useReducedMotion();
  const panel = useRegionSize<HTMLElement>();
  const grid = useRegionSize<HTMLDivElement>();
  const ballRef = useRef<HTMLDivElement>(null);
  const prevKey = useRef(ballKey);
  const viewAllRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [viewAll, setViewAll] = useState(false);

  const current = called.length > 0 ? (called[called.length - 1] ?? null) : null;

  useEffect(() => {
    if (ballKey === prevKey.current) return;
    prevKey.current = ballKey;
    rollIn(ballRef.current, reduced);
    sfx.ballRoll();
  }, [ballKey, reduced]);

  useEffect(() => {
    if (!viewAll) return;
    const opener = viewAllRef.current;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setViewAll(false);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      opener?.focus();
    };
  }, [viewAll]);

  const showTitle = panel.height >= STACK_MIN_H;
  const bodyH = panel.height - (showTitle ? TITLE_H : 0);
  const stacked = bodyH >= STACK_MIN_H;
  const { ball, chip } = planBall(panel.width, bodyH, stacked);

  const chipW = Math.round(chip * 1.6);
  const cols = Math.max(0, Math.floor((grid.width + GAP) / (chipW + GAP)));
  const rows = Math.max(0, Math.floor((grid.height + GAP) / (chip + GAP)));
  const span = cols >= 3 ? 2 : 1;
  const previous = called
    .slice(0, -1)
    .reverse()
    .slice(0, Math.max(0, cols * rows - span));

  const gridStyle = { '--chip': `${chip}px`, '--cols': cols, '--chip-w': `${chipW}px` } as CSSProperties;
  const count = (
    <div className="bz-bc-count">
      Called {called.length} of {BINGO_BALLS}
    </div>
  );

  return (
    <section ref={panel.ref} className="bz-bc" aria-label="Current ball">
      <h2 className={showTitle ? 'bz-title' : 'bz-sr-only'}>Current ball</h2>
      <div className="bz-bc-body">
        <div className="bz-bc-ball">
          <Ball ref={ballRef} number={current} size={ball} />
          {stacked && count}
        </div>
        <div className="bz-bc-side">
          {!stacked && count}
          <div ref={grid.ref} className="bz-bc-grid-region">
            {cols > 0 && rows > 0 && (
              <div className="bz-bc-grid" style={gridStyle} role="list" aria-label="Previous balls, newest first">
                {previous.map((n) => (
                  <span key={n} className={`bz-bc-chip bz-l-${ballLetter(n)}`} role="listitem">
                    {ballLetter(n)}-{n}
                  </span>
                ))}
                <button
                  ref={viewAllRef}
                  type="button"
                  className="bz-bc-chip all"
                  style={{ gridColumn: `span ${span}` }}
                  aria-haspopup="dialog"
                  onClick={() => setViewAll(true)}
                >
                  View all
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      {viewAll && (
        <div className="bz-overlay" onMouseDown={(e) => e.target === e.currentTarget && setViewAll(false)}>
          <div className="bz-dialog" role="dialog" aria-modal="true" aria-label="All called numbers">
            <div className="bz-dialog-head">
              <span className="bz-title">
                Called {called.length} of {BINGO_BALLS}
              </span>
              <button ref={closeRef} type="button" className="bz-btn small" onClick={() => setViewAll(false)}>
                Close
              </button>
            </div>
            <div className="bz-dialog-board">
              <MasterBoard called={called} current={current} />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
