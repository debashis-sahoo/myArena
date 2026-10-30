import { describe, expect, it } from 'vitest';
import type { GameMessage } from '@myarena/protocol';
import { GameRegistry } from '../../src/games/registry.js';
import { createChannelStubGame } from '../../src/games/stub-game.js';
import { TestClock, startTestServer, type TestSocket } from './helpers.js';

const isSnapshot = (message: { type: string }) => message.type === 'snapshot';
const gameMessages = (socket: TestSocket) => socket.log.filter((message): message is GameMessage => message.type === 'game');
const lastGame = (socket: TestSocket) => gameMessages(socket).at(-1);

async function startRoom() {
  const clock = new TestClock();
  const game = createChannelStubGame();
  const server = await startTestServer({ clock, games: new GameRegistry([game]) });
  const hostClient = server.client();
  const created = await (await hostClient.request('/api/rooms', { method: 'POST', body: JSON.stringify({ displayName: 'Host', gameId: 'test-channel', maxParticipants: 3 }) })).json();
  const host = { client: hostClient, socket: await hostClient.connect(created.roomId), id: created.participantId as string };
  await host.socket.waitFor(isSnapshot);
  const client = server.client();
  const joined = await (await client.request('/api/rooms/join', { method: 'POST', body: JSON.stringify({ code: created.invitation.code, displayName: 'Alex' }) })).json();
  const alex = { client, socket: await client.connect(created.roomId), id: joined.participantId as string };
  await alex.socket.waitFor(isSnapshot);
  const roomId = created.roomId as string;
  const start = async () => {
    expect((await alex.socket.act({ type: 'ready.set', ready: true })).status).toBe('ACCEPTED');
    expect((await host.socket.act({ type: 'match.start' })).status).toBe('ACCEPTED');
    await alex.socket.until(() => gameMessages(alex.socket).length >= 1);
  };
  return { server, game, clock, host, alex, roomId, start };
}

