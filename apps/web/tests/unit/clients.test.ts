import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiRequest } from '../../src/platform/api-client';
import { connectRoom } from '../../src/platform/ws-client';

afterEach(() => vi.unstubAllGlobals());

describe('REST client', () => {
  it('sends same-origin credentials and an idempotency key', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('{}', { status: 201 }));
    vi.stubGlobal('fetch', fetch);
    await apiRequest('/api/rooms', { method: 'POST', body: JSON.stringify({ displayName: 'Sam' }) });
    const options = fetch.mock.calls[0]![1] as RequestInit;
    expect(options.credentials).toBe('same-origin');
    const headers = new Headers(options.headers);
    expect(headers.get('Idempotency-Key')).toMatch(/^[a-f0-9-]{36}$/);
    expect(headers.get('Content-Type')).toBe('application/json');
  });
  it('keeps an explicit key for retries and handles empty leave responses', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetch);
    await expect(apiRequest('/api/rooms/room/leave', { method: 'POST', headers: { 'Idempotency-Key': 'same-key' } })).resolves.toBeUndefined();
    expect(new Headers(fetch.mock.calls[0]![1].headers).get('Idempotency-Key')).toBe('same-key');
  });
  it('preserves a safe problem explanation and next step', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: 'ROOM_FULL', detail: 'The room is full.', nextStep: 'Ask the host.' }), { status: 409 })));
    await expect(apiRequest('/api/rooms/join')).rejects.toMatchObject({ status: 409, code: 'ROOM_FULL', message: 'The room is full.', nextStep: 'Ask the host.' });
  });
  it('gives a safe next step on network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('private transport error')));
    await expect(apiRequest('/api/rooms')).rejects.toMatchObject({ code: 'NETWORK_UNAVAILABLE', nextStep: expect.any(String) });
  });
});

describe('WebSocket client', () => {
  class MockSocket extends EventTarget {
    static OPEN = 1;
    static latest: MockSocket;
    readyState = 1;
    sent: unknown[] = [];
    closeCode: number | undefined;
    constructor(readonly url: URL) { super(); MockSocket.latest = this; }
    send(value: string) { this.sent.push(JSON.parse(value)); }
    close(code?: number) { this.closeCode = code; }
    receive(value: unknown) { this.dispatchEvent(new MessageEvent('message', { data: JSON.stringify(value) })); }
  }
  it('requests a single resync when snapshots or versions are missing', () => {
    vi.stubGlobal('WebSocket', MockSocket);
    const onState = vi.fn();
    connectRoom('98cbf5c1-c22c-4da9-bfc6-df56b99430c8', { onState });
    const socket = MockSocket.latest;
    for (const version of [2, 3]) socket.receive({ v: 1, type: 'event', version, kind: 'participant.removed', data: { participantId: 'c03e5f50-d21d-41c5-9537-e335ae4326aa' } });
    expect(socket.sent).toHaveLength(1);
    expect(socket.sent[0]).toMatchObject({ v: 1, type: 'resync', lastVersion: 0 });
    expect(onState.mock.calls[0]![0].needsResync).toBe(true);
    expect(socket.url.searchParams.get('room')).toBe('98cbf5c1-c22c-4da9-bfc6-df56b99430c8');
  });
  it('rejects unknown server message fields', () => {
    vi.stubGlobal('WebSocket', MockSocket);
    connectRoom('room', { onState: vi.fn() });
    MockSocket.latest.receive({ v: 1, type: 'pong', token: 'unexpected' });
    expect(MockSocket.latest.closeCode).toBe(1008);
  });
});