import { useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import type { CallerState, HousieAction } from '@myarena/shared';
import { AUTO_INTERVALS_MS } from '@myarena/shared';
import { Ball } from './Ball';
import { rollIn } from './anim/ballRoll';
import { planBall, useRegionSize } from './useFit';
import { sfx } from '../../audio/sfx';
import { useReducedMotion } from '../../state/viewport';
import './CallerConsole.css';

interface Props {
  caller: CallerState;
  called: number[];
  finished: boolean;
  onAction: (a: HousieAction) => void;
}

const RECENT = 8;

export function CallerConsole({ caller, called, finished, onAction }: Props) {
  const reduced = useReducedMotion();
  const body = useRegionSize<HTMLDivElement>();
  const ballRef = useRef<HTMLDivElement>(null);
  const prevLen = useRef(called.length);

  const current = called.length > 0 ? (called[called.length - 1] ?? null) : null;

  useEffect(() => {
    if (called.length > prevLen.current) {
      rollIn(ballRef.current, reduced);
      sfx.ballRoll();
    }
    prevLen.current = called.length;
  }, [called.length, reduced]);

  const { ball, chip } = planBall(body.width, body.height);
  const chipPx = Math.min(30, Math.max(20, Math.round(chip)));
  const recent = called.slice(0, -1).reverse().slice(0, RECENT);

  const exhausted = called.length >= 90;
  const drawDisabled = finished || exhausted;
  const reason = exhausted ? 'All balls called' : finished ? 'Match over' : '';

  const auto = caller.mode === 'auto';
  const counting = auto && !caller.paused && !finished && typeof caller.nextInMs === 'number' && caller.intervalMs > 0;
  const remaining = counting ? Math.max(0, caller.nextInMs ?? 0) : 0;
  const fraction = counting ? Math.min(1, remaining / caller.intervalMs) : 0;
  const barStyle = { '--from': fraction, animationDuration: `${remaining}ms` } as CSSProperties;

  return (
    <section className="hz-panel hz-cc" aria-label="Caller console">
      <h2 className="hz-title">Caller console</h2>
      <div className="hz-cc-body" ref={body.ref}>
        <div className="hz-cc-ball">
          <Ball ref={ballRef} number={current} size={Math.max(40, ball - 18)} />
          <div className="hz-cc-count">Called {called.length} of 90</div>
        </div>
        <div className="hz-cc-side">
          <div className="hz-cc-drawwrap">
            <button
              type="button"
              className="hz-btn gold hz-cc-draw"
              disabled={drawDisabled}
              title={reason || undefined}
              onClick={() => onAction({ type: 'draw' })}
            >
              DRAW NEXT BALL
            </button>
            {counting && <span key={`${called.length}:${caller.nextInMs}:${caller.intervalMs}`} className="hz-cc-bar" style={barStyle} aria-hidden="true" />}
          </div>
          {reason && <div className="hz-cc-reason">{reason}</div>}
          <div className="hz-cc-row">
            <span className="hz-cc-label" id="hz-cc-auto">
              Auto call
            </span>
            <div className="hz-seg" role="group" aria-labelledby="hz-cc-auto">
              <button type="button" aria-pressed={!auto} disabled={finished} onClick={() => onAction({ type: 'manual' })}>
                Off
              </button>
              {AUTO_INTERVALS_MS.map((ms) => (
                <button
                  key={ms}
                  type="button"
                  aria-pressed={auto && caller.intervalMs === ms}
                  disabled={finished}
                  onClick={() => onAction({ type: 'auto', intervalMs: ms })}
                >
                  {ms / 1000}s
                </button>
              ))}
            </div>
            {auto && (
              <button
                type="button"
                className="hz-btn small"
                disabled={finished}
                onClick={() => onAction({ type: caller.paused ? 'resume' : 'pause' })}
              >
                {caller.paused ? 'Resume' : 'Pause'}
              </button>
            )}
          </div>
          <div className="hz-cc-row recent">
            <span className="hz-cc-label">Recent</span>
            <div className="hz-cc-chips" style={{ '--chip': `${chipPx}px` } as CSSProperties}>
              {recent.map((n) => (
                <span key={n} className="hz-cc-chip">
                  {n}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
      <span className="hz-cc-sr" aria-live="polite">
        {current === null ? '' : `Ball ${current}`}
      </span>
    </section>
  );
}
