import { forwardRef, type CSSProperties } from 'react';
import { ballLetter } from '@myarena/shared';

interface BallProps {
  number: number | null;
  /** Diameter in px. */
  size: number;
}

/** Glossy 3D sphere tinted by the letter color, with the letter above a bold number ("G" over "54"). */
export const Ball = forwardRef<HTMLDivElement, BallProps>(function Ball({ number, size }, ref) {
  const letter = number === null ? null : ballLetter(number);
  const style = { '--bz-ball': `${Math.max(0, Math.round(size))}px` } as CSSProperties;
  return (
    <div
      ref={ref}
      className={`bz-ball${letter ? ` bz-l-${letter}` : ''}`}
      style={style}
      role="img"
      aria-label={letter === null ? 'No ball yet' : `Ball ${letter} ${number}`}
    >
      <span className="bz-ball-shadow" aria-hidden="true" />
      <span className="bz-ball-glow" aria-hidden="true" />
      <span className="bz-ball-sphere" aria-hidden="true">
        <span className="bz-ball-disc">
          {letter === null ? (
            <span className="bz-ball-num">-</span>
          ) : (
            <>
              <span className="bz-ball-letter">{letter}</span>
              <span className="bz-ball-num">{number}</span>
            </>
          )}
        </span>
        <span className="bz-ball-spec" />
      </span>
    </div>
  );
});
