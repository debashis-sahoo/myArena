import { Writable } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { GameRegistry } from '../../src/games/registry.js';
import { scriptedDice, type DiceSource } from '../../src/games/ludo/dice.js';
import { createLudoGame } from '../../src/games/ludo/ludo-game.js';
import { TestClock, startTestServer, type TestSocket } from '../integration/helpers.js';

const isSnapshot = (message: { type: string }) => message.type === 'snapshot';

async function member(server: Awaited<ReturnType<typeof startTestServer>>, join: { code: string } | null, displayName: string) {
  const client = server.client();
  const entry = join
    ? await (await client.request('/api/rooms/join', { method: 'POST', body: JSON.stringify({ code: join.code, displayName }) })).json()
    : await (await client.request('/api/rooms', { method: 'POST', body: JSON.stringify({ displayName, gameId: 'ludo', maxParticipants: 2 }) })).json();
  const socket: TestSocket = await client.connect(entry.roomId);
  await socket.waitFor(isSnapshot);
  return { client, socket, entry };
}

describe('match lifecycle logging', () => {
  it('records start, end, seat count and duration, and nothing a player or the game would consider content', async () => {
    let logs = '';
    const logStream = new Writable({ write(chunk, _encoding, callback) { logs += chunk.toString(); callback(); } });
    const clock = new TestClock();
    const dice: DiceSource = { ...scriptedDice([6, 6, 3]), firstSeat: () => 0 };
    const server = await startTestServer({ clock, games: new GameRegistry([createLudoGame({ dice })]), logStream });
    try {
      const host = await member(server, null, 'Zorblax');
      const friend = await member(server, { code: host.entry.invitation.code }, 'Quillfeather');
      await host.socket.act({ type: 'chat.send', text: 'secret-chat-text-4242' });
      await friend.socket.act({ type: 'ready.set', ready: true });
      await host.socket.act({ type: 'match.start' });
      await host.socket.until(() => host.socket.log.some((message) => message.type === 'game'));
      await host.socket.act({ type: 'game.action', action: { type: 'roll' } });
      clock.advance(2400);
      await host.socket.act({ type: 'game.action', action: { type: 'move', payload: { pawn: 0 } } });
      // The other seat leaves, so the match ends with one seat remaining.
      await friend.client.request(`/api/rooms/${host.entry.roomId}/leave`, { method: 'POST' });
      await host.socket.until(() => host.socket.events().some((event) => event.kind === 'match.ended'));
      clock.advance(1);

      const lines = logs.split('\n').filter(Boolean).map((line) => JSON.parse(line) as Record<string, unknown>);
      const lifecycle = lines.filter((line) => 'matchLifecycle' in line).map((line) => line.matchLifecycle as Record<string, unknown>);
      expect(lifecycle.map((event) => event.kind)).toEqual(['started', 'ended']);
      expect(lifecycle[0]).toEqual({ kind: 'started', gameId: 'ludo', seats: 2 });
      expect(lifecycle[1]).toMatchObject({ kind: 'ended', gameId: 'ludo', seats: 1 });
      expect(typeof lifecycle[1]!.durationMs).toBe('number');
      expect(Object.keys(lifecycle[1]!).sort()).toEqual(['durationMs', 'gameId', 'kind', 'seats']);

      for (const secret of ['Zorblax', 'Quillfeather', 'secret-chat-text-4242', host.entry.invitation.code, '"pawns"', '"dice"', '"seed"', '"legalPawns"', 'token']) {
        expect(logs.includes(secret), secret).toBe(false);
      }
    } finally { await server.close(); }
  });
});
