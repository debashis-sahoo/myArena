import { useSyncExternalStore } from 'react';
import { getPreferences, onPreferencesChange, prefersReducedMotion } from '../../../platform/preferences';

const subscribe = (listener: () => void): (() => void) => {
  const off = onPreferencesChange(listener);
  const query = typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  query?.addEventListener('change', listener);
  return () => { off(); query?.removeEventListener('change', listener); };
};

/** True when motion must be skipped: the system asks for reduced motion, or the player turned effects off. */
export const useInstantMotion = (): boolean => useSyncExternalStore(subscribe, () => prefersReducedMotion() || !getPreferences().effects, () => false);
