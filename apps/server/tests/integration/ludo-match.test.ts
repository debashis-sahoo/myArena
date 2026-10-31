import { describe, expect, it } from 'vitest';
import type { GameMessage } from '@myarena/protocol';
import type { LudoMatchView } from '@myarena/ludo';
import { GameRegistry } from '../../src/games/registry.js';
import { cryptoDice, scriptedDice, type DiceSource } from '../../src/games/ludo/dice.js';
import { createLudoGame } from '../../src/games/ludo/ludo-game.js';
import { TestClock, startTestServer, type TestSocket } from './helpers.js';

const isSnapshot = (message: { type: string }) => message.type === 'snapshot';
const names = ['Host', 'Alex', 'Sam', 'Pat'];
const games = (socket: TestSocket) => socket.log.filter((message): message is GameMessage => message.type === 'game');
const lastGame = (socket: TestSocket) => games(socket).at(-1)!;
const viewOf = (socket: TestSocket) => lastGame(socket).state as unknown as LudoMatchView;

async function startLudoRoom(count: number, dice: DiceSource = cryptoDice(), limit = count) {
  const clock = new TestClock();
  const server = await startTestServer({ clock, games: new GameRegistry([createLudoGame({ dice })]) });
  const hostClient = server.client();
  const created = await (await hostClient.request('/api/rooms', { method: 'POST', body: JSON.stringify({ displayName: 'Host', gameId: 'ludo', maxParticipants: limit }) })).json();
  const members = [{ client: hostClient, socket: await hostClient.connect(created.roomId), id: created.participantId as string }];
  await members[0]!.socket.waitFor(isSnapshot);
  for (const displayName of names.slice(1, count)) {
    const client = server.client();
    const joined = await (await client.request('/api/rooms/join', { method: 'POST', body: JSON.stringify({ code: created.invitation.code, displayName }) })).json();
    const socket = await client.connect(created.roomId);
    await socket.waitFor(isSnapshot);
    members.push({ client, socket, id: joined.participantId as string });
  }
  for (const member of members.slice(1)) expect((await member.socket.act({ type: 'ready.set', ready: true })).status).toBe('ACCEPTED');
  expect((await members[0]!.socket.act({ type: 'match.start' })).status).toBe('ACCEPTED');
  for (const member of members) await member.socket.until(() => games(member.socket).length >= 1);
  const act = (member: (typeof members)[number], action: unknown) => member.socket.act({ type: 'game.action', action });
  const seatOwner = (seat: number) => members.find((member) => member.id === viewOf(members[0]!.socket).seats[seat]!.participantId)!;
  const waitForNext = async (since: number) => members[0]!.socket.until(() => lastGame(members[0]!.socket).seq > since);
  return { clock, members, act, seatOwner, waitForNext, roomId: created.roomId as string, server, code: created.invitation.code as string };
}

