import { useLayoutEffect, useRef, useState, useSyncExternalStore, type RefObject } from 'react';

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(query);
      mq.addEventListener('change', cb);
      return () => mq.removeEventListener('change', cb);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

export interface LayoutMode {
  /** Landscape with room for two columns: stage left, panel right. Otherwise stacked. */
  side: boolean;
  /** Wide enough to dock chat next to the board or lobby; otherwise chat is a bottom drawer. */
  dockedChat: boolean;
}

export function useLayoutMode(): LayoutMode {
  const landscape = useMediaQuery('(orientation: landscape)');
  const minWidth560 = useMediaQuery('(min-width: 560px)');
  const minWidth700 = useMediaQuery('(min-width: 700px) and (min-height: 540px)');
  return { side: landscape && minWidth560, dockedChat: minWidth700 };
}

export function useReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}

/** Measures an element's content box with one ResizeObserver; integer sizes, 0,0 until measured. */
export function useRegionSize<T extends HTMLElement>(): { ref: RefObject<T | null>; width: number; height: number } {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = (): void => {
      const width = Math.max(0, Math.floor(el.clientWidth));
      const height = Math.max(0, Math.floor(el.clientHeight));
      setSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener('orientationchange', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('orientationchange', measure);
    };
  }, []);

  return { ref, width: size.width, height: size.height };
}
