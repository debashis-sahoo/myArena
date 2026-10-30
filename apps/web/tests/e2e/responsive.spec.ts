import type { Page } from '@playwright/test';
import { test, expect, roomContexts, createRoom, joinByCode, openCreatePanel } from './helpers';

const noHorizontalOverflow = (page: Page) => page.evaluate(() => {
  const width = document.documentElement.clientWidth;
  const offenders = Array.from(document.querySelectorAll<HTMLElement>('body *'))
    .filter((element) => {
      const box = element.getBoundingClientRect();
      return box.width > 0 && (box.right > width + 1 || box.left < -1) && !element.closest('.sr-only, .skip-link');
    })
    .map((element) => `${element.tagName.toLowerCase()}.${element.className}`);
  return { pageOverflows: document.documentElement.scrollWidth > width, offenders: offenders.slice(0, 5) };
});

// These viewport checks are development aids only; they never count as phone certification (FR-021).
const viewports = [
  { name: 'narrowest phone, portrait', width: 320, height: 568 },
  { name: 'phone, portrait', width: 390, height: 844 },
  { name: 'phone, landscape', width: 844, height: 390 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'laptop', width: 1366, height: 768 },
];

for (const viewport of viewports) {
  for (const textScale of [100, 200]) {
    test(`development-only emulation: no horizontal overflow on a ${viewport.name} at ${textScale}% text`, async ({ browser }) => {
      const { host, player, close } = await roomContexts(browser, { viewport: { width: viewport.width, height: viewport.height } });
      try {
        for (const page of [host, player]) await page.addInitScript((scale) => { document.addEventListener('DOMContentLoaded', () => { document.documentElement.style.fontSize = `${scale}%`; }); }, textScale);
        await host.goto('/');
        expect(await noHorizontalOverflow(host), 'entry').toEqual({ pageOverflows: false, offenders: [] });

        const code = await createRoom(host, 'A very long display name');
        await joinByCode(player, code, 'Pat with a long name now');
        await expect(host.getByRole('list', { name: 'Members' }).getByRole('listitem')).toHaveCount(2);
        await host.getByLabel('Choose a game').selectOption({ label: 'Test match' });
        await player.getByLabel('Message', { exact: true }).fill('A message with a veryveryveryverylongwordthatmustwrapinsteadofoverflowing');
        await player.getByRole('button', { name: 'Send' }).click();
        await expect(host.getByRole('log', { name: 'Chat messages' })).toContainText('veryvery');
        expect(await noHorizontalOverflow(host), 'lobby as host').toEqual({ pageOverflows: false, offenders: [] });
        expect(await noHorizontalOverflow(player), 'lobby as player').toEqual({ pageOverflows: false, offenders: [] });

        await host.getByRole('button', { name: 'Hand off host role' }).click();
        expect(await noHorizontalOverflow(host), 'dialog').toEqual({ pageOverflows: false, offenders: [] });
        await host.getByRole('button', { name: 'Cancel' }).click();
        await expect(host.getByRole('button', { name: 'Start match' })).toBeVisible();
      } finally { await close(); }
    });
  }
}

for (const viewport of viewports) {
  test(`development-only emulation: landing tiles reflow and the selected game stays reachable on a ${viewport.name}`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
    const page = await context.newPage();
    try {
      await page.goto('/');
      const lefts = await page.locator('.tile-grid').first().locator('.tile').evaluateAll((tiles) => new Set(tiles.map((tile) => Math.round(tile.getBoundingClientRect().left))).size);
      const comingSoonLefts = await page.locator('.tile-grid').last().locator('.tile').evaluateAll((tiles) => new Set(tiles.map((tile) => Math.round(tile.getBoundingClientRect().left))).size);
      if (viewport.width <= 390) { expect(lefts).toBe(1); expect(comingSoonLefts).toBe(1); }
      if (viewport.width >= 768) expect(comingSoonLefts).toBeGreaterThan(1);
      expect(await noHorizontalOverflow(page), 'landing').toEqual({ pageOverflows: false, offenders: [] });

      const tile = page.getByRole('button', { name: /^Test match Playable/ });
      await tile.click();
      const options = page.getByRole('region', { name: 'Test match: choose how to play' });
      await expect(options.getByRole('heading', { name: 'Test match: choose how to play' })).toBeInViewport();
      await expect(tile).toHaveAttribute('aria-pressed', 'true');
      await options.getByRole('button', { name: 'Create private room', exact: true }).click();
      await options.getByRole('button', { name: 'Create room', exact: true }).scrollIntoViewIfNeeded();
      expect(await noHorizontalOverflow(page), 'landing with the create controls').toEqual({ pageOverflows: false, offenders: [] });
    } finally { await context.close(); }
  });
}

