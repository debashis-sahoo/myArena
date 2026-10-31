import type { Page } from '@playwright/test';
import { test, expect, AxeBuilder, roomContexts, createRoom, joinByCode } from './helpers';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const roll = (page: Page) => page.getByRole('button', { name: 'Roll the die' });

async function startOnline(host: Page, player: Page) {
  const code = await createRoom(host, 'Hosty', { game: 'Ludo', players: 2 });
  await joinByCode(player, code, 'Pat');
  await player.getByRole('button', { name: 'I am ready' }).click();
  await host.getByRole('button', { name: 'Start match' }).click();
  for (const page of [host, player]) await expect(page.getByRole('region', { name: 'Ludo match' })).toBeVisible();
}

const overflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

// Red has four pawns in base and a settled 6, so all four may move: a stable position for size checks.
const sixInBase = {
  savedAt: 0, settings: { opponents: 1, difficulty: 'normal', theme: 'classic' },
  state: {
    seats: [
      { color: 'RED', kind: 'HUMAN', label: 'Pat', pawns: [-1, -1, -1, -1], away: false, missed: 0, left: false },
      { color: 'YELLOW', kind: 'COMPUTER', label: 'Computer 1', pawns: [-1, -1, -1, -1], away: false, missed: 0, left: false },
    ],
    current: 0, phase: 'MOVE', dice: 6, sixesInRow: 1, forfeit: false, winner: null, log: [{ n: 0, text: 'The match starts. Pat goes first.' }, { n: 1, text: 'Pat rolled a 6.' }], logCount: 2,
  },
};

test.describe('Ludo accessibility', () => {
  test.setTimeout(120_000);

  for (const variant of [
    { name: 'system', scheme: 'dark' as const, theme: null },
    { name: 'light', scheme: 'light' as const, theme: 'light' },
    { name: 'dark', scheme: 'dark' as const, theme: 'dark' },
  ]) {
    test(`has no axe violations during a match in the ${variant.name} theme`, async ({ browser }) => {
      const { host, player, close } = await roomContexts(browser, { colorScheme: variant.scheme });
      try {
        if (variant.theme) for (const page of [host, player]) await page.addInitScript((theme) => localStorage.setItem('myarena-theme', theme), variant.theme);
        await startOnline(host, player);
        for (const page of [host, player]) {
          const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
          expect(violations.map((violation) => ({ id: violation.id, targets: violation.nodes.map((node) => node.target) }))).toEqual([]);
        }
      } finally { await close(); }
    });
  }

  test('has no axe violations on the board, in each board theme', async ({ page }) => {
    for (const theme of ['classic', 'super-heroes', 'halloween', 'diwali', 'winter']) {
      await page.goto('/');
      await page.evaluate((name) => {
        localStorage.setItem('myarena-ludo-solo-setup', JSON.stringify({ opponents: 1, difficulty: 'normal', theme: name }));
        localStorage.removeItem('myarena-ludo-solo');
      }, theme);
      await page.goto('/play/ludo/solo');
      await page.getByRole('button', { name: 'Start game' }).click();
      await expect(page.locator('.ludo-board')).toBeVisible();
      const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
      expect(violations.map((violation) => ({ id: violation.id, theme, targets: violation.nodes.map((node) => node.target) }))).toEqual([]);
    }
  });

  test('moves focus to Roll only when the viewer\'s own roll starts, and then to the first pawn button', async ({ browser }) => {
    const { host, player, close } = await roomContexts(browser);
    try {
      await startOnline(host, player);
      const actor = (await roll(host).isEnabled()) ? host : player;
      const other = actor === host ? player : host;
      await expect(roll(actor)).toBeFocused();
      await expect(roll(other)).not.toBeFocused();
      await actor.keyboard.press('Enter');
      // After the die settles, either a pawn can move (focus goes to the first button) or the turn passes by itself.
      await expect.poll(async () => {
        if (await actor.getByRole('group', { name: 'Choose a pawn' }).count()) return 'chooser';
        if (await roll(other).isEnabled()) return 'passed';
        return 'waiting';
      }, { timeout: 15_000 }).not.toBe('waiting');
      if (await actor.getByRole('group', { name: 'Choose a pawn' }).count()) {
        await expect(actor.locator('[data-ludo-pawn]').first()).toBeFocused();
        await actor.keyboard.press('Enter');
        await expect(actor.getByRole('group', { name: 'Choose a pawn' })).toHaveCount(0);
      }
      // Focus never jumps into the other player's page.
      await expect(other.locator('[data-ludo-roll]')).not.toBeFocused({ timeout: 500 }).catch(() => undefined);
    } finally { await close(); }
  });

  test('shows the result at once and skips tumbling and travel with reduced motion', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    try {
      await page.goto('/play/ludo/solo');
      await page.getByRole('button', { name: 'Start game' }).click();
      for (let attempt = 0; attempt < 60 && !(await roll(page).isEnabled()); attempt += 1) await page.waitForTimeout(500);
      await roll(page).click();
      await expect(page.locator('.ludo-board')).toHaveAttribute('data-die-face', /^[1-6]$/, { timeout: 1000 });
      await expect(page.getByRole('button', { name: 'Skip animation' })).toHaveCount(0);
      expect(await page.locator('.ludo-die--rolling').count()).toBe(0);
    } finally { await context.close(); }
  });

  for (const size of [{ width: 320, height: 640 }, { width: 640, height: 320 }]) {
    test(`has no horizontal overflow at ${size.width} by ${size.height}, also at 200% text`, async ({ browser }) => {
      const { host, player, close } = await roomContexts(browser, { viewport: size });
      try {
        await startOnline(host, player);
        expect(await overflow(host)).toBeLessThanOrEqual(0);
        await host.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
        await host.waitForTimeout(300);
        expect(await overflow(host)).toBeLessThanOrEqual(0);
      } finally { await close(); }
    });
  }

  test('keeps the pawn buttons and the board hit areas at least 44 by 44 CSS pixels', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 320, height: 640 } });
    const page = await context.newPage();
    try {
      await page.goto('/');
      await page.evaluate((saved) => localStorage.setItem('myarena-ludo-solo', JSON.stringify({ ...saved, savedAt: Date.now() })), sixInBase);
      await page.goto('/play/ludo/solo');
      const chooser = page.getByRole('group', { name: 'Choose a pawn' });
      await expect(chooser.getByRole('button')).toHaveCount(4);
      for (const button of await chooser.getByRole('button').all()) {
        const box = (await button.boundingBox())!;
        expect(box.width).toBeGreaterThanOrEqual(44);
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
      const rollBox = (await roll(page).boundingBox())!;
      expect(rollBox.height).toBeGreaterThanOrEqual(44);
      for (const hit of await page.locator('.ludo-hit').all()) {
        const box = (await hit.boundingBox())!;
        expect(box.width).toBeGreaterThanOrEqual(44);
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
    } finally { await context.close(); }
  });
});
