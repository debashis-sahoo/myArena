import { test, expect, roomContexts, createRoom, joinByCode } from './helpers';

test.describe('the 3D board', () => {
  test.setTimeout(120_000);

  test('loads on demand, reaches the ready state, and offers every action as text and buttons', async ({ browser }) => {
    const { host, player, close } = await roomContexts(browser);
    try {
      for (const page of [host, player]) await page.addInitScript(() => localStorage.setItem('myarena-ludo-quality', 'standard'));
      const code = await createRoom(host, 'Hosty', { game: 'Ludo', players: 2 });
      await joinByCode(player, code, 'Pat');
      await player.getByRole('button', { name: 'I am ready' }).click();
      await host.getByRole('button', { name: 'Start match' }).click();
      for (const page of [host, player]) {
        await expect(page.getByRole('region', { name: 'Ludo match' })).toBeVisible();
        await expect(page.locator('.ludo-board')).toHaveAttribute('data-render-state', 'ready', { timeout: 60_000 });
        await expect(page.locator('.ludo-board')).toHaveAttribute('data-render', '3d');
        await expect(page.locator('canvas.ludo-canvas')).toHaveAttribute('role', 'img');
        await expect(page.getByRole('button', { name: 'Top-down view' })).toBeVisible();
      }
      // The camera toggle is a real button.
      await host.getByRole('button', { name: 'Top-down view' }).click();
      await expect(host.getByRole('button', { name: 'Top-down view' })).toHaveAttribute('aria-pressed', 'true');
      expect(await host.evaluate(() => localStorage.getItem('myarena-ludo-view'))).toBe('top');
      // The rules are playable through the buttons alone.
      const actor = (await host.getByRole('button', { name: 'Roll the die' }).isEnabled()) ? host : player;
      await expect(actor.getByRole('button', { name: 'Roll the die' })).toBeEnabled();
    } finally { await close(); }
  });

  test('uses the flat board, with the same game, when WebGL is not available', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('myarena-ludo-quality', 'high');
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function patched(this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
        if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') return null;
        return (original as (...args: unknown[]) => unknown).call(this, type, ...rest);
      } as typeof original;
    });
    await page.goto('/play/ludo/solo');
    await page.getByRole('button', { name: 'Start game' }).click();
    await expect(page.locator('.ludo-board')).toHaveAttribute('data-render', '2d');
    await expect(page.locator('svg.ludo-board-svg')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Roll the die' })).toBeVisible();
  });

  test('restores a lost graphics context once, then falls back to the flat board with a notice', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('myarena-ludo-quality', 'standard'));
    await page.goto('/play/ludo/solo');
    await page.getByRole('button', { name: 'Start game' }).click();
    const board = page.locator('.ludo-board');
    await expect(board).toHaveAttribute('data-render-state', 'ready', { timeout: 60_000 });
    const lose = () => page.evaluate(() => {
      const canvas = document.querySelector('canvas.ludo-canvas') as HTMLCanvasElement;
      const context = (canvas.getContext('webgl2') ?? canvas.getContext('webgl')) as WebGLRenderingContext;
      const extension = context.getExtension('WEBGL_lose_context')!;
      extension.loseContext();
      window.setTimeout(() => extension.restoreContext(), 300);
    });
    await lose();
    await page.waitForTimeout(1200);
    await expect(board).toHaveAttribute('data-render', '3d');
    await lose();
    await expect(board).toHaveAttribute('data-render', '2d', { timeout: 10_000 });
    await expect(page.getByText('Switched to the simpler board so you can keep playing.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Roll the die' })).toBeVisible();
  });
});
