import { describe, expect, it } from 'vitest';
import type { GameMessage } from '@myarena/protocol';
import type { LudoMatchView } from '@myarena/ludo';
import { GameRegistry } from '../../src/games/registry.js';
import { scriptedDice, type DiceSource } from '../../src/games/ludo/dice.js';
import { createLudoGame } from '../../src/games/ludo/ludo-game.js';
import { TestClock, startTestServer, type TestSocket } from './helpers.js';

const MINUTE = 60_000;
const isSnapshot = (message: { type: string }) => message.type === 'snapshot';
const names = ['Host', 'Alex', 'Sam', 'Pat'];
const games = (socket: TestSocket) => socket.log.filter((message): message is GameMessage => message.type === 'game');
const lastGame = (socket: TestSocket) => games(socket).at(-1)!;
const viewOf = (socket: TestSocket) => lastGame(socket).state as unknown as LudoMatchView;
const eventKinds = (socket: TestSocket) => games(socket).flatMap((message) => message.events as { kind: string; seat?: number; reason?: string }[]);

async function startRoom(count: number, limit: 0 | 30 | 60 = 60) {
  const clock = new TestClock();
  const dice: DiceSource = { ...scriptedDice([6]), firstSeat: () => 0 };
  const server = await startTestServer({ clock, games: new GameRegistry([createLudoGame({ dice })]) });
  const hostClient = server.client();
  const created = await (await hostClient.request('/api/rooms', { method: 'POST', body: JSON.stringify({ displayName: 'Host', gameId: 'ludo', maxParticipants: count }) })).json();
  const roomId = created.roomId as string;
  const members = [{ client: hostClient, socket: await hostClient.connect(roomId), id: created.participantId as string }];
  await members[0]!.socket.waitFor(isSnapshot);
  for (const displayName of names.slice(1, count)) {
    const client = server.client();
    const joined = await (await client.request('/api/rooms/join', { method: 'POST', body: JSON.stringify({ code: created.invitation.code, displayName }) })).json();
    const socket = await client.connect(roomId);
    await socket.waitFor(isSnapshot);
    members.push({ client, socket, id: joined.participantId as string });
  }
  expect((await members[0]!.socket.act({ type: 'settings.update', changes: { gameSettings: { turnLimitSeconds: limit, theme: 'diwali' } } })).status).toBe('ACCEPTED');
  for (const member of members.slice(1)) expect((await member.socket.act({ type: 'ready.set', ready: true })).status).toBe('ACCEPTED');
  expect((await members[0]!.socket.act({ type: 'match.start' })).status).toBe('ACCEPTED');
  for (const member of members) await member.socket.until(() => games(member.socket).length >= 1);
  const room = () => server.rooms.store.get(roomId)!;
  const disconnect = async (index: number) => {
    members[index]!.socket.raw.terminate();
    await members[0 === index ? 1 : 0]!.socket.until(() => room().participants.find((p) => p.id === members[index]!.id)!.connection === 'DISCONNECTED');
  };
  return { clock, members, roomId, room, disconnect };
}

const roll = { type: 'game.action', action: { type: 'roll' } };
const stable = (view: LudoMatchView) => ({
  theme: view.theme, you: view.you, seats: view.seats, winner: view.winner,
  turn: { seat: view.turn.seat, phase: view.turn.phase, dice: view.turn.dice, legalPawns: view.turn.legalPawns },
});

