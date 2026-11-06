import { memo, type CSSProperties, type ReactElement } from 'react';
import { UNO_COLORS, UNO_COLOR_GLYPH, UNO_COLOR_HEX, unoCardOf, type UnoCard, type UnoColor } from '@myarena/shared';
import { CARD_ASPECT } from './useFit';

export interface CardFaceProps {
  /** Card id, or null for a card back. */
  card: number | null;
  /** Pixel height; the width is 0.69 x height. */
  height: number;
  /** When set, the card is exposed to assistive technology under this name; otherwise it is decorative. */
  label?: string;
  className?: string;
  style?: CSSProperties;
}

const INK = '#1a0b2e';
const GOLD = '#ffcf3d';
const WILD_FIELD = '#1c1036';
const DARK: Record<UnoColor, string> = { red: '#a3132f', yellow: '#a96f00', green: '#0c6a35', blue: '#123f96' };
const FONT = "'Arial Black', 'Segoe UI', system-ui, sans-serif";

/** Everything is drawn in a 69 x 100 box with no SVG ids, so any number of copies of a card can coexist on the page. */
const CX = 34.5;
const CY = 50;

const f2 = (v: number): string => v.toFixed(2);

/** The drawing is 100 units tall, so a unit renders at height / 100 px: small cards need bigger units to keep text legible. */
const atLeast = (units: number, px: number, height: number): number => Math.max(units, (px * 100) / height);
/** Rendered minimum of the corner index numerals and of the colour pips, which are the non-colour cue for a card's colour. */
const MIN_INDEX_PX = 11.2;
const MIN_PIP_PX = 11.2;

interface CornerSize {
  /** Numeral font size and x centre, in drawing units. */
  index: number;
  x: number;
  pip: number;
  /** y of the pip under the numeral. */
  pipY: number;
  /** Font size of the pip in the centre, under the big numeral. */
  centrePip: number;
}

function cornerSize(card: UnoCard, height: number): CornerSize {
  const label = card.kind === 'number' ? String(card.rank ?? 0) : card.kind === 'draw2' ? '+2' : card.kind === 'wild4' ? '+4' : '';
  const index = atLeast(card.kind === 'number' ? 13 : 11, MIN_INDEX_PX, height);
  const pip = atLeast(8, MIN_PIP_PX, height);
  return {
    index,
    x: Math.max(11, (label.length * 0.64 * index) / 2 + 3),
    pip,
    pipY: Math.max(27.5, 15 + 0.36 * index + 1.5 + 0.42 * pip),
    centrePip: atLeast(9, MIN_PIP_PX, height),
  };
}

function Pinwheel({ cx, cy, r }: { cx: number; cy: number; r: number }): ReactElement {
  return (
    <g transform={`rotate(-20 ${f2(cx)} ${f2(cy)})`}>
      {UNO_COLORS.map((color, i) => {
        const a0 = ((i * 90 - 180) * Math.PI) / 180;
        const a1 = (((i + 1) * 90 - 180) * Math.PI) / 180;
        const d = `M${f2(cx)} ${f2(cy)}L${f2(cx + r * Math.cos(a0))} ${f2(cy + r * Math.sin(a0))}A${f2(r)} ${f2(r)} 0 0 1 ${f2(cx + r * Math.cos(a1))} ${f2(cy + r * Math.sin(a1))}Z`;
        return <path key={color} d={d} fill={UNO_COLOR_HEX[color]} stroke={INK} strokeWidth={1.2} strokeLinejoin="round" />;
      })}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={INK} strokeWidth={2} />
    </g>
  );
}

/** Symbols are centred on the origin and about 40 units wide so the same shape serves the centre and the corners. */
function SkipSymbol({ color }: { color: string }): ReactElement {
  return (
    <g strokeLinecap="round">
      <circle r={14} fill="none" stroke={INK} strokeWidth={9} />
      <line x1={-9.9} y1={-9.9} x2={9.9} y2={9.9} stroke={INK} strokeWidth={9} />
      <circle r={14} fill="none" stroke={color} strokeWidth={5} />
      <line x1={-9.9} y1={-9.9} x2={9.9} y2={9.9} stroke={color} strokeWidth={5} />
    </g>
  );
}

