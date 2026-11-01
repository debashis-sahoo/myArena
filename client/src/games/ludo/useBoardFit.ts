import { useLayoutEffect, useState } from 'react';

/**
 * Measures the board's region and returns the largest square that fits it, re-fitting on every resize, rotation,
 * and column change (FR-003). In portrait the board never exceeds 85% of the viewport height (FR-005).
 */
export function useBoardFit(portraitCap: boolean): { ref: (el: HTMLElement | null) => void; side: number } {
  const [el, setEl] = useState<HTMLElement | null>(null);
  const [side, setSide] = useState(0);

  useLayoutEffect(() => {
    if (!el) return;
    const measure = (): void => {
      const cap = portraitCap ? 0.85 * window.innerHeight : Number.POSITIVE_INFINITY;
      setSide(Math.max(0, Math.floor(Math.min(el.clientWidth, el.clientHeight, cap))));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener('resize', measure);
    window.addEventListener('orientationchange', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
      window.removeEventListener('orientationchange', measure);
    };
  }, [el, portraitCap]);

  return { ref: setEl, side };
}
