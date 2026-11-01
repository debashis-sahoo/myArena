import { useSyncExternalStore } from 'react';

function useQuery(query: string): boolean {
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
  const landscape = useQuery('(orientation: landscape)');
  const minWidth560 = useQuery('(min-width: 560px)');
  const minWidth700 = useQuery('(min-width: 700px) and (min-height: 540px)');
  return { side: landscape && minWidth560, dockedChat: minWidth700 };
}

export function useReducedMotion(): boolean {
  return useQuery('(prefers-reduced-motion: reduce)');
}
