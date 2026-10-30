const WINDOW_MS = 10_000;

export class IntentRateLimiter {
  private readonly intents = new Map<string, number[]>();
  private readonly chats = new Map<string, number[]>();
  constructor(private readonly limits = { intents: 20, chats: 5 }) {}

  allow(participantId: string, isChat: boolean, now: number): boolean {
    const intents = this.recent(this.intents, participantId, now);
    const chats = this.recent(this.chats, participantId, now);
    if (intents.length >= this.limits.intents || (isChat && chats.length >= this.limits.chats)) return false;
    intents.push(now);
    if (isChat) chats.push(now);
    return true;
  }

  forget(participantId: string): void {
    this.intents.delete(participantId);
    this.chats.delete(participantId);
  }

  private recent(history: Map<string, number[]>, participantId: string, now: number): number[] {
    const fresh = (history.get(participantId) ?? []).filter((at) => now - at < WINDOW_MS);
    history.set(participantId, fresh);
    return fresh;
  }
}
