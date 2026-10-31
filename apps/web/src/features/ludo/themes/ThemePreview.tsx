import { COLORS, type Color, type ThemeId } from '@myarena/ludo';
import { themes } from './themes';

const CORNERS: Record<Color, { x: number; y: number }> = {
  RED: { x: 8, y: 4 }, GREEN: { x: 52, y: 4 }, YELLOW: { x: 52, y: 40 }, BLUE: { x: 8, y: 40 },
};

/** A small static picture of a theme: the flat board with its four colours, white yards and a pin. Decorative; the name is the label. */
export function ThemePreview({ theme }: { theme: ThemeId }) {
  const { board, palette } = themes[theme];
  return (
    <svg className="ludo-theme-preview" viewBox="0 0 96 72" aria-hidden="true" focusable="false">
      <rect x="0" y="0" width="96" height="72" rx="8" fill={board.surface} stroke={board.line} strokeWidth="2" />
      <rect x="8" y="28" width="80" height="16" fill={board.cell} stroke={board.line} strokeWidth="1" />
      <rect x="40" y="4" width="16" height="64" fill={board.cell} stroke={board.line} strokeWidth="1" />
      {COLORS.map((color) => (
        <g key={color}>
          <rect x={CORNERS[color].x} y={CORNERS[color].y} width="36" height="28" rx="2" fill={palette[color]} />
          <rect x={CORNERS[color].x + 7} y={CORNERS[color].y + 5} width="22" height="18" rx="3" fill={board.yard} />
        </g>
      ))}
      <g transform="translate(48 36)">
        <ellipse cx="0" cy="9" rx="8" ry="2.6" fill={board.ink} opacity="0.3" />
        <path d="M-5 8 Q-4 1 -2 -2 L2 -2 Q4 1 5 8 Z" fill={palette.RED} stroke={board.ink} strokeWidth="0.8" />
        <circle cx="0" cy="-5" r="4.5" fill={palette.RED} stroke={board.ink} strokeWidth="0.8" />
        <circle cx="0" cy="-5" r="1.5" fill="#fff" />
      </g>
    </svg>
  );
}