const ARROW = 'M-14 -10L6 -10L6 -16L18 -7L6 2L6 -4L-14 -4Z';

function ReverseSymbol({ color }: { color: string }): ReactElement {
  return (
    <g transform="rotate(-30)" fill={color} stroke={INK} strokeWidth={1.8} strokeLinejoin="round">
      <path d={ARROW} />
      <path d={ARROW} transform="rotate(180)" />
    </g>
  );
}

function DrawTwoSymbol({ color }: { color: string }): ReactElement {
  return (
    <g fill={color} stroke={INK} strokeWidth={1.8} strokeLinejoin="round">
      <rect x={-8.5} y={-14} width={17} height={25} rx={3} transform="translate(-4 -2) rotate(-14)" />
      <rect x={-8.5} y={-14} width={17} height={25} rx={3} transform="translate(5 3) rotate(10)" />
    </g>
  );
}

function Outlined({ x, y, size, fill, children }: { x: number; y: number; size: number; fill: string; children: string | number }): ReactElement {
  return (
    <text
      x={x}
      y={y}
      dy="0.35em"
      textAnchor="middle"
      fontFamily={FONT}
      fontWeight={900}
      fontSize={size}
      fill={fill}
      stroke={INK}
      strokeWidth={size * 0.16}
      strokeLinejoin="round"
      paintOrder="stroke fill"
    >
      {children}
    </text>
  );
}

function Corner({ card, size }: { card: UnoCard; size: CornerSize }): ReactElement {
  switch (card.kind) {
    case 'number':
      return <Outlined x={size.x} y={15} size={size.index} fill="#ffffff">{card.rank ?? 0}</Outlined>;
    case 'skip':
      return (
        <g transform="translate(11 15) scale(0.3)">
          <SkipSymbol color="#ffffff" />
        </g>
      );
    case 'reverse':
      return (
        <g transform="translate(11 15) scale(0.3)">
          <ReverseSymbol color="#ffffff" />
        </g>
      );
    case 'draw2':
      return <Outlined x={size.x} y={15} size={size.index} fill="#ffffff">+2</Outlined>;
    case 'wild':
      return (
        <g transform="translate(11 16)">
          <Pinwheel cx={0} cy={0} r={6} />
        </g>
      );
    case 'wild4':
      return <Outlined x={size.x} y={15} size={size.index} fill="#ffffff">+4</Outlined>;
  }
}

function Centre({ card, color }: { card: UnoCard; color: string }): ReactElement {
  switch (card.kind) {
    case 'number': {
      const rank = card.rank ?? 0;
      return (
        <>
          <Outlined x={CX} y={46} size={42} fill={color}>{rank}</Outlined>
          {rank === 6 || rank === 9 ? <rect x={CX - 8} y={65.5} width={16} height={3} rx={1.5} fill={INK} /> : null}
        </>
      );
    }
    case 'skip':
      return (
        <g transform={`translate(${CX} ${CY}) scale(1.05)`}>
          <SkipSymbol color={color} />
        </g>
      );
    case 'reverse':
      return (
        <g transform={`translate(${CX} ${CY}) scale(1.05)`}>
          <ReverseSymbol color={color} />
        </g>
      );
    case 'draw2':
      return (
        <g transform={`translate(${CX} ${CY - 4}) scale(1.05)`}>
          <DrawTwoSymbol color={color} />
        </g>
      );
    case 'wild':
      return <Pinwheel cx={CX} cy={CY} r={18} />;
    case 'wild4':
      return (
        <>
          <Pinwheel cx={CX} cy={41} r={13} />
          <text x={CX} y={68} dy="0.35em" textAnchor="middle" fontFamily={FONT} fontWeight={900} fontSize={17} fill={INK}>
            +4
          </text>
        </>
      );
  }
}

