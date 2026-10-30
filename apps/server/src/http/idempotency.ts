// A repeated Idempotency-Key replays the original seat; only the request fingerprint is kept, never a credential.
export interface IdempotencyRecord { fingerprint: string; roomId: string; participantId: string; }

export class IdempotencyStore {
  private readonly records = new Map<string, IdempotencyRecord>();
  constructor(private readonly capacity = 1000) {}

  get(scope: string, key: string): IdempotencyRecord | undefined { return this.records.get(`${scope}:${key}`); }

  set(scope: string, key: string, record: IdempotencyRecord): void {
    this.records.set(`${scope}:${key}`, record);
    if (this.records.size > this.capacity) this.records.delete(this.records.keys().next().value!);
  }

  delete(scope: string, key: string): void { this.records.delete(`${scope}:${key}`); }

  deleteRoom(roomId: string): void {
    for (const [id, record] of this.records) if (record.roomId === roomId) this.records.delete(id);
  }
}
