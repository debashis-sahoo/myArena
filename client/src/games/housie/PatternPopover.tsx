import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactElement } from 'react';
import type { PatternDef } from '@myarena/shared';
import { PatternPicture } from './PatternPicture';
import './PatternPopover.css';

const MARGIN = 8;
const GAP = 8;
const SHEET_BELOW = 560;

interface Pos {
  top: number;
  left: number;
}

export function PatternPopover({
  pattern,
  anchor,
  onClose,
}: {
  pattern: PatternDef;
  anchor: HTMLElement | null;
  onClose: () => void;
}): ReactElement {
  const titleId = useId();
  const ref = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [pos, setPos] = useState<Pos | null>(null);
  const [sheet, setSheet] = useState(() => window.innerWidth < SHEET_BELOW);

  useLayoutEffect(() => {
    const place = (): void => {
      const dialog = ref.current;
      const narrow = window.innerWidth < SHEET_BELOW;
      setSheet(narrow);
      if (narrow || !dialog || !anchor) {
        setPos(null);
        return;
      }
      const a = anchor.getBoundingClientRect();
      const w = dialog.offsetWidth;
      const h = dialog.offsetHeight;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const fitsBelow = a.bottom + GAP + h <= vh - MARGIN;
      const fitsAbove = a.top - GAP - h >= MARGIN;
      let top = fitsBelow || !fitsAbove ? a.bottom + GAP : a.top - GAP - h;
      top = Math.max(MARGIN, Math.min(top, vh - h - MARGIN));
      let left = a.left + a.width / 2 - w / 2;
      left = Math.max(MARGIN, Math.min(left, vw - w - MARGIN));
      setPos((prev) => (prev && prev.top === top && prev.left === left ? prev : { top, left }));
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [anchor]);

  useEffect(() => {
    const dialog = ref.current;
    dialog?.focus();

    const onPointerDown = (e: PointerEvent): void => {
      const target = e.target;
      if (!(target instanceof Node)) return;
      if (dialog?.contains(target) || anchor?.contains(target)) return;
      onCloseRef.current();
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
      }
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKey);

    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKey);
      const active = document.activeElement;
      if (!active || active === document.body || dialog?.contains(active)) anchor?.focus();
    };
  }, [anchor]);

  const style: CSSProperties | undefined = !sheet
    ? pos
      ? { top: pos.top, left: pos.left }
      : { top: 0, left: 0, visibility: 'hidden' }
    : undefined;

  return (
    <div
      ref={ref}
      className={`hz-popover${sheet ? ' sheet' : ''}`}
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      tabIndex={-1}
      style={style}
    >
      <PatternPicture pattern={pattern} size="lg" />
      <div className="hz-popover-text">
        <h3 id={titleId} className="hz-popover-name">
          {pattern.name}
        </h3>
        <p className="hz-popover-desc">{pattern.description}</p>
      </div>
      <button type="button" className="hz-btn hz-popover-close" onClick={onClose}>
        Close
      </button>
    </div>
  );
}
