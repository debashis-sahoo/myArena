import { test, expect, roomContexts, createRoom, joinByCode } from './helpers';
import type { Page } from '@playwright/test';

async function startMatch(host: Page, player: Page) {
  const code = await createRoom(host, 'Hosty', { game: 'Ludo', players: 2 });
  await joinByCode(player, code, 'Pat');
  await player.getByRole('button', { name: 'I am ready' }).click();
  await host.getByRole('button', { name: 'Start match' }).click();
  for (const page of [host, player]) await expect(page.getByRole('region', { name: 'Ludo match' })).toBeVisible();
}

test.describe('Ludo chat', () => {
  test.setTimeout(90_000);

  test('on a wide screen shows the chat beside the board with the game log above it', async ({ browser }) => {
    const { host, player, close } = await roomContexts(browser, { viewport: { width: 1280, height: 900 } });
    try {
      await startMatch(host, player);
      const board = await host.locator('.ludo-board').boundingBox();
      const side = await host.locator('.ludo-side').boundingBox();
      expect(side!.x).toBeGreaterThanOrEqual(board!.x + board!.width - 1);
      const log = await host.getByRole('heading', { name: 'Game log' }).boundingBox();
      const chat = await host.getByRole('heading', { name: 'Chat', exact: true }).boundingBox();
      expect(log!.y).toBeLessThan(chat!.y);

      await player.getByLabel('Message', { exact: true }).fill('good luck');
      await player.getByRole('button', { name: 'Send' }).click();
      await expect(host.getByRole('log', { name: 'Chat messages' })).toContainText('Pat: good luck');
      await expect(host.getByRole('button', { name: /^Game log/ })).toHaveCount(0);
    } finally { await close(); }
  });

  test('on a phone shows Game log and Chat buttons with unread counts and keeps the board in view', async ({ browser }) => {
    const { host, player, close } = await roomContexts(browser, { viewport: { width: 390, height: 800 }, hasTouch: true });
    try {
      await startMatch(host, player);
      await expect(host.getByRole('button', { name: 'Game log', exact: true })).toBeVisible();
      await expect(host.getByRole('button', { name: 'Chat', exact: true })).toBeVisible();

      // Pat's message arrives while the host's chat is closed.
      await player.getByRole('button', { name: 'Chat', exact: true }).click();
      await player.getByLabel('Message', { exact: true }).fill('hello host');
      await player.getByRole('button', { name: 'Send' }).click();
      await expect(host.getByRole('button', { name: 'Chat 1 unread' })).toBeVisible();

      await host.getByRole('button', { name: 'Chat 1 unread' }).click();
      const sheet = host.getByRole('region', { name: 'Chat sheet' });
      await expect(sheet).toContainText('Pat: hello host');
      await expect(host.getByRole('button', { name: 'Chat', exact: true })).toBeVisible();
      const height = (await sheet.boundingBox())!.height;
      expect(height).toBeLessThanOrEqual(800 * 0.5 + 2);
      await expect(host.locator('.ludo-board')).toBeVisible();
      const board = (await host.locator('.ludo-board').boundingBox())!;
      const top = (await sheet.boundingBox())!.y;
      expect(board.y).toBeLessThan(top);

      await host.getByRole('button', { name: 'Close chat' }).click();
      await expect(sheet).toHaveCount(0);
      expect(await host.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
    } finally { await close(); }
  });
});
