const PIPS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[28, 28], [72, 72]],
  3: [[28, 28], [50, 50], [72, 72]],
  4: [[28, 28], [72, 28], [28, 72], [72, 72]],
  5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]],
  6: [[28, 26], [72, 26], [28, 50], [72, 50], [28, 74], [72, 74]],
};

interface Die2DProps {
  /** The settled face, or null before any roll. */
  face: number | null;
  /** While true the face is hidden behind a placeholder; motion is applied only when `animate` is true. */
  rolling: boolean;
  animate: boolean;
}

/** A flat die face: a still reveal for the lite board and for reduced motion. The number is also stated in words elsewhere. */
export function Die2D({ face, rolling, animate }: Die2DProps) {
  const pips = !rolling && face !== null ? PIPS[face] ?? [] : [];
  return (
    <svg className={`ludo-die${rolling && animate ? ' ludo-die--rolling' : ''}`} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <rect className="ludo-die-body" x="6" y="6" width="88" height="88" rx="18" />
      {rolling ? <text className="ludo-die-unknown" x="50" y="50" textAnchor="middle" dominantBaseline="central" fontSize="44">?</text> : null}
      {pips.map(([x, y]) => <circle key={`${x}-${y}`} className="ludo-die-pip" cx={x} cy={y} r="9" />)}
    </svg>
  );
}
