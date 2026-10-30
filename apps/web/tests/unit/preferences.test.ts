import { afterEach, describe, expect, it, vi } from 'vitest';
import { getPreferences, preferenceKeys, saveDisplayName, saveEffects, saveSound } from '../../src/platform/preferences';

afterEach(() => { vi.unstubAllGlobals(); window.localStorage.clear(); });

const reducedMotion = (reduce: boolean) =>
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: reduce && query.includes('reduce'), addEventListener: () => {}, removeEventListener: () => {} }));

describe('preferences', () => {
  it('defaults to no name, effects on, and sound on', () => {
    expect(getPreferences()).toEqual({ displayName: '', effects: true, sound: true });
  });

  it('defaults effects to off when reduced motion is requested, but respects a stored choice', () => {
    reducedMotion(true);
    expect(getPreferences().effects).toBe(false);
    saveEffects(true);
    expect(getPreferences().effects).toBe(true);
  });

  it('persists name, effects and sound under their own keys only', () => {
    saveDisplayName('Sam');
    saveEffects(false);
    saveSound(false);
    expect(getPreferences()).toEqual({ displayName: 'Sam', effects: false, sound: false });
    expect(Object.keys(window.localStorage).sort()).toEqual([preferenceKeys.effects, preferenceKeys.name, preferenceKeys.sound].sort());
    expect(window.localStorage.getItem('myarena-effects')).toBe('off');
    expect(window.localStorage.getItem('myarena-sound')).toBe('off');
  });

  it('drops an invalid stored name and ignores unknown stored values', () => {
    window.localStorage.setItem(preferenceKeys.name, '   ');
    window.localStorage.setItem(preferenceKeys.effects, 'maybe');
    window.localStorage.setItem(preferenceKeys.sound, 'loud');
    expect(getPreferences()).toEqual({ displayName: '', effects: true, sound: true });
    window.localStorage.setItem(preferenceKeys.name, 'x'.repeat(25));
    expect(getPreferences().displayName).toBe('');
  });

  it('tolerates blocked storage', () => {
    const blocked = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); }, removeItem: () => { throw new Error('blocked'); } };
    vi.stubGlobal('localStorage', blocked);
    expect(getPreferences()).toEqual({ displayName: '', effects: true, sound: true });
    expect(() => saveDisplayName('Sam')).not.toThrow();
  });

  it('resets to first-visit behavior once site data is cleared', () => {
    saveDisplayName('Sam');
    saveSound(false);
    window.localStorage.clear();
    expect(getPreferences()).toEqual({ displayName: '', effects: true, sound: true });
  });
});
