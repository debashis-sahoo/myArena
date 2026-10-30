import { randomUUID } from 'node:crypto';
import type { DestinationStream } from 'pino';
import type { LobbyView } from '@myarena/protocol';
import { GameRegistry } from '../../src/games/registry.js';
import { createStubGame } from '../../src/games/stub-game.js';
import type { Room } from '../../src/rooms/room.js';
import { TestClock, startTestServer, type TestSocket } from './helpers.js';

// Room state that matters for "nothing changed" assertions, without credentials.
export const stateOf = (room: Room) => JSON.stringify({
  status: room.status, matchStatus: room.matchStatus, selectedGameId: room.selectedGameId, settings: room.settings,
  invitation: room.invitation, chat: room.chat, version: room.version,
  participants: room.participants.map(({ id, role, ready, connection, displayLabel }) => ({ id, role, ready, connection, displayLabel })),
});

export const isSnapshot = (message: { type: string }) => message.type === 'snapshot';
export const lobbyOf = (message: { type: string }) => (message as { lobby: LobbyView }).lobby;

type Client = ReturnType<Awaited<ReturnType<typeof startTestServer>>['client']>;
export interface Member { client: Client; socket: TestSocket; id: string; }

// A host plus connected players, all holding a snapshot, driven by a controllable clock.
export async function setupLobby(playerNames: string[] = ['Alex'], options: { heartbeatClock?: TestClock; silentPlayers?: boolean; logStream?: DestinationStream } = {}) {
  const clock = new TestClock();
  const server = await startTestServer({
    clock, games: new GameRegistry([createStubGame()]),
    ...(options.heartbeatClock ? { heartbeatClock: options.heartbeatClock } : {}),
    ...(options.logStream ? { logStream: options.logStream } : {}),
  });
  const hostClient = server.client();
  const created = await (await hostClient.request('/api/rooms', { method: 'POST', body: JSON.stringify({ displayName: 'Host' }) })).json();
  const host: Member = { client: hostClient, socket: await hostClient.connect(created.roomId), id: created.participantId };
  await host.socket.waitFor(isSnapshot);

  const players: Member[] = [];
  for (const displayName of playerNames) {
    const client = server.client();
    const joined = await (await client.request('/api/rooms/join', { method: 'POST', body: JSON.stringify({ code: created.invitation.code, displayName }) })).json();
    const socket = await client.connect(created.roomId, options.silentPlayers ? { autoPong: false } : {});
    await socket.waitFor(isSnapshot);
    players.push({ client, socket, id: joined.participantId });
  }
  const members = [host, ...players];
  await Promise.all(members.map((member) => member.socket.until(() => member.socket.events().length >= 0)));
  await host.socket.until(() => host.socket.events().length >= players.length);
  return {
    server, clock, host, players, members, roomId: created.roomId as string, code: created.invitation.code as string,
    room: server.rooms.store.get(created.roomId)!,
    uniqueId: randomUUID,
    close: () => server.close(),
  };
}
