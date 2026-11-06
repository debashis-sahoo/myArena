import { useLayoutEffect, useState, type ReactElement, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';

/**
 * Short overlays ("You draw 8", "+2", "UNO!") drawn on document.body above the card flight layer, over the box of `anchor`,
 * so cards in flight never cover them. `trigger` changes whenever the overlay should re-read the anchor's position.
 */
export function TopLayer({ anchor, trigger, children }: { anchor: RefObject<HTMLElement | null>; trigger: unknown; children: ReactNode }): ReactElement | null {
  const [rect, setRect] = useState<DOMRect | null>(null);
  useLayoutEffect(() => {
    const el = anchor.current;
    if (!el) return;
    const read = (): void => setRect(el.getBoundingClientRect());
    read();
    window.addEventListener('resize', read);
    return () => window.removeEventListener('resize', read);
  }, [anchor, trigger]);
  if (!rect) return null;
  return createPortal(
    <div className="un un-toplayer" aria-hidden="true" style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }}>
      {children}
    </div>,
    document.body,
  );
}
