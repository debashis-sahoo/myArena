import type { Page } from '@playwright/test';
import { test, expect, AxeBuilder, roomContexts, createRoom, inviteLink, openCreatePanel } from './helpers';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function scan(page: Page, screen: string) {
  const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  expect(violations.map((violation) => ({ id: violation.id, targets: violation.nodes.map((node) => node.target) })), screen).toEqual([]);
}

const variants = [
  { name: 'light', theme: 'light', colorScheme: 'light' as const },
  { name: 'dark', theme: 'dark', colorScheme: 'dark' as const },
  { name: 'system default in a dark browser', theme: null, colorScheme: 'dark' as const },
];

for (const variant of variants) {
  test(`axe finds no WCAG 2.2 AA violations on any screen in the ${variant.name} theme`, async ({ browser }) => {
    const { host, player, close } = await roomContexts(browser, { colorScheme: variant.colorScheme });
    try {
      if (variant.theme) {
        for (const page of [host, player]) await page.addInitScript((theme) => localStorage.setItem('myarena-theme', theme), variant.theme);
      }

      await host.goto('/');
      await scan(host, 'landing page');
      const options = await openCreatePanel(host);
      await scan(host, 'landing page with a game selected and the create controls open');
      await options.getByRole('button', { name: 'Create room', exact: true }).click();
      await expect(host.getByRole('alert')).toBeVisible();
      await scan(host, 'create controls with an error summary');

      const code = await createRoom(host);
      await player.goto(inviteLink(host, code));
      await expect(player.getByRole('heading', { name: 'Join a room', level: 1 })).toBeVisible();
      await scan(player, 'join by invite link');
      await player.getByLabel('Display name').fill('Pat');
      await player.getByRole('button', { name: 'Join room' }).click();
      await expect(player.getByRole('heading', { name: 'Room lobby' })).toBeVisible();

      await host.getByLabel('Choose a game').selectOption({ label: 'Test match' });
      await player.getByRole('button', { name: 'I am ready' }).click();
      await player.getByLabel('Message', { exact: true }).fill('hello');
      await player.getByRole('button', { name: 'Send' }).click();
      await expect(host.getByRole('log', { name: 'Chat messages' })).toContainText('hello');
      await host.getByRole('button', { name: 'Start match' }).click();
      await scan(host, 'lobby as host');
      await scan(player, 'lobby as player');

      await host.getByRole('button', { name: 'Remove Pat' }).click();
      await scan(host, 'remove member dialog');
      await host.getByRole('button', { name: 'Cancel' }).click();
      await host.getByRole('button', { name: 'Hand off host role' }).click();
      await scan(host, 'hand off dialog');
      await host.getByRole('button', { name: 'Cancel' }).click();
      await player.getByRole('button', { name: 'Leave room' }).click();
      await scan(player, 'leave dialog');
      await player.getByRole('button', { name: 'Stay' }).click();

      await host.getByRole('button', { name: 'Close room' }).click();
      await host.getByRole('dialog').getByRole('button', { name: 'Close room' }).click();
      for (const page of [host, player]) await expect(page.getByRole('heading', { name: 'This room has closed' })).toBeVisible();
      await scan(host, 'room closed');

      await player.goto('/join/ZZZZZZZZZZ');
      await expect(player.getByRole('heading', { name: "This invitation can't be used" })).toBeVisible();
      await scan(player, 'unavailable invitation');
    } finally { await close(); }
  });
}

test('landing tiles expose name, status and selected state, and options and errors are announced', async ({ page }) => {
  await page.goto('/');
  const tile = page.getByRole('button', { name: /^Test match Playable Test game/ });
  await expect(tile).toHaveAttribute('aria-pressed', 'false');
  await tile.click();
  await expect(tile).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: /^Snakes & Ladders Coming soon/ })).toHaveAttribute('aria-disabled', 'true');
  await expect(page.getByRole('status').filter({ hasText: 'Play options for Test match are available.' })).toHaveCount(1);
  await page.getByRole('button', { name: 'Create private room', exact: true }).click();
  await page.getByRole('button', { name: 'Create room', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Use 1 to 24 letters, numbers, or spaces.');
  await expect(page.getByRole('alert')).toBeFocused();
});
