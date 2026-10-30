import { test, expect, roomContexts, createRoom, joinByCode, openCreatePanel } from './helpers';

const bothTile = (page: import('@playwright/test').Page) => page.getByRole('button', { name: /^Test match Playable/ });
const onlineTile = (page: import('@playwright/test').Page) => page.getByRole('button', { name: /^Test room game Playable/ });

test.describe('browsing the games', () => {
  test('shows the product, both groups, tile details and no play controls before a selection', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: 'Your Friends. Your Arena.' })).toBeVisible();
    await expect(page.getByText('No account needed')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Playable Games' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Future Arena Catalog' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Join with Room Code' })).toBeVisible();

    const tile = bothTile(page);
    await expect(tile).toHaveAttribute('aria-pressed', 'false');
    await expect(tile).toContainText('2 to 100 players');
    await expect(tile).toContainText('Solo vs AI & Online');
    await expect(tile).toContainText('Test game');
    await expect(onlineTile(page)).toContainText('2 to 6 players');

    await expect(page.getByRole('button', { name: 'Create private room', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Play against AI', exact: true })).toHaveCount(0);
    await expect(page.getByRole('radiogroup')).toHaveCount(0);
    await expect(page.getByLabel('Number of players')).toHaveCount(0);
  });

  test('explains a coming-soon tile with mouse and keyboard and starts nothing', async ({ page }) => {
    await page.goto('/');
    const ludo = page.getByRole('button', { name: 'Ludo Coming soon' });
    await expect(ludo).toHaveAttribute('aria-disabled', 'true');
    // Playwright treats aria-disabled as not enabled, so force the click a real user could make.
    await ludo.click({ force: true });
    await expect(page.getByText('Ludo is not available yet.').first()).toBeVisible();
    await page.getByRole('button', { name: 'Tambola Coming soon' }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByText('Tambola is not available yet.').first()).toBeVisible();
    await expect(page.getByRole('region', { name: /choose how to play/ })).toHaveCount(0);
    await expect(page).toHaveURL(/\/$/);
  });
});

test.describe('choosing how to play', () => {
  test('offers options only after a selection and only what the game supports', async ({ page }) => {
    await page.goto('/');
    await bothTile(page).click();
    const options = page.getByRole('region', { name: 'Test match: choose how to play' });
    await expect(options).toBeVisible();
    await expect(page).toHaveURL(/\?game=test-stub$/);
    await expect(bothTile(page)).toHaveAttribute('aria-pressed', 'true');
    await expect(options.getByRole('button', { name: 'Play against AI' })).toBeVisible();
    await expect(options.getByRole('button', { name: 'Create private room', exact: true })).toBeVisible();

    await onlineTile(page).click();
    const online = page.getByRole('region', { name: 'Test room game: choose how to play' });
    await expect(online).toBeVisible();
    await expect(page.getByRole('region', { name: 'Test match: choose how to play' })).toHaveCount(0);
    await expect(online.getByRole('button', { name: 'Play against AI' })).toHaveCount(0);
    await expect(online.getByText('Playing against the AI is not available for this game.')).toBeVisible();
    await expect(bothTile(page)).toHaveAttribute('aria-pressed', 'false');
  });

  test('dismissing returns to the clean state and gives the tile focus back', async ({ page }) => {
    await page.goto('/');
    await bothTile(page).click();
    await page.getByRole('button', { name: 'Choose a different game' }).click();
    await expect(page.getByRole('region', { name: /choose how to play/ })).toHaveCount(0);
    await expect(page).toHaveURL(/\/$/);
    await expect(bothTile(page)).toBeFocused();
  });

  test('hero shortcuts guide to a game first, then jump to the option', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Create Private Room', exact: true }).click();
    await expect(page.getByText('Choose a game first.').first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Playable Games' })).toBeFocused();
    await expect(page.getByLabel('Display name')).toHaveCount(1);
    await bothTile(page).click();
    await page.getByRole('button', { name: 'Create Private Room', exact: true }).click();
    await expect(page.getByRole('region', { name: 'Test match: choose how to play' }).getByLabel('Display name')).toBeFocused();
  });

  test('launches solo play without a room and returns to the same selection', async ({ page }) => {
    await page.goto('/');
    await bothTile(page).click();
    await page.getByRole('button', { name: 'Play against AI' }).click();
    await expect(page.getByRole('heading', { name: 'Test match: solo vs AI' })).toBeVisible();
    await expect(page).toHaveURL(/\/play\/test-stub\/solo$/);
    await page.getByRole('button', { name: 'Exit to games' }).click();
    await expect(page).toHaveURL(/\?game=test-stub$/);
    await expect(page.getByRole('region', { name: 'Test match: choose how to play' })).toBeVisible();
  });
});

