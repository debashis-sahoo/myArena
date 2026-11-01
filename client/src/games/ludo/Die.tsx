import type { ReactElement, RefObject } from 'react';
import { faceTransform } from './anim/dice';

export interface DieRefs {
  tray: HTMLElement | null;
  throwEl: HTMLElement | null;
  cube: HTMLElement | null;
  shadow: HTMLElement | null;
}

const PIPS: Record<number, number[]> = {
  1: [5],
  2: [1, 9],
  3: [1, 5, 9],
  4: [1, 3, 7, 9],
  5: [1, 3, 5, 7, 9],
  6: [1, 3, 4, 6, 7, 9],
};

/** One cube face: the pip slab plus two smaller slabs set deeper, which bevel the edges and corners into a rounded die. */
function Face({ n }: { n: number }): ReactElement {
  const on = new Set(PIPS[n]);
  return (
    <span className={`face f${n}`} aria-hidden="true">
      <span className="slab s2" />
      <span className="slab s1" />
      <span className="slab s0">
        {Array.from({ length: 9 }, (_, i) => (
          <i key={i} className={on.has(i + 1) ? 'pip' : ''} />
        ))}
      </span>
    </span>
  );
}

interface Props {
  /** The face resting toward the viewer. */
  face: number;
  disabled: boolean;
  onRoll: () => void;
  refs: RefObject<DieRefs>;
}

/** A real six-faced CSS cube in a dark felt tray, with a ground shadow. Rendered as a button: clicking or tapping it rolls. */
export function Die({ face, disabled, onRoll, refs }: Props): ReactElement {
  return (
    <div className="tray" ref={(el) => void (refs.current.tray = el)}>
      <span className="die-shadow" ref={(el) => void (refs.current.shadow = el)} aria-hidden="true" />
      <div className="die-throw" ref={(el) => void (refs.current.throwEl = el)}>
        <button type="button" className="die" aria-label="Roll the die" disabled={disabled} onClick={onRoll}>
          <span className="die-scene">
            <span className="cube" ref={(el) => void (refs.current.cube = el)} style={{ transform: faceTransform(face) }}>
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <Face key={n} n={n} />
              ))}
            </span>
          </span>
        </button>
      </div>
    </div>
  );
}
