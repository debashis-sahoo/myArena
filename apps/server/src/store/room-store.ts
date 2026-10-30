export interface StoredRoom {
  id: string;
  invitation: { code: string; status: 'ACTIVE' | 'REVOKED' };
}

export interface RoomStore<Room extends StoredRoom> {
  readonly size: number;
  get(roomId: string): Room | undefined;
  byInvitation(code: string): Room | undefined;
  set(room: Room): void;
  delete(roomId: string): void;
  values(): IterableIterator<Room>;
}