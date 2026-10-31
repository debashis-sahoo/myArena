import { COLORS } from '@myarena/ludo';
import { themes } from './themes';
import type { ThemeId } from '@myarena/ludo';

const SPOTS: Record<(typeof COLORS)[number], { x: number; y: number }> = {
  RED: { x: 8, y: 8 }, GREEN: { x: 56, y: 8 }, YELLOW: { x: 56, y: 40 }, BLUE: { x: 8, y: 40 },
};

/** A small static picture of a theme: its board tints, four colours and a pawn. Decorative; the name is the label. */
export function ThemePreview({ theme }: { theme: ThemeId }) {
  const { board, palette } = themes[theme];
  return (
    <svg className="ludo-theme-preview" viewBox="0 0 96 72" aria-hidden="true" focusable="false">
      <rect x="0" y="0" width="96" height="72" rx="8" fill={board.surface} stroke={board.line} strokeWidth="2" />
      <rect x="8" y="28" width="80" height="16" fill={board.cell} stroke={board.line} strokeWidth="1" />
      <rect x="40" y="8" width="16" height="56" fill={board.cell} stroke={board.line} strokeWidth="1" />
      {COLORS.map((color) => (
        <rect key={color} x={SPOTS[color].x} y={SPOTS[color].y} width="24" height="20" rx="3" fill={palette[color]} />
      ))}
      <g transform="translate(48 36)">
        <ellipse cx="0" cy="12" rx="9" ry="3" fill={board.ink} opacity="0.35" />
        <path d="M-6 11 Q-2 2 -4 -3 L4 -3 Q2 2 6 11 Z" fill={palette.RED} stroke={board.ink} strokeWidth="1" />
        <circle cx="0" cy="-7" r="5" fill={palette.RED} stroke={board.ink} strokeWidth="1" />
      </g>
    </svg>
  );
}
