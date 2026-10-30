import { test as base, expect, type Browser, type BrowserContextOptions, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

export const test = base.extend({});
export { expect, AxeBuilder };

export async function roomContexts(browser: Browser, options: BrowserContextOptions = {}) {
  const host = await browser.newContext(options);
  const player = await browser.newContext(options);
  return {
    host: await host.newPage(),
    player: await player.newPage(),
    async close() {
      await Promise.all([host.close(), player.close()]);
    },
  };
}

export const testGameName = 'Test match';

/** Opens the create-room controls for a game from the landing page; returns the options region. */
export async function openCreatePanel(host: Page, game = testGameName) {
  await host.goto('/');
  await host.getByRole('button', { name: new RegExp(`^${game} Playable`) }).click();
  const options = host.getByRole('region', { name: `${game}: choose how to play` });
  await options.getByRole('button', { name: 'Create private room', exact: true }).click();
  return options;
}

export async function createRoom(host: Page, name = 'Hosty', { game = testGameName, players }: { game?: string; players?: number } = {}) {
  const options = await openCreatePanel(host, game);
  await options.getByLabel('Display name').fill(name);
  if (players !== undefined) {
    const radio = options.getByRole('radio', { name: String(players), exact: true });
    if (await radio.count()) await radio.check({ force: true });
    else await options.getByLabel('Number of players').fill(String(players));
  }
  await options.getByRole('button', { name: 'Create room', exact: true }).click();
  await expect(host.getByRole('heading', { name: 'Room lobby' })).toBeVisible();
  return (await host.getByText(/^[A-HJ-NP-Z2-9]{10}$/).textContent())!;
}

export async function joinByCode(player: Page, code: string, name = 'Pat') {
  await player.goto('/');
  const join = player.getByRole('region', { name: 'Join with Room Code' });
  await join.getByLabel('Room code').fill(code);
  await join.getByLabel('Display name').fill(name);
  await join.getByRole('button', { name: 'Join room' }).click();
  await expect(player.getByRole('heading', { name: 'Room lobby' })).toBeVisible();
}

export const inviteLink = (host: Page, code: string) => host.url().replace(/\/room\/.*/, `/join/${code}`);
