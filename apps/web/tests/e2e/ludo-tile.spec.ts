import { test, expect, AxeBuilder } from './helpers';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const picture = '**/assets/ludo-tile-*';

test.describe('Ludo tile picture', () => {
  test('shows a loaded picture on the Ludo tile without changing the tile size', async ({ page }) => {
    await page.route(picture, async (route) => { await new Promise((resolve) => setTimeout(resolve, 600)); await route.continue(); });
    await page.goto('/');
    const tile = page.getByRole('button', { name: /^Ludo/ });
    await expect(tile).toBeVisible();
    await expect(tile.getByText(/Playable/)).toBeVisible();
    const before = await tile.boundingBox();
    const img = tile.locator('img');
    await expect.poll(() => img.evaluate((node: HTMLImageElement) => node.complete && node.naturalWidth)).toBeGreaterThan(0);
    const after = await tile.boundingBox();
    expect(after?.width).toBe(before?.width);
    expect(after?.height).toBe(before?.height);
    await expect(img).toHaveAttribute('alt', '');
  });

  test('keeps the tile name free of picture text', async ({ page }) => {
    await page.goto('/');
    const tile = page.getByRole('button', { name: /^Ludo/ });
    await expect(tile.locator('img')).toBeVisible();
    await expect(page.getByRole('img')).toHaveCount(0);
    const name = await tile.getAttribute('aria-labelledby');
    expect(name).toContain('tile-ludo-title');
  });

  test('falls back to the icon art, with no broken image, when the picture cannot load', async ({ page }) => {
    await page.route(picture, (route) => route.abort());
    await page.goto('/');
    const tile = page.getByRole('button', { name: /^Ludo/ });
    await expect(tile).toBeVisible();
    await expect(tile.locator('img')).toHaveCount(0);
    await expect(tile.locator('.art svg')).toBeVisible();
  });

  for (const scheme of ['light', 'dark'] as const) {
    test(`has no axe violations and no overflow at 320 px in the ${scheme} theme`, async ({ browser }) => {
      const context = await browser.newContext({ colorScheme: scheme, viewport: { width: 320, height: 800 } });
      const page = await context.newPage();
      try {
        await page.addInitScript((theme) => localStorage.setItem('myarena-theme', theme), scheme);
        await page.goto('/');
        await expect(page.getByRole('button', { name: /^Ludo/ }).locator('img')).toBeVisible();
        const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
        expect(violations.map((violation) => violation.id)).toEqual([]);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow).toBeLessThanOrEqual(0);
      } finally { await context.close(); }
    });
  }
});