describe('a Ludo match over real connections', () => {
  it('plays a full two-player match to a winner, deciding every roll on the server', async () => {
    const { clock, members, act, seatOwner, waitForNext } = await startLudoRoom(2);
    const host = members[0]!;
    for (let turns = 0; viewOf(host.socket).turn.phase !== 'ENDED'; turns += 1) {
      expect(turns).toBeLessThan(20_000);
      const view = viewOf(host.socket);
      const actor = seatOwner(view.turn.seat!);
      let seq = lastGame(host.socket).seq;
      if (view.turn.phase === 'ROLL') {
        expect((await act(actor, { type: 'roll' })).status).toBe('ACCEPTED');
        await waitForNext(seq);
        seq = lastGame(host.socket).seq;
        const rolled = viewOf(host.socket);
        expect(rolled.turn.dice).toBeGreaterThanOrEqual(1);
        expect(rolled.turn.dice).toBeLessThanOrEqual(6);
        clock.advance(2400);
        if (rolled.turn.legalPawns.length === 0) { clock.advance(1200); await waitForNext(seq); continue; }
        const pawn = rolled.turn.legalPawns[turns % rolled.turn.legalPawns.length]!;
        expect((await act(actor, { type: 'move', payload: { pawn } })).status).toBe('ACCEPTED');
        await waitForNext(seq);
      }
    }
    const final = viewOf(host.socket);
    expect(final.winner).not.toBeNull();
    expect(final.seats[final.winner!]!.home).toBe(4);
    await host.socket.until(() => host.socket.events().some((event) => event.kind === 'match.ended'));
    for (const member of members) await member.socket.until(() => lastGame(member.socket).seq === lastGame(host.socket).seq);
    expect(viewOf(members[1]!.socket).winner).toBe(final.winner);

    // A rematch is a new match: new match id, sequence from 1, colours again by join order, a fresh first seat.
    const finishedMatch = lastGame(host.socket).matchId;
    expect((await host.socket.act({ type: 'match.rematch' })).status).toBe('ACCEPTED');
    await host.socket.until(() => lastGame(host.socket).matchId !== finishedMatch);
    expect(lastGame(host.socket).seq).toBe(1);
    const next = viewOf(host.socket);
    expect(next.seats.map((seat) => seat.color)).toEqual(['RED', 'YELLOW']);
    expect(next.seats.every((seat) => seat.pawns.every((step) => step === -1))).toBe(true);
    expect(next).toMatchObject({ winner: null, turn: { phase: 'ROLL', dice: null } });
  }, 60_000);

  it('refuses a roll or move out of turn and any unknown action, leaving the match unchanged', async () => {
    const { members, act, seatOwner } = await startLudoRoom(3, scriptedDice([6]));
    const host = members[0]!;
    const view = viewOf(host.socket);
    const current = seatOwner(view.turn.seat!);
    const other = members.find((member) => member !== current)!;
    const seq = lastGame(host.socket).seq;
    expect(await act(other, { type: 'roll' })).toMatchObject({ status: 'REJECTED', code: 'GAME_ACTION_REJECTED', detail: 'It is not your turn.' });
    expect(await act(other, { type: 'move', payload: { pawn: 0 } })).toMatchObject({ status: 'REJECTED', code: 'GAME_ACTION_REJECTED' });
    expect(await act(current, { type: 'move', payload: { pawn: 0 } })).toMatchObject({ status: 'REJECTED', detail: 'That pawn cannot move with this roll.' });
    expect(await act(current, { type: 'roll', payload: { value: 6 } })).toMatchObject({ status: 'REJECTED', detail: 'That action is not part of Ludo.' });
    expect(await act(current, { type: 'win' })).toMatchObject({ status: 'REJECTED' });
    expect(lastGame(host.socket).seq).toBe(seq);
    expect(viewOf(host.socket)).toEqual(view);
  });

  it('holds the host to the same rules as every player', async () => {
    const { members, act, seatOwner } = await startLudoRoom(2, scriptedDice([6]));
    const host = members[0]!;
    const view = viewOf(host.socket);
    const hostIsCurrent = seatOwner(view.turn.seat!) === host;
    const notCurrent = hostIsCurrent ? members[1]! : host;
    expect(await act(notCurrent, { type: 'roll' })).toMatchObject({ status: 'REJECTED', detail: 'It is not your turn.' });
  });

  it('gives every member the same board, each with their own seat', async () => {
    const { members } = await startLudoRoom(4, scriptedDice([6]));
    const views = members.map((member) => viewOf(member.socket));
    views.forEach((view, index) => {
      expect(view.you).toBe(index);
      expect(view.seats).toEqual(views[0]!.seats);
      expect(view.seats.map((seat) => seat.color)).toEqual(['RED', 'GREEN', 'YELLOW', 'BLUE']);
    });
  });

  it('uses Red and Yellow for 2 players and Red, Green and Yellow for 3', async () => {
    const two = await startLudoRoom(2);
    expect(viewOf(two.members[0]!.socket).seats.map((seat) => seat.color)).toEqual(['RED', 'YELLOW']);
    const three = await startLudoRoom(3);
    expect(viewOf(three.members[0]!.socket).seats.map((seat) => seat.color)).toEqual(['RED', 'GREEN', 'YELLOW']);
  });

  it('shows a member who joined after the start only a waiting marker and refuses their actions', async () => {
    const { members, act, server, code, roomId } = await startLudoRoom(3, scriptedDice([6]), 4);
    const client = server.client();
    const joined = await (await client.request('/api/rooms/join', { method: 'POST', body: JSON.stringify({ code, displayName: 'Late' }) })).json();
    const socket = await client.connect(roomId);
    const snapshot = await socket.waitFor(isSnapshot);
    expect(snapshot).toMatchObject({ game: { state: { kind: 'WAITING' } } });
    const late = { client, socket, id: joined.participantId as string };
    expect(await act(late, { type: 'roll' })).toMatchObject({ status: 'REJECTED', code: 'GAME_ACTION_REJECTED', detail: 'You are not playing in this match.' });
    expect(viewOf(members[0]!.socket).seats).toHaveLength(3);
    expect(viewOf(members[0]!.socket).seats.map((seat) => seat.participantId)).not.toContain(late.id);
  });
});
