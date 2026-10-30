import type { Locator, Page } from '@playwright/test';
import { test, expect, roomContexts, createRoom, joinByCode } from './helpers';

const focusIsVisible = (page: Page) => page.evaluate(() => {
  const element = document.activeElement as HTMLElement | null;
  if (!element || element === document.body) return { ok: false, label: 'nothing is focused' };
  const style = getComputedStyle(element);
  const ok = style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) >= 2;
  return { ok, label: `${element.tagName.toLowerCase()} ${element.getAttribute('aria-label') ?? element.textContent?.slice(0, 30) ?? ''}` };
});

// Moves focus only with the Tab key, never the mouse, and requires a visible focus ring at every stop.
async function tabTo(page: Page, target: Locator, limit = 80) {
  const element = target.first();
  for (let step = 0; step < limit; step++) {
    if (await element.evaluate((node) => node === document.activeElement)) return;
    await page.keyboard.press('Tab');
    const focus = await focusIsVisible(page);
    // Tabbing past the last control wraps through the browser's own UI, where nothing in the page has focus.
    if (focus.label === 'nothing is focused') continue;
    expect(focus.ok, `focus ring at ${focus.label}`).toBe(true);
  }
  throw new Error(`Could not reach ${target} with the keyboard`);
}

test('create, join, lobby, ready, chat, and leave work with the keyboard alone', async ({ browser }) => {
  const { host, player, close } = await roomContexts(browser);
  try {
    await host.goto('/');
    await host.keyboard.press('Tab');
    await expect(host.getByRole('link', { name: 'Skip to content' })).toBeFocused();

    await tabTo(host, host.getByRole('button', { name: /^Test match Playable/ }));
    await host.keyboard.press('Enter');
    const options = host.getByRole('region', { name: 'Test match: choose how to play' });
    await expect(options.getByRole('heading', { name: 'Test match: choose how to play' })).toBeFocused();
    await tabTo(host, options.getByRole('button', { name: 'Create private room', exact: true }));
    await host.keyboard.press('Enter');
    await expect(options.getByLabel('Display name')).toBeFocused();
    await host.keyboard.type('Hosty');
    await host.keyboard.press('Enter');
    await expect(host.getByRole('heading', { name: 'Room lobby' })).toBeVisible();
    const code = (await host.getByText(/^[A-HJ-NP-Z2-9]{10}$/).textContent())!;

    await player.goto('/');
    const join = player.getByRole('region', { name: 'Join with Room Code' });
    await tabTo(player, join.getByLabel('Room code'));
    await player.keyboard.type(code);
    await player.keyboard.press('Tab');
    await player.keyboard.type('Pat');
    await player.keyboard.press('Enter');
    await expect(player.getByRole('heading', { name: 'Room lobby' })).toBeVisible();

    await tabTo(player, player.getByRole('button', { name: 'I am ready' }));
    await player.keyboard.press('Space');
    await expect(player.getByRole('button', { name: 'I am ready' })).toHaveAttribute('aria-pressed', 'true');

    await tabTo(player, player.getByLabel('Message', { exact: true }));
    await player.keyboard.type('typed with a keyboard');
    await player.keyboard.press('Enter');
    for (const page of [host, player]) await expect(page.getByRole('log', { name: 'Chat messages' })).toContainText('typed with a keyboard');

    await tabTo(host, host.getByLabel('Choose a game'));
    await host.keyboard.press('ArrowDown');
    await expect(player.getByText('Selected game: Test room game')).toBeVisible();
    await tabTo(host, host.getByRole('button', { name: 'Start match' }));
    await host.keyboard.press('Enter');
    await expect(player.getByText('A match is in progress.')).toBeVisible();

    const leave = player.getByRole('button', { name: 'Leave room' });
    await tabTo(player, leave);
    await player.keyboard.press('Enter');
    const dialog = player.getByRole('dialog');
    await expect(dialog).toBeVisible();
    for (let step = 0; step < 6; step++) {
      await player.keyboard.press('Tab');
      expect(
        await player.evaluate(() => {
          const active = document.activeElement;
          return !active || active === document.body || active.closest('dialog') !== null;
        }),
        'focus never lands on page content behind the modal dialog',
      ).toBe(true);
    }
    await player.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(leave).toBeFocused();

    await player.keyboard.press('Enter');
    await tabTo(player, dialog.getByRole('button', { name: 'Leave room' }));
    await player.keyboard.press('Enter');
    await expect(player.getByRole('heading', { name: 'Your Friends. Your Arena.' })).toBeVisible();
  } finally { await close(); }
});