function Front({ card, height }: { card: UnoCard; height: number }): ReactElement {
  const wild = card.color === null;
  const size = cornerSize(card, height);
  const field = card.color ? UNO_COLOR_HEX[card.color] : WILD_FIELD;
  const edge = card.color ? DARK[card.color] : '#0c0620';
  const ink = card.color ? UNO_COLOR_HEX[card.color] : INK;
  const glyph = card.color ? UNO_COLOR_GLYPH[card.color] : null;
  return (
    <>
      <rect x={0.75} y={0.75} width={67.5} height={98.5} rx={8} fill="#fdfcff" stroke={INK} strokeWidth={1.5} />
      <rect x={4} y={4} width={61} height={92} rx={5} fill={field} stroke={edge} strokeWidth={1.2} />
      <ellipse cx={CX} cy={CY} rx={22} ry={36} fill="#ffffff" stroke={wild ? INK : edge} strokeWidth={1} transform={`rotate(28 ${CX} ${CY})`} />
      <Centre card={card} color={ink} />
      {glyph && card.kind === 'number' ? (
        <text x={CX} y={76} dy="0.35em" textAnchor="middle" fontFamily={FONT} fontSize={size.centrePip} fill={ink} stroke={INK} strokeWidth={1.4} paintOrder="stroke fill">
          {glyph}
        </text>
      ) : null}
      {[false, true].map((flip) => (
        <g key={String(flip)} transform={flip ? `rotate(180 ${CX} ${CY})` : undefined}>
          <Corner card={card} size={size} />
          {glyph ? (
            <text x={size.x} y={size.pipY} dy="0.35em" textAnchor="middle" fontFamily={FONT} fontSize={size.pip} fill="#ffffff" stroke={INK} strokeWidth={1.3} paintOrder="stroke fill">
              {glyph}
            </text>
          ) : null}
        </g>
      ))}
    </>
  );
}

function Back(): ReactElement {
  return (
    <>
      <rect x={0.75} y={0.75} width={67.5} height={98.5} rx={8} fill={GOLD} stroke={INK} strokeWidth={1.5} />
      <rect x={3.5} y={3.5} width={62} height={93} rx={5.5} fill="#3d1a80" stroke={INK} strokeWidth={1} />
      <rect x={7} y={7} width={55} height={86} rx={3.5} fill="none" stroke={GOLD} strokeWidth={0.9} opacity={0.75} />
      <ellipse cx={CX} cy={CY} rx={21} ry={34} fill={GOLD} stroke={INK} strokeWidth={1.2} transform={`rotate(28 ${CX} ${CY})`} />
      <ellipse cx={CX} cy={CY} rx={16} ry={29} fill="#5b2bb8" transform={`rotate(28 ${CX} ${CY})`} />
      <path
        d={`M${CX} ${CY - 15}L${CX + 5} ${CY - 5}L${CX + 15} ${CY}L${CX + 5} ${CY + 5}L${CX} ${CY + 15}L${CX - 5} ${CY + 5}L${CX - 15} ${CY}L${CX - 5} ${CY - 5}Z`}
        fill={GOLD}
        stroke={INK}
        strokeWidth={1}
        strokeLinejoin="round"
        transform={`rotate(28 ${CX} ${CY})`}
      />
    </>
  );
}

/** Any card from its id (or a card back) at a pixel height. Pure drawing: no ids, no state, safe to render into ghost roots. */
export const CardFace = memo(function CardFace({ card, height, label, className, style }: CardFaceProps): ReactElement {
  const h = Math.max(1, Math.round(height));
  const w = Math.round(h * CARD_ASPECT);
  const cls = `un-card${card === null ? ' un-card-back' : ''}${className ? ` ${className}` : ''}`;
  return (
    <span
      className={cls}
      style={{ width: w, height: h, ...style }}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <svg viewBox="0 0 69 100" preserveAspectRatio="none" focusable="false" aria-hidden="true">
        {card === null ? <Back /> : <Front card={unoCardOf(card)} height={h} />}
      </svg>
    </span>
  );
});
