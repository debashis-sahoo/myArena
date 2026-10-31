import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { Page } from '@playwright/test';
import { test, expect, AxeBuilder } from './helpers';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const SAVE_KEY = 'myarena-ludo-solo';
const SHOTS = join(process.cwd(), '../../specs/004-ludo-visual-redesign/screenshots');

const SIZES = [
  { name: 'laptop', width: 1280, height: 800 },
  { name: 'phone-portrait', width: 390, height: 844 },
  { name: 'phone-narrow', width: 320, height: 640 },
  { name: 'phone-landscape', width: 844, height: 390 },
] as const;

// Red has four pawns in base and a settled 6 (all four may move) or an open roll.
const saved = (phase: 'MOVE' | 'ROLL', theme = 'classic') => ({
  savedAt: 0, settings: { opponents: 1, difficulty: 'normal', theme },
  state: {
    seats: [
      { color: 'RED', kind: 'HUMAN', label: 'Pat', pawns: [-1, -1, -1, -1], away: false, missed: 0, left: false },
      { color: 'YELLOW', kind: 'COMPUTER', label: 'Computer 1', pawns: [-1, -1, -1, -1], away: false, missed: 0, left: false },
    ],
    current: 0, phase, dice: phase === 'MOVE' ? 6 : null, sixesInRow: phase === 'MOVE' ? 1 : 0, forfeit: false, winner: null,
    log: [{ n: 0, text: 'The match starts. Pat goes first.' }], logCount: 1,
  },
});

async function open(page: Page, phase: 'MOVE' | 'ROLL', theme = 'classic') {
  await page.goto('/');
  await page.evaluate(([key, value]) => localStorage.setItem(key!, JSON.stringify({ ...(value as object), savedAt: Date.now() })), [SAVE_KEY, saved(phase, theme)] as const);
  await page.goto('/play/ludo/solo');
  await expect(page.getByRole('region', { name: 'Ludo match' })).toBeVisible();
  await expect(page.locator('.ludo-pin').first()).toBeVisible();
}

const overflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const box = async (page: Page, selector: string) => {
  const found = await page.locator(selector).first().boundingBox();
  if (!found) throw new Error(`${selector} is not visible`);
  return found;
};

