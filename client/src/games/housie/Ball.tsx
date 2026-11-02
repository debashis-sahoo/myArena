import { forwardRef } from 'react';
import type { CSSProperties } from 'react';
import './Ball.css';

interface BallProps {
  number: number | null;
  size: number;
}

export const Ball = forwardRef<HTMLDivElement, BallProps>(function Ball({ number, size }, ref) {
  const style = { '--ball': `${Math.max(0, Math.round(size))}px` } as CSSProperties;
  return (
    <div ref={ref} className="hz-ball" style={style} role="img" aria-label={number === null ? 'No ball yet' : `Ball ${number}`}>
      <span className="hz-ball-shadow" aria-hidden="true" />
      <span className="hz-ball-sphere" aria-hidden="true">
        <span className="hz-ball-disc">{number === null ? '–' : number}</span>
        <span className="hz-ball-spec" />
      </span>
    </div>
  );
});