describe('recovering a Ludo match', () => {
  it('returns a player to the same board, turn, last roll and theme after a disconnect in their turn and mid-roll', async () => {
    const { members, roomId, disconnect, clock } = await startRoom(2);
    const [host] = members as [typeof members[0]];
    const atTurnStart = stable(viewOf(host.socket));
    await disconnect(0);
    const back = await host.client.connect(roomId);
    const first = await back.waitFor(isSnapshot) as unknown as { game: { state: LudoMatchView } };
    expect(stable(first.game.state)).toEqual(atTurnStart);
    expect(first.game.state.theme).toBe('diwali');

    expect((await back.act(roll)).status).toBe('ACCEPTED');
    await back.until(() => lastGame(back).state !== undefined && (lastGame(back).state as unknown as LudoMatchView).turn.phase === 'MOVE');
    const midRoll = stable(viewOf(back));
    back.raw.terminate();
    clock.advance(500);
    const again = await host.client.connect(roomId);
    const second = await again.waitFor(isSnapshot) as unknown as { game: { state: LudoMatchView } };
    expect(stable(second.game.state)).toEqual(midRoll);
    expect(second.game.state.turn).toMatchObject({ dice: 6, phase: 'MOVE' });
    expect(second.game.state.turn.settleMsLeft).toBe(1900);
  });

  it('does not apply a resent action twice', async () => {
    const { members, roomId, disconnect, clock } = await startRoom(2);
    const [host, guest] = members as [typeof members[0], typeof members[0]];
    await host.socket.act(roll);
    clock.advance(2400);
    const clientActionId = '3b0f2bd4-6a2b-4d3a-9f2b-9a8f7d4e5c11';
    const move = { clientActionId, type: 'game.action', action: { type: 'move', payload: { pawn: 0 } } };
    expect((await host.socket.act(move)).status).toBe('ACCEPTED');
    await guest.socket.until(() => eventKinds(guest.socket).filter((event) => event.kind === 'MOVED').length === 1);
    const seq = lastGame(guest.socket).seq;
    await disconnect(0);
    const back = await host.client.connect(roomId);
    await back.waitFor(isSnapshot);
    expect((await back.act(move)).status).toBe('ACCEPTED');
    expect(lastGame(guest.socket).seq).toBe(seq);
    expect(eventKinds(guest.socket).filter((event) => event.kind === 'MOVED')).toHaveLength(1);
  });

  it('plays for a disconnected player when their turn times out', async () => {
    const { members, disconnect, clock } = await startRoom(2, 30);
    const guest = members[1]!;
    await disconnect(0);
    clock.advance(30_000);
    await guest.socket.until(() => eventKinds(guest.socket).some((event) => event.kind === 'AUTO_PLAYED'));
    expect(eventKinds(guest.socket).find((event) => event.kind === 'AUTO_PLAYED')).toMatchObject({ seat: 0, reason: 'TIMEOUT' });
    expect(eventKinds(guest.socket).some((event) => event.kind === 'ROLLED')).toBe(true);
  });

  it('keeps the match running when a seat expires, and lets the last remaining seat win', async () => {
    const three = await startRoom(3, 0);
    await three.disconnect(2);
    three.clock.advance(10 * MINUTE);
    const watcher = three.members[1]!;
    await watcher.socket.until(() => eventKinds(watcher.socket).some((event) => event.kind === 'SEAT_LEFT'));
    expect(eventKinds(watcher.socket).find((event) => event.kind === 'SEAT_LEFT')).toMatchObject({ seat: 2 });
    expect(viewOf(watcher.socket)).toMatchObject({ seats: expect.arrayContaining([expect.objectContaining({ index: 2, left: true })]) });
    expect(viewOf(watcher.socket).turn.phase).not.toBe('ENDED');

    const two = await startRoom(2, 0);
    await two.disconnect(1);
    two.clock.advance(10 * MINUTE);
    const host = two.members[0]!;
    await host.socket.until(() => host.socket.events().some((event) => event.kind === 'match.ended'));
    expect(viewOf(host.socket)).toMatchObject({ winner: 0 });
    expect(viewOf(host.socket).turn.phase).toBe('ENDED');
  });

  it('leaves the game unchanged when the host role is handed to someone else', async () => {
    const { members } = await startRoom(3, 0);
    const [host, alex, sam] = members as [typeof members[0], typeof members[0], typeof members[0]];
    const before = { seq: lastGame(sam.socket).seq, state: JSON.stringify(stable(viewOf(sam.socket))), messages: games(sam.socket).length };
    expect((await host.socket.act({ type: 'host.transfer', targetParticipantId: alex.id })).status).toBe('ACCEPTED');
    await sam.socket.until(() => sam.socket.events().some((event) => event.kind === 'host.changed'));
    expect(games(sam.socket)).toHaveLength(before.messages);
    expect(lastGame(sam.socket).seq).toBe(before.seq);
    expect(JSON.stringify(stable(viewOf(sam.socket)))).toBe(before.state);
    // The new host plays like anyone else: the first seat is still the only one that may roll.
    expect((await alex.socket.act(roll)).status).toBe('REJECTED');
    expect((await host.socket.act(roll)).status).toBe('ACCEPTED');
  });
});
