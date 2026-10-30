import type { Page } from '@playwright/test';
import { test, expect, roomContexts, createRoom, joinByCode } from './helpers';

const live = (page: Page, text: string) => page.locator('[aria-live="polite"]').filter({ hasText: text });

test('the host hands off management and both screens and announcements follow', async ({ browser }) => {
  const { host, player, close } = await roomContexts(browser);
  try {
    const code = await createRoom(host);
    await joinByCode(player, code);
    await expect(player.getByRole('button', { name: 'Start match' })).toHaveCount(0);
    await expect(player.getByRole('region', { name: 'Host actions' })).toHaveCount(0);

    await host.getByRole('button', { name: 'Hand off host role' }).click();
    const dialog = host.getByRole('dialog');
    await dialog.getByLabel('New host').selectOption({ label: 'Pat' });
    await dialog.getByRole('button', { name: 'Hand off' }).click();

    await expect(player.getByRole('region', { name: 'Host actions' })).toBeVisible();
    await expect(player.getByRole('region', { name: 'Invite friends' })).toBeVisible();
    await expect(player.getByRole('button', { name: 'Start match' })).toBeVisible();
    await expect(host.getByRole('region', { name: 'Host actions' })).toHaveCount(0);
    await expect(host.getByRole('region', { name: 'Invite friends' })).toHaveCount(0);
    await expect(host.getByRole('button', { name: 'Start match' })).toHaveCount(0);
    await expect(live(player, 'You are now the host.')).toHaveCount(1);
    await expect(live(host, 'Pat is now the host.')).toHaveCount(1);
    await expect(host.getByRole('list', { name: 'Members' }).getByRole('listitem').nth(1)).toContainText('Host');
  } finally { await close(); }
});

test('when the host leaves, the room continues with a new host', async ({ browser }) => {
  const { host, player, close } = await roomContexts(browser);
  try {
    const code = await createRoom(host);
    await joinByCode(player, code);
    await host.getByRole('button', { name: 'Leave room' }).click();
    await host.getByRole('dialog').getByRole('button', { name: 'Leave room' }).click();
    await expect(host.getByRole('heading', { name: 'Your Friends. Your Arena.' })).toBeVisible();

    await expect(player.getByRole('region', { name: 'Host actions' })).toBeVisible();
    await expect(player.getByRole('region', { name: 'Invite friends' })).toBeVisible();
    await expect(live(player, 'You are now the host.')).toHaveCount(1);
    await expect(player.getByRole('list', { name: 'Members' }).getByRole('listitem')).toHaveCount(1);
  } finally { await close(); }
});

test('closing the room tells everyone and leaves nothing to come back to', async ({ browser }) => {
  const { host, player, close } = await roomContexts(browser);
  try {
    const code = await createRoom(host);
    await joinByCode(player, code);
    const link = host.url().replace(/\/room\/.*/, `/join/${code}`);

    await host.getByRole('button', { name: 'Close room' }).click();
    await host.getByRole('dialog').getByRole('button', { name: 'Keep room open' }).click();
    await expect(host.getByRole('heading', { name: 'Room lobby' })).toBeVisible();

    await host.getByRole('button', { name: 'Close room' }).click();
    await host.getByRole('dialog').getByRole('button', { name: 'Close room' }).click();
    for (const page of [host, player]) await expect(page.getByRole('heading', { name: 'This room has closed' })).toBeVisible();
    await expect(live(player, 'The host closed the room.')).toHaveCount(1);

    await player.reload();
    await expect(player.getByRole('heading', { name: /unavailable|no longer available/ })).toBeVisible();
    await player.goto(link);
    await expect(player.getByRole('heading', { name: "This invitation can't be used" })).toBeVisible();
  } finally { await close(); }
});
