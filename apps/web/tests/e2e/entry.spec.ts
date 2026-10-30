import { test, expect, roomContexts, createRoom, openCreatePanel } from './helpers';

test('host creates a room and a second browser joins via the link with no account', async ({ browser }) => {
  const { host, player, close } = await roomContexts(browser);
  try {
    const code = await createRoom(host);
    const link = await host.getByText(/\/join\/[A-HJ-NP-Z2-9]{10}$/).textContent();
    expect(link).toContain(`/join/${code}`);

    await player.goto(link!);
    await expect(player.getByRole('heading', { name: 'Join a room', level: 1 })).toBeVisible();
    await expect(player.getByLabel('Room code')).toHaveValue(code!);
    await player.getByLabel('Display name').fill('Pat');
    await player.getByRole('button', { name: 'Join room' }).click();
    await expect(player.getByRole('heading', { name: 'Room lobby' })).toBeVisible();

    for (const page of [host, player]) {
      const members = page.getByRole('list', { name: 'Members' }).getByRole('listitem');
      await expect(members).toHaveCount(2);
      await expect(members.nth(0)).toContainText('Hosty');
      await expect(members.nth(1)).toContainText('Pat');
    }
    await expect(player.getByRole('region', { name: 'Invite friends' })).toHaveCount(0);
  } finally { await close(); }
});

test('a form error moves focus to an announced summary with a next step', async ({ page }) => {
  await page.goto('/');
  const options = await openCreatePanel(page);
  await options.getByRole('button', { name: 'Create room', exact: true }).click();
  const alert = page.getByRole('alert');
  await expect(alert).toBeFocused();
  await expect(alert).toContainText('Use 1 to 24 letters, numbers, or spaces.');
});

test('a full or unknown invitation is explained with a safe retry', async ({ page }) => {
  await page.goto('/join/ZZZZZZZZZZ');
  await expect(page.getByRole('alert')).toContainText('Ask the host for a new invitation.');
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
});
