import type { Ack, ClientIntent } from '@myarena/protocol';

type DistributiveOmit<Type, Key extends PropertyKey> = Type extends unknown ? Omit<Type, Key> : never;
export type IntentDraft = DistributiveOmit<ClientIntent, 'v' | 'clientActionId'>;

interface Pending { intent: ClientIntent; resolve(ack: Ack): void; }

// Every intent carries a clientActionId; unanswered ones stay pending so they can be resent after a reconnect.
export function createIntentQueue(send: (intent: ClientIntent) => boolean) {
  const pending = new Map<string, Pending>();
  return {
    submit(draft: IntentDraft): Promise<Ack> {
      const intent = { ...draft, v: 1, clientActionId: crypto.randomUUID() } as ClientIntent;
      return new Promise<Ack>((resolve) => {
        pending.set(intent.clientActionId, { intent, resolve });
        send(intent);
      });
    },
    handleAck(ack: Ack): void {
      const entry = pending.get(ack.clientActionId);
      if (!entry) return;
      pending.delete(ack.clientActionId);
      entry.resolve(ack);
    },
    resendPending(): void {
      for (const { intent } of pending.values()) send(intent);
    },
    get pendingCount(): number { return pending.size; },
  };
}
export type IntentQueue = ReturnType<typeof createIntentQueue>;
