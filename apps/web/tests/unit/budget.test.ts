import { describe, expect, it } from 'vitest';
import { BUDGET_BYTES, LUDO_LAZY_BUDGET_BYTES, TILE_IMAGE_BUDGET_BYTES, checkBudget, checkTileImages, type ChunkInfo } from '../../build/budget';

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

  it('fails when Three.js is in a chunk loaded up front, but allows it lazily', () => {
    const threeModule = 'node_modules/three/build/three.module.js';
    const upfrontByModule = checkBudget([chunk({ modules: ['src/main.tsx', threeModule] })]);
    const upfrontByName = checkBudget([chunk({ name: 'three-abc.js' })]);
    for (const result of [upfrontByModule, upfrontByName]) {
      expect(result.ok).toBe(false);
      expect(result.problems.join(' ')).toContain('Three.js');
    }
    expect(checkBudget([chunk(), chunk({ name: 'scene-abc.js', lazy: true, gzipBytes: 150 * 1024, modules: [threeModule] })]).ok).toBe(true);
  });

  it('limits the Ludo lazy chunks together to 400 KB gzipped', () => {
    const ludo = (name: string, gzipBytes: number, module = 'src/features/ludo/view/BoardView3D.tsx') => chunk({ name, gzipBytes, lazy: true, modules: [module] });
    expect(LUDO_LAZY_BUDGET_BYTES).toBe(400 * 1024);
    const fits = checkBudget([chunk(), ludo('ludo.js', 150 * 1024), ludo('scene.js', 250 * 1024, 'node_modules/three/build/three.module.js')]);
    expect(fits).toMatchObject({ ok: true, ludoLazyBytes: 400 * 1024 });
    const over = checkBudget([chunk(), ludo('ludo.js', 150 * 1024), ludo('scene.js', 251 * 1024, 'node_modules/three/build/three.module.js')]);
    expect(over.ok).toBe(false);
    expect(over.problems.join(' ')).toContain('Ludo lazy chunks');
  });

  it('does not count other lazy chunks towards the Ludo limit', () => {
    const other = chunk({ name: 'other.js', gzipBytes: 900 * 1024, lazy: true, modules: ['src/features/solo/test-game/TestSolo.tsx'] });
    expect(checkBudget([chunk(), other]).ludoLazyBytes).toBe(0);
  });

  it('limits a game tile picture to 100 KB and ignores other assets', () => {
    expect(TILE_IMAGE_BUDGET_BYTES).toBe(100 * 1024);
    expect(checkTileImages([{ fileName: 'assets/ludo-tile-abc123.svg', bytes: 100 * 1024 }])).toEqual([]);
    const over = checkTileImages([{ fileName: 'assets/ludo-tile-abc123.svg', bytes: 100 * 1024 + 1 }]);
    expect(over).toHaveLength(1);
    expect(over[0]).toContain('ludo-tile-abc123.svg');
    expect(checkTileImages([{ fileName: 'assets/font-abc.woff2', bytes: 900 * 1024 }])).toEqual([]);
  });
});
