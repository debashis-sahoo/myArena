import type { Page } from '@playwright/test';
import { test, expect } from './helpers';

const NOTICE = 'Switched to the simpler board so you can keep playing.';
const roll = (page: Page) => page.getByRole('button', { name: 'Roll the die' });

async function startSolo(page: Page) {
  await page.goto('/play/ludo/solo');
  await page.getByRole('button', { name: 'Start game' }).click();
}

test.describe('Ludo visual quality', () => {
  test.setTimeout(120_000);

  test('Lite shows the same information and the same rules on the flat board', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('myarena-ludo-quality', 'lite'));
    await startSolo(page);
    const board = page.locator('.ludo-board');
    await expect(board).toHaveAttribute('data-render', '2d');
    await expect(board).toHaveAttribute('data-render-state', 'ready');
    await expect(page.locator('svg.ludo-board-svg')).toBeVisible();
    await expect(page.locator('.ludo-status')).toBeVisible();
    await expect(page.getByRole('list', { name: 'Board description' })).toBeAttached();
    await expect(roll(page)).toBeVisible();
    for (let attempt = 0; attempt < 60 && !(await roll(page).isEnabled()); attempt += 1) await page.waitForTimeout(500);
    await roll(page).click();
    await expect(board).toHaveAttribute('data-die-face', /^[1-6]$/, { timeout: 5000 });
    await expect(page.locator('.ludo-status')).toContainText('rolled a');
  });

  test('the quality can be changed at any time and is remembered', async ({ page }) => {
    await page.addInitScript(() => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('myarena-ludo-quality', 'lite'); } });
    await startSolo(page);
    const board = page.locator('.ludo-board');
    await expect(board).toHaveAttribute('data-render', '2d');
    await page.locator('summary', { hasText: 'Visual quality' }).click();
    await page.getByRole('radio', { name: 'Standard' }).click();
    await expect(board).toHaveAttribute('data-render', '3d');
    await expect(board).toHaveAttribute('data-render-state', 'ready', { timeout: 60_000 });
    expect(await page.evaluate(() => localStorage.getItem('myarena-ludo-quality'))).toBe('standard');
    await page.getByRole('radio', { name: 'Lite' }).click();
    await expect(board).toHaveAttribute('data-render', '2d');
    await page.getByRole('radio', { name: 'Automatic' }).click();
    expect(await page.evaluate(() => localStorage.getItem('myarena-ludo-quality'))).toBeNull();
  });

  test('with WebGL disabled the flat board takes over, with a notice, and the game still works', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('myarena-ludo-quality', 'high');
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function patched(this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
        if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') return null;
        return (original as (...args: unknown[]) => unknown).call(this, type, ...rest);
      } as typeof original;
    });
    await startSolo(page);
    await expect(page.locator('.ludo-board')).toHaveAttribute('data-render', '2d');
    await expect(page.getByText(NOTICE)).toBeVisible();
    await expect(roll(page)).toBeVisible();
  });

  test('when the scene fails to start, the flat board takes over with the notice', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('myarena-ludo-quality', 'standard');
      // WebGL looks available, but creating a real context fails, as on a blocked or broken driver.
      const original = HTMLCanvasElement.prototype.getContext;
      let probes = 0;
      HTMLCanvasElement.prototype.getContext = function patched(this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
        if (type === 'webgl' || type === 'webgl2') {
          probes += 1;
          if (probes > 1) return null;
        }
        return (original as (...args: unknown[]) => unknown).call(this, type, ...rest);
      } as typeof original;
    });
    await startSolo(page);
    await expect(page.locator('.ludo-board')).toHaveAttribute('data-render', '2d', { timeout: 30_000 });
    await expect(page.locator('.ludo-board')).toHaveAttribute('data-render-state', 'fallback');
    await expect(page.getByText(NOTICE)).toBeVisible();
    await expect(roll(page)).toBeVisible();
  });
});
