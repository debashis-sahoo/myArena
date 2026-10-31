import type { Page } from '@playwright/test';
import { test, expect, roomContexts, createRoom, joinByCode } from './helpers';

const rollButton = (page: Page) => page.getByRole('button', { name: 'Roll the die' });

// The seat to act is the one whose Roll button is enabled; it rolls, then picks a pawn or the turn passes by itself.
async function playTurn(pages: Page[]): Promise<void> {
  let actor: Page | undefined;
  for (let attempt = 0; attempt < 100 && !actor; attempt += 1) {
    for (const page of pages) if (await rollButton(page).isEnabled()) { actor = page; break; }
    if (!actor) await pages[0]!.waitForTimeout(100);
  }
  expect(actor, 'a seat should be able to roll').toBeDefined();
  await rollButton(actor!).click();
  const chooser = actor!.getByRole('group', { name: 'Choose a pawn' });
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (await chooser.count()) {
      await chooser.getByRole('button').first().click();
      await expect(chooser).toHaveCount(0);
      return;
    }
    // No legal move: the game resolves the roll itself, so a Roll button comes back on some seat.
    if (attempt > 30) for (const page of pages) if (await rollButton(page).isEnabled()) return;
    await actor!.waitForTimeout(100);
  }
  throw new Error('The turn did not move on.');
}

test.describe('the Ludo tile', () => {
  test('is playable with 2 to 4 players and offers both ways to play', async ({ page }) => {
    await page.goto('/');
    const tile = page.getByRole('button', { name: /^Ludo Playable/ });
    await expect(tile).toContainText('2 to 4 players');
    await expect(tile).toContainText('Solo vs AI & Online');
    await tile.click();
    const options = page.getByRole('region', { name: 'Ludo: choose how to play' });
    await expect(options.getByRole('button', { name: 'Play against AI', exact: true })).toBeVisible();
    await options.getByRole('button', { name: 'Create private room', exact: true }).click();
    for (const count of ['2', '3', '4']) await expect(options.getByRole('radio', { name: count, exact: true })).toBeAttached();
    await expect(options.getByRole('radio', { name: '4', exact: true })).toBeChecked();
    await expect(options.getByRole('radio', { name: '5', exact: true })).toHaveCount(0);
  });
});

test.describe('a Ludo match in a room', () => {
  test.setTimeout(120_000);

  test('plays turns on the flat board with the game deciding every roll', async ({ browser }) => {
    const { host, player, close } = await roomContexts(browser);
    try {
      const code = await createRoom(host, 'Hosty', { game: 'Ludo', players: 2 });
      await joinByCode(player, code, 'Pat');
      await expect(player.getByText('Theme: Classic')).toBeVisible();
      await expect(player.getByText('Maximum players: 2')).toBeVisible();
      await player.getByRole('button', { name: 'I am ready' }).click();
      await host.getByRole('button', { name: 'Start match' }).click();

      for (const page of [host, player]) {
        await expect(page.getByRole('region', { name: 'Ludo match' })).toBeVisible();
        await expect(page.locator('.ludo-board svg.ludo-board-svg')).toBeVisible();
        await expect(page.locator('.ludo-pin--red')).toHaveCount(4);
        await expect(page.locator('.ludo-pin--yellow')).toHaveCount(4);
        await expect(page.locator('.ludo-pin--green')).toHaveCount(0);
      }
      await expect(host.getByRole('status').filter({ hasText: /roll the die|turn to roll/ }).first()).toBeVisible();
      // Exactly one seat may roll at a time.
      const enabled = [await rollButton(host).isEnabled(), await rollButton(player).isEnabled()];
      expect(enabled.filter(Boolean)).toHaveLength(1);

      for (let turn = 0; turn < 4; turn += 1) await playTurn([host, player]);

      const pawnsOf = (page: Page) => page.locator('.ludo-pin').count();
      expect(await pawnsOf(host)).toBe(8);
      expect(await pawnsOf(player)).toBe(8);
      await expect(host.locator('.ludo-board')).toHaveAttribute('data-die-face', /^[1-6]?$/);
    } finally { await close(); }
  });

  test('shows a member who joins after the start a waiting message and no board', async ({ browser }) => {
    const { host, player, close } = await roomContexts(browser);
    const lateContext = await browser.newContext();
    const late = await lateContext.newPage();
    try {
      const code = await createRoom(host, 'Hosty', { game: 'Ludo', players: 3 });
      await joinByCode(player, code, 'Pat');
      await player.getByRole('button', { name: 'I am ready' }).click();
      await host.getByRole('button', { name: 'Start match' }).click();
      await expect(host.getByRole('region', { name: 'Ludo match' })).toBeVisible();

      await joinByCode(late, code, 'Lee');
      await expect(late.getByRole('heading', { name: 'A Ludo match is in progress' })).toBeVisible();
      await expect(late.getByText('You will be able to join the next one.')).toBeVisible();
      await expect(late.locator('svg.ludo-board-svg')).toHaveCount(0);
      await expect(late.getByRole('button', { name: 'Roll the die' })).toHaveCount(0);
      await expect(late.getByRole('log', { name: 'Chat messages' })).toBeVisible();
      await expect(host.locator('.ludo-pin')).toHaveCount(8);
    } finally { await lateContext.close(); await close(); }
  });
});
