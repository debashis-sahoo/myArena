import { useSyncExternalStore } from 'react';

function subscribe(listener: () => void) {
  const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  media?.addEventListener('change', listener);
  return () => media?.removeEventListener('change', listener);
}
const getSnapshot = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
export function useReducedMotion(): boolean { return useSyncExternalStore(subscribe, getSnapshot, () => false); }