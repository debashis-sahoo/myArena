import { describe, expect, it } from 'vitest';
import type { GameMessage } from '@myarena/protocol';
import { GameRegistry } from '../../src/games/registry.js';
import { cryptoDice } from '../../src/games/ludo/dice.js';
import { createLudoGame } from '../../src/games/ludo/ludo-game.js';
import { TestClock, startTestServer, type TestSocket } from './helpers.js';

const isSnapshot = (message: { type: string }) => message.type === 'snapshot';
const games = (socket: TestSocket) => socket.log.filter((message): message is GameMessage => message.type === 'game');
const chatTexts = (socket: TestSocket) => socket.events().filter((event) => event.kind === 'chat.message').map((event) => (event.data as { message: { text: string } }).message.text);

async function startRoom() {
  const clock = new TestClock();
  const server = await startTestServer({ clock, games: new GameRegistry([createLudoGame({ dice: cryptoDice() })]) });
  const hostClient = server.client();
  const created = await (await hostClient.request('/api/rooms', { method: 'POST', body: JSON.stringify({ displayName: 'Host', gameId: 'ludo', maxParticipants: 2 }) })).json();
  const host = await hostClient.connect(created.roomId);
  await host.waitFor(isSnapshot);
  const friendClient = server.client();
  await friendClient.request('/api/rooms/join', { method: 'POST', body: JSON.stringify({ code: created.invitation.code, displayName: 'Alex' }) });
  const friend = await friendClient.connect(created.roomId);
  await friend.waitFor(isSnapshot);
  return { host, friend, hostClient, clock, roomId: created.roomId as string };
}

describe('chat around a Ludo match', () => {
  it('keeps lobby messages after the match starts and delivers chat during the match to everyone quickly', async () => {
    const { host, friend, hostClient, clock, roomId } = await startRoom();
    expect((await host.act({ type: 'chat.send', text: 'before we start' })).status).toBe('ACCEPTED');
    expect((await friend.act({ type: 'ready.set', ready: true })).status).toBe('ACCEPTED');
    expect((await host.act({ type: 'match.start' })).status).toBe('ACCEPTED');
    await host.until(() => games(host).length >= 1);

    // A reconnecting member still sees the earlier message in the room's chat.
    host.raw.close();
    await host.closed;
    const again = await hostClient.connect(roomId);
    const snapshot = await again.waitFor(isSnapshot) as unknown as { lobby: { chat: { text: string }[] } };
    expect(snapshot.lobby.chat.map((message) => message.text)).toContain('before we start');

    // SC-008 sample: every message reaches the other member well within a second.
    const sent = Array.from({ length: 40 }, (_, index) => `message ${index}`);
    let delivered = 0;
    for (const [index, text] of sent.entries()) {
      const [from, to] = index % 2 === 0 ? [again, friend] : [friend, again];
      const started = performance.now();
      expect((await from.act({ type: 'chat.send', text })).status).toBe('ACCEPTED');
      await to.until(() => chatTexts(to).includes(text));
      if (performance.now() - started < 1000) delivered += 1;
      clock.advance(2500);
    }
    expect(delivered / sent.length).toBeGreaterThanOrEqual(0.95);
  });

  it('leaves the match state, its sequence number and the turn unchanged', async () => {
    const { host, friend } = await startRoom();
    await friend.act({ type: 'ready.set', ready: true });
    await host.act({ type: 'match.start' });
    await host.until(() => games(host).length >= 1);
    const before = games(host).at(-1)!;
    const turnBefore = JSON.stringify((before.state as { turn: unknown }).turn);

    expect((await friend.act({ type: 'chat.send', text: 'good luck' })).status).toBe('ACCEPTED');
    expect((await host.act({ type: 'chat.send', text: 'you too' })).status).toBe('ACCEPTED');
    await host.until(() => chatTexts(host).includes('good luck'));

    const after = games(host).at(-1)!;
    expect(games(host)).toHaveLength(games(friend).length);
    expect(after.seq).toBe(before.seq);
    expect(JSON.stringify((after.state as { turn: unknown }).turn)).toBe(turnBefore);
  });
});
