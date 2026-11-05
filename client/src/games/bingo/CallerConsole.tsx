import { useEffect, useRef, type CSSProperties, type ReactElement } from 'react';
import { AUTO_INTERVALS_MS, BINGO_BALLS, ballLetter, type BingoAction, type CallerState } from '@myarena/shared';
import { sfx } from '../../audio/sfx';
import { useReducedMotion } from '../../state/viewport';
import { Ball } from './Ball';
import { rollIn } from './anim/ballRoll';
import { planBall, useRegionSize } from './useFit';

const TITLE_H = 20;
const TITLE_MIN_H = 150; // the visible title only appears when there is room
const RECENT_MIN_H = 150;
const RECENT_MAX = 10;
const COMPACT_W = 360; // narrower than this the "Auto" label gives way so the Off to 10s switch and Pause fit

export interface CallerConsoleProps {
  caller: CallerState;
  called: number[];
  ballKey: number;
  finished: boolean;
  onAction: (action: BingoAction) => void;
}

/** Host's console: the ball, DRAW NEXT BALL with a countdown ring, Auto Off/5s/8s/10s, Pause/Resume and the latest balls. */
export function CallerConsole({ caller, called, ballKey, finished, onAction }: CallerConsoleProps): ReactElement {
  const reduced = useReducedMotion();
  const panel = useRegionSize<HTMLElement>();
  const ballRef = useRef<HTMLDivElement>(null);
  const prevKey = useRef(ballKey);

  const current = called.length > 0 ? (called[called.length - 1] ?? null) : null;

  useEffect(() => {
    if (ballKey === prevKey.current) return;
    prevKey.current = ballKey;
    rollIn(ballRef.current, reduced);
    sfx.ballRoll();
  }, [ballKey, reduced]);

  const showTitle = panel.height >= TITLE_MIN_H;
  const bodyH = panel.height - (showTitle ? TITLE_H : 0);
  const { ball, chip } = planBall(panel.width, bodyH);
  const ballPx = Math.min(ball, Math.floor(panel.width * 0.36));
  const chipPx = Math.max(22, Math.min(chip, Math.max(30, Math.floor(bodyH / 10))));
  const compact = panel.width > 0 && panel.width < COMPACT_W;
  const recent = called.slice(0, -1).reverse().slice(0, RECENT_MAX);

  const exhausted = called.length >= BINGO_BALLS;
  const locked = finished || exhausted;
  const reason = exhausted ? 'All 75 balls called' : finished ? 'Match over' : '';

  const auto = caller.mode === 'auto';
  const counting = auto && !caller.paused && !locked && typeof caller.nextInMs === 'number' && caller.intervalMs > 0;
  const remaining = counting ? Math.max(0, caller.nextInMs ?? 0) : 0;
  const fraction = counting ? Math.min(1, remaining / caller.intervalMs) : 0;
  const ringStyle: CSSProperties = { strokeDashoffset: 1 - fraction, animationDuration: `${remaining}ms` };

  return (
    <section ref={panel.ref} className="bz-cc" aria-label="Caller console">
      <h2 className={showTitle ? 'bz-title' : 'bz-sr-only'}>Caller console</h2>
      <div className="bz-cc-body">
        <div className="bz-cc-ball">
          <Ball ref={ballRef} number={current} size={ballPx} />
          <div className="bz-bc-count">
            Called {called.length} of {BINGO_BALLS}
          </div>
        </div>
        <div className="bz-cc-side">
          <button
            type="button"
            className="bz-btn gold bz-cc-draw"
            disabled={locked}
            title={reason || undefined}
            onClick={() => onAction({ type: 'draw' })}
          >
            {counting && remaining > 0 && (
              <svg
                key={`${called.length}:${caller.nextInMs}:${caller.intervalMs}`}
                className="bz-cc-ring"
                viewBox="0 0 24 24"
                aria-hidden="true"
                focusable="false"
              >
                <circle className="bz-cc-ring-track" cx="12" cy="12" r="10" />
                <circle className="bz-cc-ring-arc" cx="12" cy="12" r="10" pathLength={1} style={ringStyle} />
              </svg>
            )}
            DRAW NEXT BALL
          </button>
          {reason && (
            <div className="bz-cc-reason" role="status">
              {reason}
            </div>
          )}
          <div className="bz-cc-row">
            <span className={compact ? 'bz-sr-only' : 'bz-label'} id="bz-cc-auto">
              Auto
            </span>
            <div className="bz-seg" role="group" aria-labelledby="bz-cc-auto">
              <button type="button" aria-pressed={!auto} disabled={locked} onClick={() => onAction({ type: 'manual' })}>
                Off
              </button>
              {AUTO_INTERVALS_MS.map((ms) => (
                <button
                  key={ms}
                  type="button"
                  aria-pressed={auto && caller.intervalMs === ms}
                  disabled={locked}
                  onClick={() => onAction({ type: 'auto', intervalMs: ms })}
                >
                  {ms / 1000}s
                </button>
              ))}
            </div>
            {auto && (
              <button
                type="button"
                className="bz-btn small"
                disabled={locked}
                onClick={() => onAction({ type: caller.paused ? 'resume' : 'pause' })}
              >
                {caller.paused ? 'Resume' : 'Pause'}
              </button>
            )}
          </div>
          {bodyH >= RECENT_MIN_H && recent.length > 0 && (
            <div className="bz-cc-row recent">
              <span className="bz-label">Recent</span>
              <div className="bz-cc-chips" style={{ '--chip': `${chipPx}px` } as CSSProperties}>
                {recent.map((n) => (
                  <span key={n} className={`bz-bc-chip bz-l-${ballLetter(n)}`}>
                    {ballLetter(n)}-{n}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
