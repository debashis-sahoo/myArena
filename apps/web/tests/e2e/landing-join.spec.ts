import { test, expect, roomContexts, createRoom, joinByCode } from './helpers';

test('joins by code from the landing page without choosing a game', async ({ browser }) => {
  const { host, player, close } = await roomContexts(browser);
  try {
    const code = await createRoom(host);
    await player.goto('/');
    await expect(player.getByRole('region', { name: /choose how to play/ })).toHaveCount(0);
    await joinByCode(player, code, 'Pat');
    await expect(player.getByRole('list', { name: 'Members' }).getByRole('listitem')).toHaveCount(2);
  } finally { await close(); }
});

test('an invalid code is explained without revealing anything and can be retried', async ({ page }) => {
  await page.goto('/');
  const join = page.getByRole('region', { name: 'Join with Room Code' });
  await join.getByLabel('Room code').fill('ZZZZZZZZZZ');
  await join.getByLabel('Display name').fill('Pat');
  await join.getByRole('button', { name: 'Join room' }).click();
  await expect(page.getByRole('alert')).toContainText('This invitation is unavailable.');
  await expect(page.getByRole('alert')).toContainText('Ask the host for a new invitation.');
  await expect(join.getByLabel('Room code')).toHaveValue('ZZZZZZZZZZ');
  await join.getByRole('button', { name: 'Join room' }).click();
  await expect(page.getByRole('alert')).toContainText('This invitation is unavailable.');
});

test('an invite link goes straight to joining and ignores a selected game', async ({ browser }) => {
  const { host, player, close } = await roomContexts(browser);
  try {
    const code = await createRoom(host);
    await player.goto('/?game=test-stub');
    await expect(player.getByRole('region', { name: 'Test match: choose how to play' })).toBeVisible();
    await player.goto(`/join/${code}?game=test-stub`);
    await expect(player.getByRole('heading', { name: 'Join a room', level: 1 })).toBeVisible();
    await expect(player.getByRole('region', { name: /choose how to play/ })).toHaveCount(0);
    await player.getByLabel('Display name').fill('Pat');
    await player.getByRole('button', { name: 'Join room' }).click();
    await expect(player.getByRole('heading', { name: 'Room lobby' })).toBeVisible();
  } finally { await close(); }
});

test('offers a way back to the room while seated, and stops after leaving', async ({ page }) => {
  await createRoom(page);
  await page.goto('/');
  const banner = page.getByRole('region', { name: 'Return to your room' });
  await expect(banner).toBeVisible();
  await banner.getByRole('link', { name: 'Return to your room' }).click();
  await expect(page.getByRole('heading', { name: 'Room lobby' })).toBeVisible();
  await page.getByRole('button', { name: 'Leave room' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Leave room' }).click();
  await expect(page.getByRole('heading', { name: 'Your Friends. Your Arena.' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Return to your room' })).toHaveCount(0);
});
