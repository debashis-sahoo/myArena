import type { Page } from '@playwright/test';
import { test, expect, roomContexts, createRoom, joinByCode as joinWithCode } from './helpers';

// The lobby journeys join with a lower-case code to prove codes are case-insensitive.
const joinByCode = (player: Page, code: string) => joinWithCode(player, code.toLowerCase());

test('host and player share one lobby through ready, game, settings, start, rematch, and chat', async ({ browser }) => {
  const { host, player, close } = await roomContexts(browser);
  try {
    const code = await createRoom(host);
    await joinByCode(player, code);

    await expect(player.getByRole('button', { name: 'Start match' })).toHaveCount(0);
    await expect(player.getByLabel('Choose a game')).toHaveCount(0);
    await expect(player.getByRole('button', { name: /^Remove/ })).toHaveCount(0);

    // The game chosen on the landing page arrives pre-selected.
    await expect(player.getByText('Selected game: Test match')).toBeVisible();
    await host.getByRole('button', { name: 'Start match' }).click();
    await expect(host.getByRole('alert').filter({ hasText: 'Some players are not ready.' })).toBeVisible();

    await host.getByLabel('Choose a game').selectOption({ label: 'Test room game' });
    await expect(player.getByText('Selected game: Test room game')).toBeVisible();
    await host.getByLabel('Choose a game').selectOption({ label: 'Test match' });
    await expect(player.getByText('Selected game: Test match')).toBeVisible();

    await host.getByLabel('Maximum participants (1 to 100)').fill('5');
    await host.getByRole('button', { name: 'Save settings' }).click();
    await expect(player.getByText('Maximum participants: 5')).toBeVisible();

    await player.getByRole('button', { name: 'I am ready' }).click();
    await expect(player.getByRole('button', { name: 'I am ready' })).toHaveAttribute('aria-pressed', 'true');
    await expect(host.getByRole('list', { name: 'Members' }).getByRole('listitem').nth(1)).toContainText('Ready');

    await host.getByRole('button', { name: 'Start match' }).click();
    for (const page of [host, player]) await expect(page.getByText('A match is in progress.')).toBeVisible();
    for (const page of [host, player]) await expect(page.getByText('The match has ended.')).toBeVisible();

    await host.getByRole('button', { name: 'Rematch' }).click();
    for (const page of [host, player]) await expect(page.getByText('A match is in progress.')).toBeVisible();
    await expect(host.getByText('The match has ended.')).toBeVisible();
    await host.getByRole('button', { name: 'Back to lobby' }).click();
    for (const page of [host, player]) await expect(page.getByText('In the lobby.')).toBeVisible();

    await player.getByLabel('Message', { exact: true }).fill('hello team');
    await player.getByRole('button', { name: 'Send' }).click();
    for (const page of [host, player]) await expect(page.getByRole('log', { name: 'Chat messages' })).toContainText('Pat: hello team');
    await expect(player.getByLabel('Message', { exact: true })).toHaveValue('');
  } finally { await close(); }
});

test('regenerating the invitation changes the code for the host only', async ({ browser }) => {
  const { host, player, close } = await roomContexts(browser);
  try {
    const code = await createRoom(host);
    await joinByCode(player, code);
    await host.getByRole('button', { name: 'New invitation' }).click();
    await host.getByRole('button', { name: 'Regenerate' }).click();
    await expect(host.getByText(code)).toHaveCount(0);
    await expect(host.getByText(/^[A-HJ-NP-Z2-9]{10}$/)).toBeVisible();
    await expect(player.getByText(/^[A-HJ-NP-Z2-9]{10}$/)).toHaveCount(0);
  } finally { await close(); }
});

test('the host removes a member after confirming, and the member is told', async ({ browser }) => {
  const { host, player, close } = await roomContexts(browser);
  try {
    const code = await createRoom(host);
    await joinByCode(player, code);
    const members = host.getByRole('list', { name: 'Members' }).getByRole('listitem');
    await expect(members).toHaveCount(2);

    await host.getByRole('button', { name: 'Remove Pat' }).click();
    await host.getByRole('button', { name: 'Cancel' }).click();
    await expect(members).toHaveCount(2);

    await host.getByRole('button', { name: 'Remove Pat' }).click();
    const cleared = player.waitForResponse((response) => response.url().includes('/leave') && response.request().method() === 'POST');
    await host.getByRole('button', { name: 'Remove member' }).click();
    await expect(members).toHaveCount(1);
    await expect(player.getByRole('heading', { name: 'You were removed from the room' })).toBeVisible();
    await expect(player.getByText('only with a valid invitation')).toBeVisible();
    expect((await cleared).status()).toBe(204);

    await joinByCode(player, code);
    await expect(members).toHaveCount(2);
  } finally { await close(); }
});