test('landing touch targets are at least 44 by 44 CSS pixels with the create controls open', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const page = await context.newPage();
  try {
    await openCreatePanel(page, 'Test room game');
    const small = await page.evaluate(() => Array.from(document.querySelectorAll<HTMLElement>('button, input, select, textarea, a[href]'))
      .filter((element) => element.offsetParent !== null && !element.classList.contains('skip-link') && getComputedStyle(element).display !== 'inline')
      .map((element) => ({ name: `${element.tagName.toLowerCase()} ${element.textContent?.slice(0, 20) ?? element.getAttribute('name') ?? ''}`, box: element.getBoundingClientRect() }))
      .filter(({ box }) => box.width < 43.5 || box.height < 43.5)
      .map(({ name, box }) => `${name} ${Math.round(box.width)}x${Math.round(box.height)}`));
    expect(small).toEqual([]);
  } finally { await context.close(); }
});

test('reduced motion removes every transition and animation', async ({ browser }) => {
  const { host, player, close } = await roomContexts(browser, { reducedMotion: 'reduce' });
  try {
    const code = await createRoom(host);
    await joinByCode(player, code);
    for (const page of [host, player]) {
      const moving = await page.evaluate(() => Array.from(document.querySelectorAll<HTMLElement>('*')).filter((element) => {
        const style = getComputedStyle(element);
        const transitions = style.transitionDuration.split(',').some((duration) => parseFloat(duration) > 0);
        return transitions || style.animationName !== 'none' || style.scrollBehavior === 'smooth';
      }).map((element) => element.tagName.toLowerCase()));
      expect(moving).toEqual([]);
    }
  } finally { await close(); }
});

test('motion is only ever used when the user has not asked to reduce it', async ({ browser }) => {
  const { host, close } = await roomContexts(browser, { reducedMotion: 'no-preference' });
  try {
    await host.goto('/');
    const transitions = await host.evaluate(() => getComputedStyle(document.querySelector('button')!).transitionDuration);
    expect(parseFloat(transitions)).toBeGreaterThan(0);
    expect(parseFloat(transitions)).toBeLessThanOrEqual(0.25);
  } finally { await close(); }
});

test('touch targets are at least 44 by 44 CSS pixels', async ({ browser }) => {
  const { host, player, close } = await roomContexts(browser, { viewport: { width: 390, height: 844 }, hasTouch: true });
  try {
    await host.goto('/');
    const code = await createRoom(host);
    await joinByCode(player, code);
    await expect(host.getByRole('list', { name: 'Members' }).getByRole('listitem')).toHaveCount(2);
    for (const page of [host, player]) {
      const small = await page.evaluate(() => Array.from(document.querySelectorAll<HTMLElement>('button, input, select, textarea, a[href]'))
        .filter((element) => element.offsetParent !== null && !element.classList.contains('skip-link') && getComputedStyle(element).display !== 'inline')
        .map((element) => ({ name: `${element.tagName.toLowerCase()} ${element.textContent?.slice(0, 20) ?? ''}`, box: element.getBoundingClientRect() }))
        .filter(({ box }) => box.width < 43.5 || box.height < 43.5)
        .map(({ name, box }) => `${name} ${Math.round(box.width)}x${Math.round(box.height)}`));
      expect(small).toEqual([]);
    }
  } finally { await close(); }
});