test.describe('Ludo visual redesign', () => {
  test.setTimeout(90_000);

  for (const size of SIZES) {
    test.describe(size.name, () => {
      test.use({ viewport: { width: size.width, height: size.height } });

      test('shows the whole board, the die, the turn card and the controls, without sideways scrolling', async ({ page }) => {
        await open(page, 'MOVE');
        const board = await box(page, '.ludo-board');
        expect(board.x).toBeGreaterThanOrEqual(-1);
        expect(board.x + board.width).toBeLessThanOrEqual(size.width + 1);
        expect(Math.abs(board.width - board.height)).toBeLessThan(2);
        await expect(page.locator('.ludo-die')).toBeVisible();
        await expect(page.locator('.ludo-turn')).toContainText('Your turn');
        await expect(page.getByRole('button', { name: 'Roll the die' })).toBeVisible();
        expect(await overflow(page)).toBeLessThanOrEqual(0);
        await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
        await page.waitForTimeout(200);
        expect(await overflow(page)).toBeLessThanOrEqual(0);
        await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
      });

      test('arranges the board, die, controls and extras for this screen', async ({ page }) => {
        await open(page, 'MOVE');
        const board = await box(page, '.ludo-board');
        const hud = await box(page, '.ludo-hud');
        const actions = await box(page, '.ludo-actions');
        if (size.name === 'laptop' || size.name === 'phone-landscape') {
          expect(hud.x).toBeGreaterThanOrEqual(board.x + board.width - 1);
          expect(actions.x).toBeGreaterThanOrEqual(board.x + board.width - 1);
          // The page header sits above the board, so a phone on its side may scroll a little; a laptop never does.
          if (size.name === 'laptop') expect(board.y + board.height).toBeLessThanOrEqual(size.height + 1);
          else expect(board.height).toBeGreaterThanOrEqual(size.height * 0.75);
        } else {
          expect(hud.y + hud.height).toBeLessThanOrEqual(board.y + 1);
          expect(actions.y).toBeGreaterThanOrEqual(board.y + board.height - 1);
        }
      });

      test('keeps every control and pawn tap area at least 44 by 44 pixels, and draws no pawn number', async ({ page }) => {
        await open(page, 'MOVE');
        for (const button of await page.locator('.ludo-controls button, .ludo-sheet-buttons button').all()) {
          const rect = await button.boundingBox();
          if (rect) { expect(rect.height).toBeGreaterThanOrEqual(43.5); expect(rect.width).toBeGreaterThanOrEqual(43.5); }
        }
        for (const hit of await page.locator('.ludo-hit').all()) {
          const rect = await hit.boundingBox();
          expect(rect!.width).toBeGreaterThanOrEqual(43.5);
          expect(rect!.height).toBeGreaterThanOrEqual(43.5);
        }
        await expect(page.locator('.ludo-pin text')).toHaveCount(0);
      });

      test('has no axe violations', async ({ page }) => {
        await open(page, 'MOVE');
        const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
        expect(violations.map((violation) => ({ id: violation.id, targets: violation.nodes.map((node) => node.target) }))).toEqual([]);
      });

      test('saves screenshots for review when SHOTS is set', async ({ page }) => {
        test.skip(!process.env.SHOTS, 'Only when asked for.');
        mkdirSync(SHOTS, { recursive: true });
        for (const theme of ['classic', 'halloween']) {
          await open(page, 'MOVE', theme);
          await page.screenshot({ path: join(SHOTS, `${size.name}-${theme}.png`), fullPage: true });
        }
      });
    });
  }

  test.describe('on a phone', () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test('a roll tumbles, settles within 3 seconds and states the number once', async ({ page }) => {
      await open(page, 'ROLL');
      const board = page.locator('.ludo-board');
      await page.getByRole('button', { name: 'Roll the die' }).click();
      await expect(board).toHaveAttribute('data-die-face', '');
      const started = Date.now();
      await expect(board).toHaveAttribute('data-die-face', /^[1-6]$/, { timeout: 3500 });
      expect(Date.now() - started).toBeLessThan(3000);
      await expect(page.locator('.ludo-status')).toContainText('rolled a');
      expect(await overflow(page)).toBeLessThanOrEqual(0);
    });

    test('pointing at a move button highlights the matching pin, and a move completes', async ({ page }) => {
      await open(page, 'MOVE');
      const buttons = page.getByRole('group', { name: 'Choose a pawn' }).getByRole('button');
      await expect(buttons).toHaveCount(4);
      await buttons.nth(2).hover();
      await expect(page.locator('.ludo-pin.is-highlighted')).toHaveCount(1);
      await expect(page.locator('.ludo-pin.is-highlighted')).toHaveAttribute('data-pawn', '0:2');
      await page.locator('h1, .ludo-turn').first().hover();
      await expect(page.locator('.ludo-pin.is-highlighted')).toHaveCount(0);
      await buttons.nth(0).click();
      await expect(page.getByRole('group', { name: 'Choose a pawn' })).toHaveCount(0);
      await expect(page.locator('.ludo-pin[data-pawn="0:0"]')).toBeVisible();
    });
  });

  test.describe('with reduced motion', () => {
    test.use({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });

    test('shows the result at once, with no skip button', async ({ page }) => {
      await open(page, 'ROLL');
      await page.getByRole('button', { name: 'Roll the die' }).click();
      await expect(page.locator('.ludo-board')).toHaveAttribute('data-die-face', /^[1-6]$/, { timeout: 1000 });
      await expect(page.getByRole('button', { name: 'Skip animation' })).toHaveCount(0);
    });
  });
});
