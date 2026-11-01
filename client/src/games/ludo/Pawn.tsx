import type { ReactElement } from 'react';
import type { LudoColor } from '@myarena/shared';

const TONES: Record<LudoColor, { light: string; base: string; dark: string }> = {
  yellow: { light: '#fff3a6', base: '#ffcc1a', dark: '#b87f00' },
  green: { light: '#a8ffd0', base: '#1fcf6a', dark: '#0b7d3b' },
  blue: { light: '#b8dcff', base: '#2f8cff', dark: '#1352b8' },
  red: { light: '#ffb3bd', base: '#ff3b4f', dark: '#a3162a' },
};

/** Shared gradients for every pawn; render once next to the pawns. */
export function PawnDefs(): ReactElement {
  return (
    <svg width="0" height="0" aria-hidden="true" focusable="false" className="pawn-defs">
      <defs>
        {(Object.keys(TONES) as LudoColor[]).map((c) => (
          <g key={c}>
            <radialGradient id={`pawn-head-${c}`} cx="35%" cy="28%" r="75%">
              <stop offset="0" stopColor="#ffffff" />
              <stop offset="0.28" stopColor={TONES[c].light} />
              <stop offset="0.7" stopColor={TONES[c].base} />
              <stop offset="1" stopColor={TONES[c].dark} />
            </radialGradient>
            <linearGradient id={`pawn-body-${c}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor={TONES[c].dark} />
              <stop offset="0.35" stopColor={TONES[c].light} />
              <stop offset="0.6" stopColor={TONES[c].base} />
              <stop offset="1" stopColor={TONES[c].dark} />
            </linearGradient>
          </g>
        ))}
      </defs>
    </svg>
  );
}

interface Props {
  color: LudoColor;
}

/** An inline-SVG 3D-style pawn: tapered body, sphere head with a specular highlight, and a base ring with a rim light. */
export function PawnArt({ color }: Props): ReactElement {
  return (
    <svg className="pawn-art" viewBox="0 0 40 48" aria-hidden="true" focusable="false">
      <ellipse cx="20" cy="42" rx="15" ry="5.5" fill={`url(#pawn-body-${color})`} stroke="rgba(0,0,0,0.35)" strokeWidth="1" />
      <ellipse cx="20" cy="40.5" rx="14" ry="3.2" fill="rgba(255,255,255,0.28)" />
      <path
        d="M12 41 C13 33 16 28 17 24 L23 24 C24 28 27 33 28 41 Z"
        fill={`url(#pawn-body-${color})`}
        stroke="rgba(0,0,0,0.3)"
        strokeWidth="1"
      />
      <ellipse cx="20" cy="25" rx="7" ry="2.4" fill={`url(#pawn-body-${color})`} stroke="rgba(0,0,0,0.25)" strokeWidth="0.8" />
      <circle cx="20" cy="14" r="10" fill={`url(#pawn-head-${color})`} stroke="rgba(0,0,0,0.35)" strokeWidth="1" />
      <ellipse cx="16.2" cy="9.6" rx="3.6" ry="2.4" fill="rgba(255,255,255,0.85)" transform="rotate(-30 16.2 9.6)" />
      <path d="M12.6 41.6 A15 5.5 0 0 0 27.4 41.6" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1.2" />
    </svg>
  );
}
