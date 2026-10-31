import type { Page } from '@playwright/test';
import { test, expect, createRoom, joinByCode } from './helpers';

const rollButton = (page: Page) => page.getByRole('button', { name: 'Roll the die' });
const board = (page: Page) => page.locator('.ludo-board');

async function startThreeSeats(browser: import('@playwright/test').Browser) {
  const contexts = await Promise.all([browser.newContext(), browser.newContext(), browser.newContext()]);
  const [host, alex, sam] = await Promise.all(contexts.map((context) => context.newPage())) as [Page, Page, Page];
  for (const page of [host, alex, sam]) await page.addInitScript(() => localStorage.setItem('myarena-ludo-quality', 'lite'));
  const code = await createRoom(host, 'Hosty', { game: 'Ludo', players: 3 });
  await joinByCode(alex, code, 'Alex');
  await joinByCode(sam, code, 'Sam');
  for (const page of [alex, sam]) await page.getByRole('button', { name: 'I am ready' }).click();
  await host.getByRole('button', { name: 'Start match' }).click();
  for (const page of [host, alex, sam]) await expect(page.getByRole('region', { name: 'Ludo match' })).toBeVisible();
  return { pages: [host, alex, sam] as const, close: () => Promise.all(contexts.map((context) => context.close())) };
}

async function actorOf(pages: readonly Page[]): Promise<Page> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    for (const page of pages) if (await rollButton(page).isEnabled()) return page;
    await pages[0]!.waitForTimeout(100);
  }
  throw new Error('Nobody can roll.');
}

/** Resolves with the time (ms since epoch, in the page) when the die face first becomes a number. */
const faceAppears = (page: Page) => page.evaluate(() => new Promise<{ at: number; face: string }>((resolve) => {
  const element = document.querySelector('.ludo-board')!;
  const check = () => {
    const face = element.getAttribute('data-die-face') ?? '';
    if (face !== '') { resolve({ at: Date.now(), face }); return true; }
    return false;
  };
  if (check()) return;
  new MutationObserver((_, observer) => { if (check()) observer.disconnect(); }).observe(element, { attributes: true, attributeFilter: ['data-die-face'] });
}));

test.describe('the die', () => {
  test.setTimeout(90_000);

  test('three viewers see the same roll settle on the same number at the same time, and cannot choose a pawn until then', async ({ browser }) => {
    const { pages, close } = await startThreeSeats(browser);
    try {
      const actor = await actorOf(pages);
      const watchers = pages.map((page) => faceAppears(page));
      await rollButton(actor).click();
      // While the die rolls: no face yet, a plain "rolling" sentence, and no pawn chooser.
      for (const page of pages) {
        await expect(board(page)).toHaveAttribute('data-die-face', '');
        await expect(page.locator('.ludo-status')).toContainText('rolling the die');
        await expect(page.getByRole('group', { name: 'Choose a pawn' })).toHaveCount(0);
      }
      const results = await Promise.all(watchers);
      const faces = new Set(results.map((result) => result.face));
      expect(faces.size).toBe(1);
      const spread = Math.max(...results.map((result) => result.at)) - Math.min(...results.map((result) => result.at));
      expect(spread).toBeLessThan(1000);
      const face = [...faces][0]!;
      for (const page of pages) await expect(page.locator('.ludo-status')).toContainText(`rolled a ${face}`);
    } finally { await close(); }
  });

  test('the die settles within 3 seconds', async ({ browser }) => {
    const { pages, close } = await startThreeSeats(browser);
    try {
      const actor = await actorOf(pages);
      const settled = faceAppears(actor);
      const started = Date.now();
      await rollButton(actor).click();
      const { at } = await settled;
      expect(at - started).toBeLessThan(3000);
    } finally { await close(); }
  });

  test('Skip animation changes only the viewer who pressed it', async ({ browser }) => {
    const { pages, close } = await startThreeSeats(browser);
    try {
      const actor = await actorOf(pages);
      const [skipper, other] = pages.filter((page) => page !== actor) as [Page, Page];
      await rollButton(actor).click();
      await expect(skipper.getByRole('button', { name: 'Skip animation' })).toBeVisible();
      await skipper.getByRole('button', { name: 'Skip animation' }).click();
      await expect(board(skipper)).toHaveAttribute('data-die-face', /^[1-6]$/);
      await expect(skipper.getByRole('button', { name: 'Skip animation' })).toHaveCount(0);
      // The others are still watching the roll.
      await expect(board(other)).toHaveAttribute('data-die-face', '');
      await expect(board(actor)).toHaveAttribute('data-die-face', '');
      await expect(board(other)).toHaveAttribute('data-die-face', /^[1-6]$/, { timeout: 4000 });
      expect(await board(other).getAttribute('data-die-face')).toBe(await board(skipper).getAttribute('data-die-face'));
    } finally { await close(); }
  });
});
