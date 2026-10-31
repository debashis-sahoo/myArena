import { test, expect } from './helpers';

const SAVE_KEY = 'myarena-ludo-solo';

// Red has three pawns home and one on step 55; a settled 1 wins the match.
const nearlyWon = {
  savedAt: 0,
  settings: { opponents: 1, difficulty: 'normal', theme: 'classic' },
  state: {
    seats: [
      { color: 'RED', kind: 'HUMAN', label: 'Pat', pawns: [56, 56, 56, 55], away: false, missed: 0, left: false },
      { color: 'YELLOW', kind: 'COMPUTER', label: 'Computer 1', pawns: [-1, -1, -1, -1], away: false, missed: 0, left: false },
    ],
    current: 0, phase: 'MOVE', dice: 1, sixesInRow: 0, forfeit: false, winner: null, log: [{ n: 0, text: 'The match starts. Pat goes first.' }], logCount: 1,
  },
};

test.describe('Ludo against the computer', () => {
  test('opens the set-up from the landing page without creating a room', async ({ page }) => {
    const roomRequests: string[] = [];
    page.on('request', (request) => { if (request.method() === 'POST' && request.url().includes('/api/rooms')) roomRequests.push(request.url()); });
    await page.goto('/');
    await page.getByRole('button', { name: /^Ludo Playable/ }).click();
    await page.getByRole('region', { name: 'Ludo: choose how to play' }).getByRole('button', { name: 'Play against AI', exact: true }).click();
    await expect(page).toHaveURL(/\/play\/ludo\/solo$/);
    await expect(page.getByRole('heading', { name: 'Ludo: play against the computer' })).toBeVisible();
    await expect(page.getByRole('radio', { name: '1 computer' })).toBeChecked();
    await expect(page.getByRole('radio', { name: 'Normal' })).toBeChecked();
    expect(roomRequests).toEqual([]);
    await expect(page.getByText(/invit/i)).toHaveCount(0);
  });

  for (const difficulty of ['Easy', 'Normal', 'Hard']) {
    test(`starts a match on ${difficulty} with no chat`, async ({ page }) => {
      await page.goto('/play/ludo/solo');
      await page.getByRole('radio', { name: difficulty, exact: true }).check({ force: true });
      await page.getByRole('radio', { name: '2 computers' }).check({ force: true });
      await page.getByRole('button', { name: 'Start game' }).click();
      await expect(page.getByRole('region', { name: 'Ludo match' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Roll the die' })).toBeVisible();
      await expect(page.getByLabel('Message', { exact: true })).toHaveCount(0);
      await expect(page.getByRole('log', { name: 'Chat messages' })).toHaveCount(0);
    });
  }

  test('restores the match after a refresh and discards it when leaving', async ({ page }) => {
    await page.goto('/play/ludo/solo');
    await page.getByRole('button', { name: 'Start game' }).click();
    await expect(page.getByRole('region', { name: 'Ludo match' })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('region', { name: 'Ludo match' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Ludo: play against the computer' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Leave match' }).click();
    await expect(page).toHaveURL(/\/\?game=ludo/);
    expect(await page.evaluate((key) => localStorage.getItem(key), SAVE_KEY)).toBeNull();
    await page.goto('/play/ludo/solo');
    await expect(page.getByRole('heading', { name: 'Ludo: play against the computer' })).toBeVisible();
  });

  test('shows an end screen with Play again and Back to games', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(([key, saved]) => localStorage.setItem(key!, JSON.stringify({ ...(saved as object), savedAt: Date.now() })), [SAVE_KEY, nearlyWon] as const);
    await page.goto('/play/ludo/solo');
    const chooser = page.getByRole('group', { name: 'Choose a pawn' });
    await chooser.getByRole('button').first().click();
    await expect(page.getByRole('heading', { name: 'Pat wins!' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Roll the die' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Play again' }).click();
    await expect(page.getByRole('region', { name: 'Ludo match' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Pat wins!' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Leave match' }).click();
    await page.goto('/');
    await page.evaluate(([key, saved]) => localStorage.setItem(key!, JSON.stringify({ ...(saved as object), savedAt: Date.now() })), [SAVE_KEY, nearlyWon] as const);
    await page.goto('/play/ludo/solo');
    await page.getByRole('group', { name: 'Choose a pawn' }).getByRole('button').first().click();
    await page.getByRole('button', { name: 'Back to games' }).click();
    await expect(page).toHaveURL(/\/\?game=ludo/);
  });
});