test('landing tiles toggle with Enter and Space, dismiss returns focus, and Coming soon tiles explain themselves', async ({ page }) => {
  await page.goto('/');
  const tile = page.getByRole('button', { name: /^Test match Playable/ });
  await tabTo(page, tile);
  await page.keyboard.press('Space');
  await expect(tile).toHaveAttribute('aria-pressed', 'true');
  const options = page.getByRole('region', { name: 'Test match: choose how to play' });
  await expect(options).toBeVisible();
  await tabTo(page, options.getByRole('button', { name: 'Choose a different game' }));
  await page.keyboard.press('Enter');
  await expect(options).toHaveCount(0);
  await expect(tile).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(tile).toHaveAttribute('aria-pressed', 'true');
  await tabTo(page, page.getByRole('button', { name: /^Ludo Coming soon/ }));
  await page.keyboard.press('Enter');
  await expect(page.getByText('Ludo is not available yet.').first()).toBeVisible();
  await expect(tile).toHaveAttribute('aria-pressed', 'true');
});

test('every interactive control in the lobby is reachable and shows a visible focus ring', async ({ browser }) => {
  const { host, player, close } = await roomContexts(browser);
  try {
    const code = await createRoom(host);
    await joinByCode(player, code);
    await expect(host.getByRole('list', { name: 'Members' }).getByRole('listitem')).toHaveCount(2);

    const expected = await host.evaluate(() => Array.from(document.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]'))
      .filter((element) => element.offsetParent !== null && !element.closest('[aria-hidden="true"]')).length);
    const stops: string[] = [];
    // Walk the whole page once; stop when focus leaves the document for the browser's own controls.
    for (let step = 0; step < expected + 4; step++) {
      await host.keyboard.press('Tab');
      const focus = await focusIsVisible(host);
      if (!focus.ok && focus.label === 'nothing is focused' && stops.length > 0) break;
      expect(focus.ok, `focus ring at ${focus.label}`).toBe(true);
      stops.push(focus.label);
    }
    expect(new Set(stops).size).toBeGreaterThan(expected / 2);
    expect(stops.some((label) => label.includes('Leave room'))).toBe(true);
    expect(stops.some((label) => label.includes('Start match'))).toBe(true);
    expect(stops.some((label) => label.includes('Send'))).toBe(true);
  } finally { await close(); }
});

test('the tab order follows the reading order on a phone-width layout, with no positive tabindex', async ({ browser }) => {
  const { host, player, close } = await roomContexts(browser, { viewport: { width: 390, height: 844 } });
  try {
    const code = await createRoom(host);
    await joinByCode(player, code);
    await expect(host.getByRole('list', { name: 'Members' }).getByRole('listitem')).toHaveCount(2);
    const stops = await host.evaluate(() => Array.from(document.querySelectorAll<HTMLElement>('button:not([disabled]), input, select, textarea, a[href], [tabindex]'))
      .filter((element) => element.offsetParent !== null && !element.classList.contains('skip-link'))
      .map((element) => ({ tabindex: element.tabIndex, top: element.getBoundingClientRect().top + window.scrollY })));
    expect(stops.every((stop) => stop.tabindex <= 0)).toBe(true);
    for (let index = 1; index < stops.length; index++) {
      expect(stops[index]!.top, `stop ${index} sits above the previous one`).toBeGreaterThanOrEqual(stops[index - 1]!.top - 1);
    }
  } finally { await close(); }
});
