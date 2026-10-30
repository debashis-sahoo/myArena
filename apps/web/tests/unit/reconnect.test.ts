import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ServerMessage } from '@myarena/protocol';
import { MAX_BACKOFF_MS, backoffDelay, createReconnectingConnection, type LostReason, type ReconnectOptions, type SessionProbe } from '../../src/platform/reconnect';

const snapshot = { v: 1, type: 'snapshot' } as unknown as ServerMessage;

function setup(probe: SessionProbe | (() => SessionProbe) = 'ok') {
  type Handlers = Parameters<ReconnectOptions['connect']>[1];
  const links: { handlers: Handlers; open: boolean; sent: unknown[]; closed: boolean }[] = [];
  const statuses: string[] = [];
  const lost: LostReason[] = [];
  const connection = createReconnectingConnection({
    roomId: 'room',
    random: () => 1,
    aliveTimeoutMs: 1000,
    connect: (_roomId, handlers) => {
      const link = { handlers, open: true, sent: [] as unknown[], closed: false };
      links.push(link);
      return { send: (intent) => { link.sent.push(intent); return link.open; }, close: () => { link.closed = true; link.open = false; }, isOpen: () => link.open };
    },
    probe: async () => (typeof probe === 'function' ? probe() : probe),
    handlers: { onState: vi.fn(), onMessage: vi.fn(), onStatus: (status) => statuses.push(status), onLost: (reason) => lost.push(reason) },
  });
  const drop = (index = links.length - 1, code = 1006) => { links[index]!.open = false; links[index]!.handlers.onClose({ code }); };
  return { connection, links, statuses, lost, drop };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('backoff', () => {
  it('grows exponentially with jitter and never exceeds 15 seconds', () => {
    expect(backoffDelay(0, 1)).toBe(500);
    expect(backoffDelay(1, 1)).toBe(1000);
    expect(backoffDelay(0, 0)).toBe(250);
    for (let attempt = 0; attempt < 40; attempt++) {
      for (const random of [0, 0.5, 1]) expect(backoffDelay(attempt, random)).toBeLessThanOrEqual(MAX_BACKOFF_MS);
    }
    expect(backoffDelay(30, 1)).toBe(MAX_BACKOFF_MS);
  });
});

describe('reconnecting connection', () => {
  it('reports connecting, then connected on the first snapshot', () => {
    const { links, statuses } = setup();
    links[0]!.handlers.onMessage(snapshot);
    expect(statuses).toEqual(['connecting', 'connected']);
  });

  it('reconnects after a dropped socket and resets the backoff once a snapshot arrives', async () => {
    const { links, statuses, drop } = setup();
    links[0]!.handlers.onMessage(snapshot);
    drop();
    expect(statuses.at(-1)).toBe('reconnecting');
    await vi.advanceTimersByTimeAsync(499);
    expect(links).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(links).toHaveLength(2);
    links[1]!.handlers.onMessage(snapshot);
    expect(statuses.at(-1)).toBe('connected');
    drop();
    await vi.advanceTimersByTimeAsync(500);
    expect(links).toHaveLength(3);
  });

  it('keeps backing off while the service is unreachable', async () => {
    const { links, drop } = setup('unknown');
    drop();
    await vi.advanceTimersByTimeAsync(500);
    drop();
    await vi.advanceTimersByTimeAsync(999);
    expect(links).toHaveLength(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(links).toHaveLength(3);
  });

  it.each([[4009, 'superseded'], [4010, 'closed'], [4011, 'left'], [4012, 'removed']] as const)('does not reconnect after close code %i', async (code, reason) => {
    const { links, lost, drop } = setup();
    drop(0, code);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(links).toHaveLength(1);
    expect(lost).toEqual([reason]);
  });

  it('stops with an expiry explanation when the seat can no longer be recovered', async () => {
    const { links, lost, drop } = setup('expired');
    drop();
    await vi.advanceTimersByTimeAsync(1000);
    expect(lost).toEqual(['expired']);
    expect(links).toHaveLength(1);
  });

  it('treats a missing credential as an unavailable room', async () => {
    const { lost, drop } = setup('unauthenticated');
    drop();
    await vi.advanceTimersByTimeAsync(1000);
    expect(lost).toEqual(['unavailable']);
  });

  it('reconnects at once when the browser comes back online', async () => {
    const { links, drop } = setup();
    drop();
    window.dispatchEvent(new Event('online'));
    await vi.advanceTimersByTimeAsync(0);
    expect(links).toHaveLength(2);
  });

  it('reconnects at once when the page becomes visible or is shown from the cache', async () => {
    const { links, drop } = setup();
    drop();
    document.dispatchEvent(new Event('visibilitychange'));
    await vi.advanceTimersByTimeAsync(0);
    expect(links).toHaveLength(2);
    drop();
    window.dispatchEvent(new Event('pageshow'));
    await vi.advanceTimersByTimeAsync(0);
    expect(links).toHaveLength(3);
  });

  it('replaces a socket that looks open but never answers after a resume', async () => {
    const { links, statuses } = setup();
    links[0]!.handlers.onMessage(snapshot);
    window.dispatchEvent(new Event('online'));
    expect(links[0]!.sent).toHaveLength(1);
    expect(links[0]!.sent[0]).toMatchObject({ type: 'ping' });
    await vi.advanceTimersByTimeAsync(1000);
    expect(links[0]!.closed).toBe(true);
    expect(statuses.at(-1)).toBe('reconnecting');
    await vi.advanceTimersByTimeAsync(1);
    expect(links).toHaveLength(2);
  });

  it('keeps a healthy socket when the server answers the resume check', async () => {
    const { links } = setup();
    links[0]!.handlers.onMessage(snapshot);
    window.dispatchEvent(new Event('online'));
    links[0]!.handlers.onMessage({ v: 1, type: 'pong' });
    await vi.advanceTimersByTimeAsync(5000);
    expect(links).toHaveLength(1);
    expect(links[0]!.closed).toBe(false);
  });

  it('ignores late events from a replaced socket and stops after dispose', async () => {
    const { links, connection, drop } = setup();
    drop();
    await vi.advanceTimersByTimeAsync(500);
    links[0]!.handlers.onClose({ code: 4012 });
    expect(links).toHaveLength(2);
    connection.dispose();
    drop();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(links).toHaveLength(2);
    expect(connection.send({ v: 1, type: 'ping', clientActionId: crypto.randomUUID() })).toBe(false);
  });
});
