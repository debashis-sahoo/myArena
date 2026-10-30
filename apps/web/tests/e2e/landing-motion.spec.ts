import type { Page } from '@playwright/test';
import { test, expect, openCreatePanel } from './helpers';

const moving = (page: Page) => page.evaluate(() => Array.from(document.querySelectorAll<HTMLElement>('*')).filter((element) => {
  const style = getComputedStyle(element);
  const transitions = style.transitionDuration.split(',').some((duration) => parseFloat(duration) > 0);
  return transitions || style.animationName !== 'none' || style.scrollBehavior === 'smooth';
}).map((element) => `${element.tagName.toLowerCase()}.${element.className}`));

test('with reduced motion the landing page has no motion and effects default off', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  try {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-effects', 'off');
    await expect(page.getByRole('button', { name: /^Effects/ })).toHaveAttribute('aria-pressed', 'false');
    expect(await moving(page)).toEqual([]);
    await openCreatePanel(page);
    expect(await moving(page)).toEqual([]);
    await expect(page.getByRole('heading', { name: 'Test match: choose how to play' })).toBeVisible();
  } finally { await context.close(); }
});

test('turning effects on under reduced motion still adds no animation', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  try {
    await page.goto('/');
    await page.getByRole('button', { name: /^Effects/ }).click();
    await expect(page.locator('html')).toHaveAttribute('data-effects', 'on');
    await page.getByRole('button', { name: /^Test match Playable/ }).hover();
    expect(await moving(page)).toEqual([]);
  } finally { await context.close(); }
});

test('without a reduced-motion request, effects are on and only use short, optional motion', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'no-preference' });
  const page = await context.newPage();
  try {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-effects', 'on');
    await page.getByRole('button', { name: /^Effects/ }).click();
    await expect(page.locator('html')).toHaveAttribute('data-effects', 'off');
    const animated = await page.evaluate(() => Array.from(document.querySelectorAll<HTMLElement>('.art')).some((element) => getComputedStyle(element).animationName !== 'none'));
    expect(animated).toBe(false);
  } finally { await context.close(); }
});
