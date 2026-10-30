import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { ClientIntent } from '@myarena/protocol';
import { GameRegistry } from '../../src/games/registry.js';
import { createStubGame } from '../../src/games/stub-game.js';
import type { Participant } from '../../src/rooms/participant.js';
import { RoomService } from '../../src/rooms/room-service.js';
import { TestClock, testConfig } from './helpers.js';

const NOBODY = '98cbf5c1-c22c-4da9-bfc6-df56b99430c8';
const intent = (type: string, extra: object = {}) => ({ v: 1, clientActionId: randomUUID(), type, ...extra }) as unknown as ClientIntent;

function startedMatch() {
  const clock = new TestClock();
  const rooms = new RoomService({ config: testConfig(), clock, games: new GameRegistry([createStubGame()]) });
  const host = rooms.createRoom('Host');
  const alex = rooms.joinRoom(host.room.invitation.code, 'Alex');
  const act = (actor: Participant, type: string, extra?: object) => rooms.perform(host.room, actor, intent(type, extra));
  const move = (id: string) => rooms.submitGameAction(host.room.id, id, { type: 'move' });
  act(host.participant, 'game.select', { gameId: 'test-stub' });
  act(alex.participant, 'ready.set', { ready: true });
  return { rooms, clock, host, alex, act, move };
}

describe('the host is subject to game rules', () => {
  it('judges host and player actions by the same rule', () => {
    const { rooms, host, alex, act, move } = startedMatch();
    expect(move(host.participant.id)).toEqual({ accepted: false, reason: 'NOT_IN_MATCH' });
    expect(act(host.participant, 'match.start').ok).toBe(true);

    expect(move(host.participant.id)).toEqual({ accepted: true });
    expect(move(host.participant.id)).toEqual({ accepted: false, reason: 'ALREADY_MOVED' });
    expect(move(alex.participant.id)).toEqual({ accepted: true });
    expect(move(alex.participant.id)).toEqual({ accepted: false, reason: 'ALREADY_MOVED' });
    expect(move(NOBODY)).toEqual({ accepted: false, reason: 'NOT_IN_MATCH' });
    expect(rooms.store.size).toBe(1);
  });

  it('does not change what a participant may do when roles swap', () => {
    const { host, alex, act, move } = startedMatch();
    act(host.participant, 'match.start');
    expect(move(alex.participant.id)).toEqual({ accepted: true });
    act(host.participant, 'host.transfer', { targetParticipantId: alex.participant.id });
    expect(alex.participant.role).toBe('HOST');
    expect(move(alex.participant.id)).toEqual({ accepted: false, reason: 'ALREADY_MOVED' });
    expect(move(host.participant.id)).toEqual({ accepted: true });
    expect(move(host.participant.id)).toEqual({ accepted: false, reason: 'ALREADY_MOVED' });
  });

  it('gives management authority no way around the rules once the match is over', () => {
    const { clock, host, act, move } = startedMatch();
    act(host.participant, 'match.start');
    clock.advance(30_000);
    expect(move(host.participant.id)).toEqual({ accepted: false, reason: 'NOT_IN_MATCH' });
    act(host.participant, 'match.rematch');
    expect(move(host.participant.id)).toEqual({ accepted: true });
  });

  it('never reads the actor role when routing a game action', () => {
    const source = readFileSync(new URL('../../src/rooms/match.ts', import.meta.url), 'utf8');
    const body = source.slice(source.indexOf('submitAction('), source.indexOf('abort('));
    expect(body).not.toMatch(/role|HOST/);
  });
});
