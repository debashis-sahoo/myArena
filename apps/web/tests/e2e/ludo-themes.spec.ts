import type { Page } from '@playwright/test';
import { test, expect, AxeBuilder, roomContexts, createRoom, joinByCode } from './helpers';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function ludoRoom(host: Page, player: Page) {
  const code = await createRoom(host, 'Hosty', { game: 'Ludo', players: 2 });
  await joinByCode(player, code, 'Pat');
}

test.describe('Ludo themes', () => {
  test.setTimeout(90_000);

  test('the host chooses Diwali, everyone sees it, and the match wears it', async ({ browser }) => {
    const { host, player, close } = await roomContexts(browser);
    try {
      for (const page of [host, player]) await page.addInitScript(() => localStorage.setItem('myarena-ludo-quality', 'lite'));
      await ludoRoom(host, player);
      await expect(player.getByText('Theme: Classic')).toBeVisible();
      await expect(player.getByRole('radio', { name: /Diwali/ })).toHaveCount(0);

      await host.getByRole('radio', { name: /Diwali/ }).click();
      await expect(player.getByText('Theme: Diwali')).toBeVisible();

      // The radios are native, so the arrow keys move the choice.
      await host.getByRole('radio', { name: /Diwali/ }).focus();
      await host.keyboard.press('ArrowDown');
      await expect(host.getByRole('radio', { name: /Winter Holidays/ })).toBeChecked();
      await expect(player.getByText('Theme: Winter Holidays')).toBeVisible();
      await host.getByRole('radio', { name: /Diwali/ }).click();
      await expect(player.getByText('Theme: Diwali')).toBeVisible();

      await player.getByRole('button', { name: 'I am ready' }).click();
      await host.getByRole('button', { name: 'Start match' }).click();
      for (const page of [host, player]) {
        await expect(page.locator('.ludo-board')).toHaveAttribute('data-theme', 'diwali');
        await expect(page.getByRole('radio', { name: /Classic/ })).toHaveCount(0);
        await expect(page.getByText('Theme: Diwali')).toBeVisible();
      }
    } finally { await close(); }
  });

  for (const variant of [
    { name: 'system', scheme: 'dark' as const, theme: null },
    { name: 'light', scheme: 'light' as const, theme: 'light' },
    { name: 'dark', scheme: 'dark' as const, theme: 'dark' },
  ]) {
    test(`has no axe violations in the lobby in the ${variant.name} theme`, async ({ browser }) => {
      const { host, player, close } = await roomContexts(browser, { colorScheme: variant.scheme });
      try {
        if (variant.theme) for (const page of [host, player]) await page.addInitScript((theme) => localStorage.setItem('myarena-theme', theme), variant.theme);
        await ludoRoom(host, player);
        await expect(host.getByRole('group', { name: 'Theme' })).toBeVisible();
        for (const page of [host, player]) {
          const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
          expect(violations.map((violation) => ({ id: violation.id, targets: violation.nodes.map((node) => node.target) }))).toEqual([]);
        }
      } finally { await close(); }
    });
  }
});
