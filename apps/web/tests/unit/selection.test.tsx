import { renderHook, act } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { resolveSelection, useSelection } from '../../src/features/landing/selection';
import { bothModes, comingSoon, onlineOnly } from './catalog-fixtures';

const entries = [bothModes, onlineOnly, comingSoon];
const wrapper = (path: string) => ({ children }: { children: ReactNode }) => <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter>;

describe('resolveSelection', () => {
  it('selects only playable games', () => {
    expect(resolveSelection(entries, 'both-game')).toBe(bothModes);
    expect(resolveSelection(entries, 'later-game')).toBeNull();
    expect(resolveSelection(entries, 'unknown')).toBeNull();
    expect(resolveSelection(entries, null)).toBeNull();
  });
});

describe('useSelection', () => {
  it('reads ?game=, ignores unusable ids, and selects and dismisses through the URL', () => {
    const { result } = renderHook(() => ({ selection: useSelection(entries), location: useLocation() }), { wrapper: wrapper('/?game=later-game') });
    expect(result.current.selection.selected).toBeNull();
    act(() => result.current.selection.select(onlineOnly));
    expect(result.current.location.search).toBe('?game=online-game');
    expect(result.current.selection.selected).toBe(onlineOnly);
    act(() => result.current.selection.select(bothModes));
    expect(result.current.selection.selected).toBe(bothModes);
    act(() => result.current.selection.dismiss());
    expect(result.current.location.search).toBe('');
    expect(result.current.selection.selected).toBeNull();
  });

  it('preselects from the URL', () => {
    const { result } = renderHook(() => useSelection(entries), { wrapper: wrapper('/?game=online-game') });
    expect(result.current.selected).toBe(onlineOnly);
  });
});
