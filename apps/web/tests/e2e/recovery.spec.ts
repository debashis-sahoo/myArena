import type { Page } from '@playwright/test';
import { test, expect, roomContexts, createRoom, joinByCode } from './helpers';

// Records the page's sockets so a test can close the live one from inside the browser, like a dropped connection.
async function trackSockets(page: Page) {
  await page.addInitScript(() => {
    const Native = window.WebSocket;
    const opened: WebSocket[] = [];
    (window as unknown as { __rooms: WebSocket[] }).__rooms = opened;
    window.WebSocket = class extends Native {
      constructor(url: string | URL, protocols?: string | string[]) { super(url, protocols); opened.push(this); }
    };
  });
  return {
    cut: () => page.evaluate(() => (window as unknown as { __rooms: WebSocket[] }).__rooms.at(-1)!.close(4000)),
    opened: () => page.evaluate(() => (window as unknown as { __rooms: WebSocket[] }).__rooms.length),
  };
}

const memberRow = (page: Page, index: number) => page.getByRole('list', { name: 'Members' }).getByRole('listitem').nth(index);

test('a refresh restores the same seat and readiness without duplicating members or messages', async ({ browser }) => {
  const { host, player, close } = await roomContexts(browser);
  try {
    const code = await createRoom(host);
    await joinByCode(player, code);
    await player.getByRole('button', { name: 'I am ready' }).click();
    await player.getByLabel('Message', { exact: true }).fill('before refresh');
    await player.getByRole('button', { name: 'Send' }).click();
    await expect(host.getByRole('log', { name: 'Chat messages' })).toContainText('before refresh');

    await player.reload();
    await expect(player.getByRole('heading', { name: 'Room lobby' })).toBeVisible();
    await expect(player.getByRole('button', { name: 'I am ready' })).toHaveAttribute('aria-pressed', 'true');
    await expect(player.getByRole('log', { name: 'Chat messages' })).toContainText('before refresh');
    await expect(host.getByRole('list', { name: 'Members' }).getByRole('listitem')).toHaveCount(2);
    await expect(memberRow(host, 1)).toContainText('Connected');
    await expect(host.getByRole('log', { name: 'Chat messages' }).getByText('before refresh')).toHaveCount(1);
  } finally { await close(); }
});

test('a dropped connection keeps the seat, is shown as reconnecting, and resends a pending message once', async ({ browser }) => {
  const { host, player, close } = await roomContexts(browser);
  try {
    const sockets = await trackSockets(player);
    const code = await createRoom(host);
    await joinByCode(player, code);
    await expect(memberRow(host, 1)).toContainText('Connected');

    await player.context().setOffline(true);
    await sockets.cut();
    await expect(player.getByRole('status').filter({ hasText: 'Reconnecting' })).toBeVisible();
    await expect(player.getByText('Back online.')).toHaveCount(0);
    await expect(memberRow(host, 1)).toContainText('Disconnected');
    await expect(host.getByRole('list', { name: 'Members' }).getByRole('listitem')).toHaveCount(2);

    await player.getByLabel('Message', { exact: true }).fill('sent while offline');
    await player.getByRole('button', { name: 'Send' }).click();

    await player.context().setOffline(false);
    await expect(player.getByText('Back online.')).toBeVisible();
    await expect(memberRow(host, 1)).toContainText('Connected');
    await expect(host.getByRole('log', { name: 'Chat messages' }).getByText('sent while offline')).toHaveCount(1);
    await expect(player.getByRole('log', { name: 'Chat messages' }).getByText('sent while offline')).toHaveCount(1);
    expect(await sockets.opened()).toBeGreaterThan(1);
  } finally { await close(); }
});

test('explicit Leave releases the seat at once and returns to the start', async ({ browser }) => {
  const { host, player, close } = await roomContexts(browser);
  try {
    const code = await createRoom(host);
    await joinByCode(player, code);
    await expect(host.getByRole('list', { name: 'Members' }).getByRole('listitem')).toHaveCount(2);

    await player.getByRole('button', { name: 'Leave room' }).click();
    await player.getByRole('dialog').getByRole('button', { name: 'Stay' }).click();
    await expect(player.getByRole('heading', { name: 'Room lobby' })).toBeVisible();

    await player.getByRole('button', { name: 'Leave room' }).click();
    await player.getByRole('dialog').getByRole('button', { name: 'Leave room' }).click();
    await expect(player.getByRole('heading', { name: 'Your Friends. Your Arena.' })).toBeVisible();
    await expect(host.getByRole('list', { name: 'Members' }).getByRole('listitem')).toHaveCount(1);

    await joinByCode(player, code);
    await expect(host.getByRole('list', { name: 'Members' }).getByRole('listitem')).toHaveCount(2);
  } finally { await close(); }
});

test('opening the room in a second window disconnects the first with an explanation', async ({ browser }) => {
  const { host, player, close } = await roomContexts(browser);
  try {
    const code = await createRoom(host);
    await joinByCode(player, code);
    const second = await player.context().newPage();
    await second.goto(player.url());
    await expect(second.getByRole('heading', { name: 'Room lobby' })).toBeVisible();
    await expect(player.getByRole('heading', { name: 'This room is open in another window' })).toBeVisible();
    await expect(memberRow(host, 1)).toContainText('Connected');
  } finally { await close(); }
});

test('a seat that can no longer be recovered is explained instead of silently restored', async ({ browser }) => {
  const { host, player, close } = await roomContexts(browser);
  try {
    const sockets = await trackSockets(player);
    const code = await createRoom(host);
    await joinByCode(player, code);
    await player.route('**/api/rooms/*/session', (route) => route.fulfill({
      status: 410, contentType: 'application/problem+json',
      body: JSON.stringify({ type: 'x', title: 'x', status: 410, code: 'RECOVERY_EXPIRED', detail: 'Your seat can no longer be recovered.', nextStep: 'Create a new room.' }),
    }));
    await sockets.cut();
    const alert = player.getByRole('alert');
    await expect(alert.getByRole('heading', { name: 'Your seat is no longer available' })).toBeVisible();
    await expect(alert).toContainText('more than 10 minutes');
    await expect(alert.getByRole('link', { name: 'Back to the start' })).toBeVisible();
  } finally { await close(); }
});
