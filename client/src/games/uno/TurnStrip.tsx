import './TurnStrip.css';
import { useEffect, useState, type CSSProperties, type ReactElement } from 'react';
import { COLOR_HEX, UNO_TURN_TIMER_MS } from '@myarena/shared';
import { Avatar } from '../../art/Avatars';
import type { TurnLabel } from './turnLabel';

export interface TurnStripProps {
  label: TurnLabel;
  /** Avatar key and seat colour name of the actor; null while nobody acts. */
  avatar: string | null;
  color: string | null;
  /** `header` sits in the header's free space; `row` is a full-width row under it. */
  variant: 'header' | 'row';
}

/** Remaining milliseconds counted down locally from the server's value, restarted whenever the server sends a new one. */
function useCountdown(ms: number | null): number | null {
  const [left, setLeft] = useState<number | null>(ms);
  useEffect(() => {
    if (ms === null) {
      setLeft(null);
      return;
    }
    const start = performance.now();
    setLeft(ms);
    const id = window.setInterval(() => setLeft(Math.max(0, ms - (performance.now() - start))), 250);
    return () => window.clearInterval(id);
  }, [ms]);
  return left;
}

function clock(ms: number): string {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * The persistent turn indicator (specs/007 contracts/uno-turn-play-chat.md section 1): who must act and what they must do, as text.
 * The root is a polite live region that announces the text only; the countdown is hidden from assistive technology.
 */
export function TurnStrip({ label, avatar, color, variant }: TurnStripProps): ReactElement {
  const left = useCountdown(label.countdownMs);
  const edge = (color && COLOR_HEX[color]) || 'var(--un-line)';
  const style = { '--strip-edge': edge } as CSSProperties;
  const cls = ['un-strip', variant, label.mine ? 'mine' : '', label.kind].filter(Boolean).join(' ');
  return (
    <div className={cls} style={style} role="status" aria-live="polite" data-uno-turn-strip="">
      {avatar && label.actorId ? (
        <span className="un-strip-av" aria-hidden="true">
          <Avatar k={avatar} size={variant === 'row' ? 20 : 24} ring={edge} />
        </span>
      ) : null}
      <span className="un-strip-text">
        {label.text}
        {label.note ? <em className="un-strip-note"> {label.note}</em> : null}
      </span>
      {left !== null ? (
        <span className="un-strip-clock" aria-hidden="true">
          <span className="un-strip-time">{clock(left)}</span>
          <span className="un-strip-bar">
            <span style={{ width: `${Math.max(0, Math.min(100, (left / UNO_TURN_TIMER_MS) * 100))}%` }} />
          </span>
        </span>
      ) : null}
    </div>
  );
}
