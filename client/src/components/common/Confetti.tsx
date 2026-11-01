import type { ReactElement } from 'react';

const COLORS = ['#ff3dac', '#27e0ff', '#b6ff3b', '#ffd93d', '#8b5cf6', '#ff9a3d'];

/** Decorative falling confetti. Hidden entirely under prefers-reduced-motion (see animations.css). */
export function Confetti({ count = 26 }: { count?: number }): ReactElement {
  const pieces = Array.from({ length: count }, (_, i) => {
    const left = (i * 37) % 100;
    return (
      <i
        key={i}
        style={{
          left: `${left}%`,
          background: COLORS[i % COLORS.length],
          animationDelay: `${(i % 9) * -1.1}s`,
          animationDuration: `${9 + (i % 7)}s`,
          width: 6 + (i % 3) * 3,
          height: 10 + (i % 4) * 3,
          transform: `rotate(${(i * 47) % 360}deg)`,
        }}
      />
    );
  });
  return (
    <div className="confetti" aria-hidden="true">
      {pieces}
    </div>
  );
}
