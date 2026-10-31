import type { DecorKind } from '../themes/themes';

// One place in the middle of the thick outer edge of each corner block (the name sits in the top or bottom edge).
const SLOTS = [{ x: 0.5, y: 3.5 }, { x: 14.5, y: 3.5 }, { x: 14.5, y: 11.5 }, { x: 0.5, y: 11.5 }] as const;

function star(outer: number, inner: number): string {
  return Array.from({ length: 10 }, (_, index) => {
    const radius = index % 2 === 0 ? outer : inner;
    const angle = -Math.PI / 2 + (index * Math.PI) / 5;
    return `${(radius * Math.cos(angle)).toFixed(3)},${(radius * Math.sin(angle)).toFixed(3)}`;
  }).join(' ');
}

/** One small original shape, drawn around (0, 0) and about 0.8 of a square across. */
function Glyph({ kind }: { kind: DecorKind }) {
  switch (kind) {
    case 'shield': return <path className="decor-steel" d="M-0.3 -0.34 H0.3 V0.08 Q0.3 0.38 0 0.5 Q-0.3 0.38 -0.3 0.08 Z" />;
    case 'star': return <polygon className="decor-gold" points={star(0.38, 0.16)} />;
    case 'pumpkin': return (
      <>
        <ellipse className="decor-orange" rx="0.36" ry="0.3" cy="0.05" />
        <path className="decor-leaf" d="M-0.04 -0.24 Q0 -0.44 0.12 -0.44 Q0.05 -0.35 0.04 -0.24 Z" />
      </>
    );
    case 'bat': return <path className="decor-bat" d="M-0.42 0 Q-0.21 -0.32 0 -0.08 Q0.21 -0.32 0.42 0 Q0.25 0.04 0.21 0.27 Q0 0.1 -0.21 0.27 Q-0.25 0.04 -0.42 0 Z" />;
    case 'diya': return (
      <>
        <path className="decor-brass" d="M-0.36 0.02 Q0 0.48 0.36 0.02 Z" />
        <path className="decor-flame" d="M0 -0.36 Q0.17 -0.12 0 0 Q-0.17 -0.12 0 -0.36 Z" />
      </>
    );
    case 'marigold': return (
      <>
        <circle className="decor-orange" r="0.3" />
        <circle className="decor-gold" r="0.15" />
      </>
    );
    case 'snowflake': return <path className="decor-snow" d="M0 -0.36 V0.36 M-0.31 -0.18 L0.31 0.18 M-0.31 0.18 L0.31 -0.18" />;
    case 'pine': return <path className="decor-leaf" d="M0 -0.42 L0.26 -0.04 H0.12 L0.32 0.26 H-0.32 L-0.12 -0.04 H-0.26 Z" />;
  }
}

/** Decoration for a theme, drawn on the outer edges of the corner blocks. Purely visual, so it takes no clicks and says nothing. */
export function Decor({ kinds }: { kinds: readonly DecorKind[] }) {
  if (kinds.length === 0) return null;
  return (
    <g className="ludo-decor" aria-hidden="true">
      {SLOTS.map((slot, index) => (
        <g key={index} transform={`translate(${slot.x} ${slot.y})`}><Glyph kind={kinds[index % kinds.length]!} /></g>
      ))}
    </g>
  );
}
