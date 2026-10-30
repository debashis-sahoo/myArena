import type { Ack } from '@myarena/protocol';

export const ACTION_LOG_LIMIT = 100;
export const ACTION_LOG_TTL_MS = 10 * 60 * 1000;

// Remembers recent results so a resent intent gets the original ack instead of a second effect.
export class ActionLog {
  private readonly entries = new Map<string, { ack: Ack; at: number }>();

  get(clientActionId: string, now: number): Ack | undefined {
    this.prune(now);
    return this.entries.get(clientActionId)?.ack;
  }

  record(clientActionId: string, ack: Ack, now: number): void {
    this.prune(now);
    this.entries.set(clientActionId, { ack, at: now });
    while (this.entries.size > ACTION_LOG_LIMIT) this.entries.delete(this.entries.keys().next().value!);
  }

  private prune(now: number): void {
    for (const [id, entry] of this.entries) {
      if (now - entry.at < ACTION_LOG_TTL_MS) break;
      this.entries.delete(id);
    }
  }
}
