import { test, expect, openCreatePanel } from './helpers';

const chip = (page: import('@playwright/test').Page, name: string | RegExp) => page.getByRole('button', { name });

test('remembers a display name, prefills the forms, and validates changes', async ({ page }) => {
  await page.goto('/');
  await chip(page, 'Set your name').click();
  const dialog = page.getByRole('dialog', { name: 'Your display name' });
  await dialog.getByLabel('Display name').fill('');
  await dialog.getByRole('button', { name: 'Save name' }).click();
  await expect(dialog.getByRole('alert')).toContainText('Use 1 to 24 letters, numbers, or spaces.');
  await dialog.getByLabel('Display name').fill('Zed');
  await dialog.getByRole('button', { name: 'Save name' }).click();
  await expect(dialog).toBeHidden();
  await expect(chip(page, 'Zed')).toBeVisible();

  await page.reload();
  await expect(chip(page, 'Zed')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Join with Room Code' }).getByLabel('Display name')).toHaveValue('Zed');
  const options = await openCreatePanel(page);
  await expect(options.getByLabel('Display name')).toHaveValue('Zed');
});

test('keeps effects and sound across a reload and forgets them with the site data', async ({ page }) => {
  await page.goto('/');
  const effects = chip(page, /^Effects/);
  const sound = chip(page, 'Sound');
  await expect(effects).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('html')).toHaveAttribute('data-effects', 'on');
  await effects.click();
  await sound.click();
  await expect(page.locator('html')).toHaveAttribute('data-effects', 'off');
  await expect(sound).toHaveAttribute('aria-pressed', 'false');

  await page.reload();
  await expect(chip(page, /^Effects/)).toHaveAttribute('aria-pressed', 'false');
  await expect(chip(page, 'Sound')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('html')).toHaveAttribute('data-effects', 'off');

  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(chip(page, /^Effects/)).toHaveAttribute('aria-pressed', 'true');
  await expect(chip(page, 'Sound')).toHaveAttribute('aria-pressed', 'true');
  await expect(chip(page, 'Set your name')).toBeVisible();
});

test('a name used to create a room is remembered on the device', async ({ page }) => {
  const options = await openCreatePanel(page);
  await options.getByLabel('Display name').fill('Hosty');
  await options.getByRole('button', { name: 'Create room', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Room lobby' })).toBeVisible();
  await page.goto('/');
  await expect(chip(page, 'Hosty')).toBeVisible();
});