test.describe('creating a private room', () => {
  test('offers only the allowed counts with the default preselected', async ({ page }) => {
    const options = await openCreatePanel(page, 'Test room game');
    const radios = options.getByRole('radio');
    await expect(radios).toHaveCount(5);
    await expect(options.getByRole('radio', { name: '4', exact: true })).toBeChecked();
    await expect(options.getByText(/2 to 6 players\./)).toBeVisible();
    await expect(options.getByRole('radio', { name: '7', exact: true })).toHaveCount(0);
  });

  test('uses a stepper for large ranges, explains the room limit and rejects a bad count', async ({ page }) => {
    const options = await openCreatePanel(page);
    const count = options.getByLabel('Number of players');
    await expect(count).toHaveValue('100');
    await expect(options.getByText(/Rooms hold at most 100 players\./)).toBeVisible();
    await options.getByLabel('Display name').fill('Hosty');
    await count.fill('1');
    await options.getByRole('button', { name: 'Create room', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('Choose a number of players from 2 to 100.');
    await expect(page.getByRole('heading', { name: 'Room lobby' })).toHaveCount(0);
    await expect(options.getByLabel('Display name')).toHaveValue('Hosty');
  });

  test('keeps the name but resets the choices when another tile is selected', async ({ page }) => {
    const options = await openCreatePanel(page);
    await options.getByLabel('Display name').fill('Zed');
    await onlineTile(page).click();
    const next = page.getByRole('region', { name: 'Test room game: choose how to play' });
    await expect(next.getByLabel('Display name')).toHaveCount(0);
    await next.getByRole('button', { name: 'Create private room', exact: true }).click();
    await expect(next.getByLabel('Display name')).toHaveValue('Zed');
    await expect(next.getByRole('radio', { name: '4', exact: true })).toBeChecked();
  });

  test('opens the lobby with the game selected and turns away the player after the chosen limit', async ({ browser }) => {
    const { host, player, close } = await roomContexts(browser);
    const third = await browser.newContext();
    try {
      const code = await createRoom(host, 'Hosty', { game: 'Test room game', players: 2 });
      await expect(host.getByLabel('Choose a game')).toHaveValue('test-online');
      await joinByCode(player, code);
      await expect(player.getByText('Selected game: Test room game')).toBeVisible();

      const late = await third.newPage();
      await late.goto('/');
      const join = late.getByRole('region', { name: 'Join with Room Code' });
      await join.getByLabel('Room code').fill(code);
      await join.getByLabel('Display name').fill('Late');
      await join.getByRole('button', { name: 'Join room' }).click();
      await expect(late.getByRole('alert')).toContainText('This room has no seats available.');
    } finally { await third.close(); await close(); }
  });

  test('creates a single room when the same request is retried after a dropped connection', async ({ page, context }) => {
    const options = await openCreatePanel(page, 'Test room game');
    await options.getByLabel('Display name').fill('Hosty');
    let attempts = 0;
    await context.route('**/api/rooms', async (route) => {
      if (route.request().method() === 'POST' && attempts++ === 0) return route.abort('connectionreset');
      return route.continue();
    });
    await options.getByRole('button', { name: 'Create room', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('could not be reached');
    await options.getByRole('button', { name: 'Create room', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Room lobby' })).toBeVisible();
  });
});
