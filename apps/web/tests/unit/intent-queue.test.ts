import { describe, expect, it, vi } from 'vitest';
import type { Ack, ClientIntent } from '@myarena/protocol';
import { createIntentQueue } from '../../src/platform/intent-queue';

const accepted = (clientActionId: string): Ack => ({ v: 1, type: 'ack', clientActionId, status: 'ACCEPTED', version: 3 });

describe('intent queue', () => {
  it('stamps every intent with a fresh clientActionId and resolves on its ack', async () => {
    const sent: ClientIntent[] = [];
    const queue = createIntentQueue((intent) => { sent.push(intent); return true; });
    const first = queue.submit({ type: 'ready.set', ready: true });
    const second = queue.submit({ type: 'ready.set', ready: false });
    expect(sent[0]).toMatchObject({ v: 1, type: 'ready.set', ready: true });
    expect(sent[0]!.clientActionId).not.toBe(sent[1]!.clientActionId);
    expect(queue.pendingCount).toBe(2);
    queue.handleAck(accepted(sent[1]!.clientActionId));
    expect((await second).status).toBe('ACCEPTED');
    expect(queue.pendingCount).toBe(1);
    queue.handleAck(accepted(sent[0]!.clientActionId));
    expect((await first).version).toBe(3);
  });

  it('surfaces a rejection with its next step', async () => {
    const sent: ClientIntent[] = [];
    const queue = createIntentQueue((intent) => { sent.push(intent); return true; });
    const result = queue.submit({ type: 'match.start' });
    queue.handleAck({ v: 1, type: 'ack', clientActionId: sent[0]!.clientActionId, status: 'REJECTED', version: 1, code: 'NO_GAME_SELECTED', detail: 'No game is selected.', nextStep: 'Select a game.' });
    expect(await result).toMatchObject({ status: 'REJECTED', nextStep: 'Select a game.' });
  });

  it('keeps unsent intents pending and resends the same ids later', () => {
    const send = vi.fn().mockReturnValueOnce(false).mockReturnValue(true);
    const queue = createIntentQueue(send);
    void queue.submit({ type: 'chat.send', text: 'hi' });
    queue.resendPending();
    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls[1]![0].clientActionId).toBe(send.mock.calls[0]![0].clientActionId);
  });

  it('ignores acks it does not know', () => {
    const queue = createIntentQueue(() => true);
    expect(() => queue.handleAck(accepted(crypto.randomUUID()))).not.toThrow();
  });
});
