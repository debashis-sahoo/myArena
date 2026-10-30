import { test, expect, AxeBuilder } from './helpers';

for (const theme of ['light', 'dark']) {
  test(`shell supports ${theme} theme and accessible navigation`, async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Color theme').selectOption(theme);
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    await expect(page.getByRole('heading', { name: 'Your Friends. Your Arena.' })).toBeVisible();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.reload();
    await expect(page.getByLabel('Color theme')).toHaveValue(theme);
  });
}

test('shell routes reflow without horizontal overflow', async ({ page }) => {
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
  await page.goto('/join/ABCDEFGH23');
  await expect(page.getByRole('heading', { name: "This invitation can't be used" })).toBeVisible();
});