import type { Clock } from '@myarena/game-sdk';

// One pending expiry per disconnected participant; reconnecting or leaving cancels it.
export class RecoveryManager {
  private readonly timers = new Map<string, unknown>();

  constructor(
    private readonly clock: Clock,
    private readonly windowMs: number,
    private readonly expire: (roomId: string, participantId: string) => void,
  ) {}

  start(roomId: string, participantId: string): void {
    this.clear(participantId);
    this.timers.set(participantId, this.clock.setTimeout(() => {
      this.timers.delete(participantId);
      this.expire(roomId, participantId);
    }, this.windowMs));
  }

  clear(participantId: string): void {
    const timer = this.timers.get(participantId);
    if (timer === undefined) return;
    this.clock.clearTimeout(timer);
    this.timers.delete(participantId);
  }

  get pending(): number { return this.timers.size; }
}
