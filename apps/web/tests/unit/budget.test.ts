import { describe, expect, it } from 'vitest';
import { BUDGET_BYTES, checkBudget, type ChunkInfo } from '../../build/budget';

const chunk = (overrides: Partial<ChunkInfo> = {}): ChunkInfo => ({ name: 'index.js', gzipBytes: 100 * 1024, modules: ['src/main.tsx'], lazy: false, ...overrides });

describe('bundle budget', () => {
  it('allows initial JavaScript up to 200 KB gzipped', () => {
    expect(checkBudget([chunk({ gzipBytes: BUDGET_BYTES })])).toMatchObject({ ok: true, problems: [] });
    expect(checkBudget([chunk({ gzipBytes: 120 * 1024 }), chunk({ name: 'vendor.js', gzipBytes: 80 * 1024 })]).ok).toBe(true);
  });

  it('fails when the initial chunks together exceed the budget', () => {
    const result = checkBudget([chunk({ gzipBytes: 150 * 1024 }), chunk({ name: 'vendor.js', gzipBytes: 60 * 1024 })]);
    expect(result.ok).toBe(false);
    expect(result.problems[0]).toContain('210.0 KB');
  });

  it('does not count lazily loaded chunks', () => {
    expect(checkBudget([chunk({ gzipBytes: 150 * 1024 }), chunk({ name: 'game.js', gzipBytes: 900 * 1024, lazy: true })]).ok).toBe(true);
  });

  it('keeps solo game modules out of the initial budget but still counts the landing code', () => {
    const solo = chunk({ name: 'TestSolo-abc.js', gzipBytes: 300 * 1024, lazy: true, modules: ['src/features/solo/test-game/TestSolo.tsx'] });
    expect(checkBudget([chunk({ gzipBytes: 199 * 1024 }), solo]).ok).toBe(true);
    const over = checkBudget([chunk({ gzipBytes: 201 * 1024 }), solo]);
    expect(over.ok).toBe(false);
    expect(over.initialBytes).toBe(201 * 1024);
  });

  it('fails when Babylon.js is bundled, even lazily', () => {
    const byName = checkBudget([chunk({ name: 'babylon-core.js' })]);
    const byModule = checkBudget([chunk({ lazy: true, modules: ['node_modules/@babylonjs/core/index.js'] })]);
    for (const result of [byName, byModule]) {
      expect(result.ok).toBe(false);
      expect(result.problems.join(' ')).toContain('Babylon.js');
    }
  });
});
