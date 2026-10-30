import type { RoomStore, StoredRoom } from './room-store.js';

export class MemoryRoomStore<Room extends StoredRoom = StoredRoom> implements RoomStore<Room> {
  private readonly rooms = new Map<string, Room>();
  get size(): number { return this.rooms.size; }
  get(roomId: string): Room | undefined { return this.rooms.get(roomId); }
  byInvitation(code: string): Room | undefined {
    return Array.from(this.rooms.values()).find((room) => room.invitation.status === 'ACTIVE' && room.invitation.code === code);
  }
  set(room: Room): void { this.rooms.set(room.id, room); }
  delete(roomId: string): void { this.rooms.delete(roomId); }
  values(): IterableIterator<Room> { return this.rooms.values(); }
}