describe('the game channel', () => {
  it('sends each member their own view when the match starts, with one match id and a sequence from 1', async () => {
    const { host, alex, start } = await startRoom();
    await start();
    await host.socket.until(() => gameMessages(host.socket).length >= 1);
    const hostFirst = gameMessages(host.socket)[0]!;
    const alexFirst = gameMessages(alex.socket)[0]!;
    expect(hostFirst.seq).toBe(1);
    expect(alexFirst.seq).toBe(1);
    expect(hostFirst.matchId).toBe(alexFirst.matchId);
    expect(hostFirst.state).toMatchObject({ you: host.id, mine: 0, total: 0 });
    expect(alexFirst.state).toMatchObject({ you: alex.id, mine: 0, total: 0 });
    expect(hostFirst.events).toEqual([{ kind: 'STARTED' }]);
  });

  it('accepts an action from either role and publishes a new view to everyone', async () => {
    const { host, alex, start } = await startRoom();
    await start();
    const ack = await alex.socket.act({ type: 'game.action', action: { type: 'move' } });
    expect(ack.status).toBe('ACCEPTED');
    await host.socket.until(() => lastGame(host.socket)?.seq === 2);
    expect(lastGame(host.socket)?.state).toMatchObject({ you: host.id, mine: 0, total: 1 });
    expect(lastGame(alex.socket)?.state).toMatchObject({ you: alex.id, mine: 1, total: 1 });
    expect((await host.socket.act({ type: 'game.action', action: { type: 'move' } })).status).toBe('ACCEPTED');
    await alex.socket.until(() => lastGame(alex.socket)?.seq === 3);
    expect(lastGame(alex.socket)?.state).toMatchObject({ mine: 1, total: 2 });
  });

  it('refuses an action with the game text and changes nothing', async () => {
    const { host, alex, start } = await startRoom();
    await start();
    const ack = await alex.socket.act({ type: 'game.action', action: { type: 'dance' } });
    expect(ack).toMatchObject({ status: 'REJECTED', code: 'GAME_ACTION_REJECTED', detail: 'That move is not known.', nextStep: 'Use a move.' });
    expect(lastGame(host.socket)?.seq).toBe(1);
  });

  it('explains an action outside a match in plain words', async () => {
    const { alex } = await startRoom();
    const ack = await alex.socket.act({ type: 'game.action', action: { type: 'move' } });
    expect(ack).toMatchObject({ status: 'REJECTED', code: 'GAME_ACTION_REJECTED', detail: 'There is no match in progress for you.' });
  });

  it('rejects a malformed action as a validation failure', async () => {
    const { alex, start } = await startRoom();
    await start();
    const ack = await alex.socket.act({ type: 'game.action', action: { type: 'Move!' } });
    expect(ack).toMatchObject({ status: 'REJECTED', code: 'VALIDATION_FAILED' });
  });

  it('does not apply a resent client action id twice', async () => {
    const { alex, start } = await startRoom();
    await start();
    const clientActionId = '3b0f2bd4-6a2b-4d3a-9f2b-9a8f7d4e5c10';
    await alex.socket.act({ clientActionId, type: 'game.action', action: { type: 'move' } });
    const again = await alex.socket.act({ clientActionId, type: 'game.action', action: { type: 'move' } });
    expect(again.status).toBe('ACCEPTED');
    await alex.socket.until(() => lastGame(alex.socket)?.seq === 2);
    expect(lastGame(alex.socket)?.state).toMatchObject({ mine: 1, total: 1 });
  });

  it('gives a reconnecting member the current game in the snapshot', async () => {
    const { alex, roomId, start } = await startRoom();
    await start();
    await alex.socket.act({ type: 'game.action', action: { type: 'move' } });
    alex.socket.close();
    await alex.socket.closed;
    const again = await alex.client.connect(roomId);
    const snapshot = await again.waitFor(isSnapshot);
    expect(snapshot).toMatchObject({ type: 'snapshot', game: { seq: 2, state: { you: alex.id, mine: 1, total: 1 } } });
    const matchId = lastGame(alex.socket)?.matchId;
    expect((snapshot as { game: { matchId: string } }).game.matchId).toBe(matchId);
  });

  it('starts a new match id and sequence on a rematch, and frees the old state on the way', async () => {
    const { host, alex, game, start } = await startRoom();
    await start();
    const firstMatch = lastGame(host.socket)!.matchId;
    await alex.socket.act({ type: 'game.action', action: { type: 'finish' } });
    await host.socket.until(() => host.socket.events().some((event) => event.kind === 'match.ended'));
    expect(lastGame(host.socket)?.state).toMatchObject({ total: 0 });
    expect((await host.socket.act({ type: 'match.rematch' })).status).toBe('ACCEPTED');
    await host.socket.until(() => lastGame(host.socket)?.matchId !== firstMatch);
    expect(lastGame(host.socket)?.seq).toBe(1);
    expect(game.calls).toContain('release');
  });

  it('releases the match when the room returns to the lobby and stops sending a game', async () => {
    const { host, alex, roomId, game, start } = await startRoom();
    await start();
    await alex.socket.act({ type: 'game.action', action: { type: 'finish' } });
    await host.socket.until(() => host.socket.events().some((event) => event.kind === 'match.ended'));
    expect((await host.socket.act({ type: 'match.returnToLobby' })).status).toBe('ACCEPTED');
    expect(game.calls.filter((call) => call === 'release')).toHaveLength(1);
    host.socket.send({ v: 1, clientActionId: '7d6a0a0f-0f8e-44a9-9a8a-0b2e3f4d5c60', type: 'resync' });
    const snapshot = await host.socket.waitFor((message) => isSnapshot(message) && message.version > 0 && (message as { lobby: { matchStatus: string } }).lobby.matchStatus === 'NONE');
    expect((snapshot as { game?: unknown }).game ?? null).toBeNull();
    expect(roomId).toBeTruthy();
  });

  it('tells the game once when a seat is released during a match', async () => {
    const { alex, roomId, game, start } = await startRoom();
    await start();
    expect((await alex.client.request(`/api/rooms/${roomId}/leave`, { method: 'POST' })).status).toBe(204);
    expect(game.calls).toContain(`left:left:${alex.id}`);
    expect(game.calls.filter((call) => call.startsWith('left:'))).toHaveLength(1);
  });

  it('does not call the game about a seat released outside a match', async () => {
    const { alex, roomId, game } = await startRoom();
    await alex.client.request(`/api/rooms/${roomId}/leave`, { method: 'POST' });
    expect(game.calls.filter((call) => call.startsWith('left:'))).toHaveLength(0);
  });
});
