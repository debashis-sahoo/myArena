import { useLayoutEffect, useRef } from 'react';
import { buildThrow, type DiceThrow } from '@myarena/ludo';
import type { Throw } from '../match/rollPlayback';
import { PIP_CELLS, diePose, idleSample } from './dieMath';

const FACES = [1, 2, 3, 4, 5, 6] as const;

export interface Die3DProps {
  /** The settled face, or null before any roll or while a throw is shown. */
  face: number | null;
  /** The throw being shown to this viewer, or null when the die is still. */
  throwing: Throw | null;
}

/**
 * A glossy white cube on a tilted tray. It plays the shared seeded throw by setting the cube's transform from script
 * (allowed under the page's style policy, unlike a style attribute in markup). Decorative: the number is stated in words.
 */
export function Die3D({ face, throwing }: Die3DProps) {
  const cube = useRef<HTMLDivElement>(null);
  const shadow = useRef<HTMLDivElement>(null);
  const last = useRef<{ played: DiceThrow; face: number } | null>(null);

  useLayoutEffect(() => {
    const show = (pose: ReturnType<typeof diePose>): void => {
      if (cube.current) cube.current.style.transform = pose.cube;
      if (shadow.current) {
        shadow.current.style.transform = pose.shadow;
        shadow.current.style.opacity = pose.shadowOpacity.toFixed(3);
      }
    };
    if (throwing) {
      const played = buildThrow(throwing.seed, throwing.face, throwing.durationMs);
      last.current = { played, face: throwing.face };
      let frame = 0;
      const step = (): void => {
        const elapsed = Math.min(performance.now() - throwing.startedAt, played.durationMs);
        show(diePose(played.sample(elapsed)));
        if (elapsed < played.durationMs) frame = requestAnimationFrame(step);
      };
      step();
      return () => cancelAnimationFrame(frame);
    }
    // Settled: stay where the last throw came to rest if it showed this face, otherwise stand in the middle.
    const shown = face ?? 1;
    const previous = last.current;
    show(diePose(previous && previous.face === shown ? previous.played.sample(previous.played.durationMs) : idleSample(shown)));
    return undefined;
  }, [throwing, face]);

  return (
    <div className="ludo-die" aria-hidden="true">
      <div className="ludo-die-scale">
        <div className="ludo-die-world">
          <div className="ludo-die-tray" />
          <div className="ludo-die-shadow" ref={shadow} />
          <div className="ludo-die-cube" ref={cube}>
            {FACES.map((side) => (
              <div key={side} className={`ludo-die-face ludo-die-face--${side}`}>
                {PIP_CELLS[side]!.map((cell) => <i key={cell} className={`ludo-die-pip ludo-die-pip--${cell}`} />)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
