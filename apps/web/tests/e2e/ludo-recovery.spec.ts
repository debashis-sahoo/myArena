import type { Page } from '@playwright/test';
import { test, expect, roomContexts, createRoom, joinByCode } from './helpers';

const rollButton = (page: Page) => page.getByRole('button', { name: 'Roll the die' });
const TIMEOUT_NOTICE = 'You ran out of time, so the game played for you.';

async function startLudoMatch(host: Page, player: Page) {
  const code = await createRoom(host, 'Hosty', { game: 'Ludo', players: 2 });
  await joinByCode(player, code, 'Pat');
  // The shortest turn limit, so a timeout can be seen in a reasonable time.
  await host.getByRole('radio', { name: '30 seconds' }).click();
  await expect(player.getByText('Turn limit: 30 seconds')).toBeVisible();
  await player.getByRole('button', { name: 'I am ready' }).click();
  await host.getByRole('button', { name: 'Start match' }).click();
  for (const page of [host, player]) await expect(page.getByRole('region', { name: 'Ludo match' })).toBeVisible();
}

/** Plays whatever is allowed for a seat until told to stop: roll, then the first offered pawn. */
function playUntilStopped(page: Page) {
  const state = { on: true };
  const loop = (async () => {
    while (state.on) {
      try {
        if (await rollButton(page).isEnabled()) await rollButton(page).click({ timeout: 1000 });
        const chooser = page.getByRole('group', { name: 'Choose a pawn' });
        if (await chooser.count()) await chooser.getByRole('button').first().click({ timeout: 1000 });
      } catch { /* the turn moved on while clicking */ }
      await page.waitForTimeout(200);
    }
  })();
  return async () => { state.on = false; await loop; };
}

test.describe('Ludo recovery', () => {
  test('a player who loses the connection or refreshes in their turn comes back to the same game', async ({ browser }) => {
    test.setTimeout(90_000);
    const { host, player, close } = await roomContexts(browser);
    try {
      await startLudoMatch(host, player);
      const owner = (await rollButton(host).isEnabled()) ? host : player;
      const watcher = owner === host ? player : host;
      await expect(rollButton(owner)).toBeEnabled();
      const status = await owner.locator('.ludo-status').innerText();
      const pawns = await owner.locator('.ludo-pin').count();

      await owner.context().setOffline(true);
      await owner.waitForTimeout(1500);
      await owner.context().setOffline(false);
      await owner.reload();

      await expect(owner.getByRole('region', { name: 'Ludo match' })).toBeVisible();
      await expect(owner.locator('.ludo-status')).toHaveText(status);
      expect(await owner.locator('.ludo-pin').count()).toBe(pawns);
      await expect(owner.locator('.ludo-board')).toHaveAttribute('data-theme', 'classic');
      await expect(rollButton(owner)).toBeEnabled();
      await expect(rollButton(watcher)).toBeDisabled();

      // The rolled die is still the decided one after another refresh in the middle of the move.
      await rollButton(owner).click();
      await expect(owner.locator('.ludo-status')).toContainText('rolled a');
      const face = await owner.locator('.ludo-board').getAttribute('data-die-face');
      await owner.reload();
      await expect(owner.getByRole('region', { name: 'Ludo match' })).toBeVisible();
      await expect(owner.locator('.ludo-status')).toContainText(/rolled a|Choose a pawn|No pawn can move|Your turn|turn to roll/);
      if (face) await expect(owner.locator('.ludo-board')).toHaveAttribute('data-die-face', face);
    } finally { await close(); }
  });

  test('plays for a player whose turn times out, shows the notice, and lets them come back after being marked away', async ({ browser }) => {
    test.setTimeout(300_000);
    const { host, player, close } = await roomContexts(browser);
    let stop: (() => Promise<void>) | undefined;
    try {
      await startLudoMatch(host, player);
      stop = playUntilStopped(player);

      // Hosty never acts: the game rolls and moves for them, and says so.
      await expect(host.locator('.ludo-notice')).toHaveText(TIMEOUT_NOTICE, { timeout: 90_000 });
      await expect(player.getByText('Hosty ran out of time.').first()).toBeAttached({ timeout: 10_000 });

      // After three missed turns in a row the seat is marked away.
      await expect(host.getByRole('button', { name: "I'm back" })).toBeVisible({ timeout: 200_000 });
      await expect(player.getByText('Hosty is away and will be played for automatically.').first()).toBeAttached();
      await host.getByRole('button', { name: "I'm back" }).click();
      await expect(host.getByRole('button', { name: "I'm back" })).toHaveCount(0);
      await expect(player.getByText('Hosty is back.').first()).toBeAttached();
    } finally { await stop?.(); await close(); }
  });
});
