import { describe, expect, it } from 'vitest';
import { pickSuccessor } from '../../src/rooms/handoff.js';
import { RoomService } from '../../src/rooms/room-service.js';
import { TestClock, testConfig } from '../integration/helpers.js';

function room(players: { name: string; joinedAt: number; connection: 'CONNECTED' | 'DISCONNECTED' }[]) {
  const rooms = new RoomService({ config: testConfig(), clock: new TestClock() });
  const created = rooms.createRoom('Host');
  const joined = players.map((player) => {
    const entry = rooms.joinRoom(created.room.invitation.code, player.name);
    entry.participant.joinedAt = player.joinedAt;
    entry.participant.connection = player.connection;
    return entry;
  });
  return { rooms, created, joined };
}

describe('successor ordering', () => {
  it('prefers connected seat holders, then the earliest to join', () => {
    const { created, joined } = room([
      { name: 'Early offline', joinedAt: 1, connection: 'DISCONNECTED' },
      { name: 'Late online', joinedAt: 9, connection: 'CONNECTED' },
      { name: 'Early online', joinedAt: 3, connection: 'CONNECTED' },
    ]);
    const candidates = created.room.participants.filter((member) => member.role !== 'HOST');
    expect(pickSuccessor(candidates)!.displayName).toBe('Early online');
    expect(pickSuccessor(candidates.filter((member) => member.connection === 'DISCONNECTED'))!.displayName).toBe('Early offline');
    expect(joined).toHaveLength(3);
  });

  it('falls back to a disconnected seat holder when nobody is connected', () => {
    const { created } = room([
      { name: 'B', joinedAt: 5, connection: 'DISCONNECTED' },
      { name: 'A', joinedAt: 2, connection: 'DISCONNECTED' },
    ]);
    expect(pickSuccessor(created.room.participants.filter((member) => member.role !== 'HOST'))!.displayName).toBe('A');
  });

  it('keeps list order for equal join times and returns nothing without candidates', () => {
    const { created } = room([
      { name: 'First', joinedAt: 4, connection: 'CONNECTED' },
      { name: 'Second', joinedAt: 4, connection: 'CONNECTED' },
    ]);
    expect(pickSuccessor(created.room.participants.filter((member) => member.role !== 'HOST'))!.displayName).toBe('First');
    expect(pickSuccessor([])).toBeUndefined();
  });
});

describe('host loss through the service', () => {
  it('hands the role to the preferred successor and keeps exactly one host', () => {
    const { rooms, created } = room([
      { name: 'Offline', joinedAt: 1, connection: 'DISCONNECTED' },
      { name: 'Online', joinedAt: 2, connection: 'CONNECTED' },
    ]);
    const events: string[] = [];
    rooms.publish = (_roomId, event) => events.push(event.kind);
    rooms.leaveRoom(created.room.id, created.token);
    expect(events).toEqual(['participant.left', 'host.changed']);
    expect(created.room.participants.map((member) => [member.displayName, member.role])).toEqual([['Offline', 'PLAYER'], ['Online', 'HOST']]);
  });

  it('closes the room when no seat holder is left to take over', () => {
    const { rooms, created } = room([]);
    const closed: string[] = [];
    rooms.onRoomClosed = (roomId) => closed.push(roomId);
    rooms.leaveRoom(created.room.id, created.token);
    expect(rooms.store.size).toBe(0);
    expect(closed).toEqual([created.room.id]);
  });
});
