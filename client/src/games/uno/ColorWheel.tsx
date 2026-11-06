import './ColorWheel.css';
import { useEffect, useId, useRef, useState, type CSSProperties, type ReactElement } from 'react';
import { createPortal } from 'react-dom';
import { UNO_COLORS, UNO_COLOR_GLYPH, UNO_COLOR_HEX, UNO_COLOR_LABEL, type UnoColor } from '@myarena/shared';

/*
 * The colour wheel for a Wild or Wild Draw 4: a modal four-wedge radio group centred on the screen.
 *   open      shows the wheel; nothing is rendered when false
 *   onChoose  a wedge was clicked, or Enter, Space or the keys 1 to 4 (red, yellow, green, blue) were pressed
 *   onCancel  Cancel, Escape or a tap outside: the card goes back to the hand and nothing is sent
 *   title     optional heading, for example "Wild Draw Four: pick a colour"
 * Rendered in a portal on document.body (inside its own .un scope), so the table's shake and clipping cannot move it.
 */
export interface ColorWheelProps {
  open: boolean;
  onChoose: (color: UnoColor) => void;
  onCancel: () => void;
  title?: string;
}

const CENTRE = 150;
const R_OUT = 140;
const R_IN = 50;
const R_LABEL = (R_OUT + R_IN) / 2;
const R_KEY = R_OUT - 16;
const FOCUSABLE = 'button:not([disabled]), [role="radio"][tabindex="0"]';

const f1 = (v: number): string => v.toFixed(1);
const at = (r: number, deg: number): [number, number] => [CENTRE + r * Math.cos((deg * Math.PI) / 180), CENTRE + r * Math.sin((deg * Math.PI) / 180)];
const pt = (r: number, deg: number): string => at(r, deg).map(f1).join(' ');

/** Quadrants clockwise from the upper left, the same order as the pinwheel on a Wild card. */
function wedgePath(i: number): string {
  const a0 = 180 + 90 * i;
  const a1 = a0 + 90;
  return `M${pt(R_IN, a0)}L${pt(R_OUT, a0)}A${R_OUT} ${R_OUT} 0 0 1 ${pt(R_OUT, a1)}L${pt(R_IN, a1)}A${R_IN} ${R_IN} 0 0 0 ${pt(R_IN, a0)}Z`;
}

export function ColorWheel({ open, onChoose, onCancel, title = 'Choose a colour' }: ColorWheelProps): ReactElement | null {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const radios = useRef<Array<SVGGElement | null>>([]);
  const [tab, setTab] = useState(0);
  const handlers = useRef({ onChoose, onCancel });
  handlers.current = { onChoose, onCancel };

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    setTab(0);
    radios.current[0]?.focus();

    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        handlers.current.onCancel();
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const digit = e.key.length === 1 ? '1234'.indexOf(e.key) : -1;
      const picked = digit >= 0 ? UNO_COLORS[digit] : undefined;
      if (picked) {
        e.preventDefault();
        e.stopPropagation();
        handlers.current.onChoose(picked);
        return;
      }

      const focused = radios.current.findIndex((el) => el !== null && el === document.activeElement);
      if (e.key === 'Tab') {
        const items = [...(dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])];
        const first = items[0];
        const last = items[items.length - 1];
        if (!first || !last) {
          e.preventDefault();
          return;
        }
        const inside = dialogRef.current?.contains(document.activeElement) ?? false;
        if (!inside || (e.shiftKey && document.activeElement === first) || (!e.shiftKey && document.activeElement === last)) {
          e.preventDefault();
          (e.shiftKey ? last : first).focus();
        }
        return;
      }
      if (focused < 0) return;
      const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
      if (step !== 0) {
        e.preventDefault();
        radios.current[(focused + step + UNO_COLORS.length) % UNO_COLORS.length]?.focus();
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        const color = UNO_COLORS[focused];
        if (color) handlers.current.onChoose(color);
      }
    };

    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      previous?.focus?.();
    };
  }, [open]);

  if (!open) return null;
  return createPortal(
    <div className="un un-wheel-host">
      <div className="un-wheel-backdrop" onPointerDown={(e) => e.target === e.currentTarget && onCancel()}>
        <div className="un-wheel-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId} ref={dialogRef}>
          <h2 id={titleId} className="un-wheel-title">
            {title}
          </h2>
          <div className="un-wheel" role="radiogroup" aria-labelledby={titleId}>
            <svg viewBox="0 0 300 300" focusable="false">
              <circle className="un-wheel-disc" cx={CENTRE} cy={CENTRE} r={R_OUT + 8} />
              {UNO_COLORS.map((color, i) => {
                const mid = 225 + 90 * i;
                const [lx, ly] = at(R_LABEL, mid);
                const [kx, ky] = at(R_KEY, mid - 29);
                return (
                  <g
                    key={color}
                    ref={(el) => {
                      radios.current[i] = el;
                    }}
                    className="un-wedge"
                    role="radio"
                    aria-checked="false"
                    aria-label={`${UNO_COLOR_LABEL[color]}, key ${i + 1}`}
                    tabIndex={tab === i ? 0 : -1}
                    style={{ '--w': UNO_COLOR_HEX[color] } as CSSProperties}
                    onFocus={() => setTab(i)}
                    onClick={() => onChoose(color)}
                  >
                    <path className="un-wedge-shape" d={wedgePath(i)} />
                    <text className="un-wedge-glyph" x={f1(lx)} y={f1(ly - 10)} textAnchor="middle" dominantBaseline="central">
                      {UNO_COLOR_GLYPH[color]}
                    </text>
                    <text className="un-wedge-name" x={f1(lx)} y={f1(ly + 22)} textAnchor="middle" dominantBaseline="central">
                      {UNO_COLOR_LABEL[color]}
                    </text>
                    <text className="un-wedge-key" x={f1(kx)} y={f1(ky)} textAnchor="middle" dominantBaseline="central">
                      {i + 1}
                    </text>
                  </g>
                );
              })}
            </svg>
            <button type="button" className="un-btn un-wheel-cancel" onClick={onCancel}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
