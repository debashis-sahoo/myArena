import { displayNameSchema } from '@myarena/protocol';

export const preferenceKeys = {
  name: 'myarena-name',
  effects: 'myarena-effects',
  sound: 'myarena-sound',
} as const;

export interface Preferences { displayName: string; effects: boolean; sound: boolean }

function read(key: string): string | null {
  try { return window.localStorage.getItem(key); } catch { return null; }
}

function write(key: string, value: string | null): void {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch { /* storage may be blocked; preferences just do not persist */ }
}

export const prefersReducedMotion = (): boolean =>
  typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function getPreferences(): Preferences {
  const name = read(preferenceKeys.name);
  const parsedName = name === null ? null : displayNameSchema.safeParse(name);
  const effects = read(preferenceKeys.effects);
  const sound = read(preferenceKeys.sound);
  return {
    displayName: parsedName?.success ? parsedName.data : '',
    effects: effects === 'on' ? true : effects === 'off' ? false : !prefersReducedMotion(),
    sound: sound !== 'off',
  };
}

const listeners = new Set<() => void>();
const notify = () => { for (const listener of listeners) listener(); };

/** Lets the header follow changes made anywhere in the app. */
export function onPreferencesChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function saveDisplayName(name: string): void { write(preferenceKeys.name, name); notify(); }
export function saveEffects(on: boolean): void { write(preferenceKeys.effects, on ? 'on' : 'off'); notify(); }
export function saveSound(on: boolean): void { write(preferenceKeys.sound, on ? 'on' : 'off'); notify(); }
