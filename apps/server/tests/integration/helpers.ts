import { randomUUID } from 'node:crypto';
import { WebSocket } from 'ws';
import { CookieJar } from 'tough-cookie';
import type { Clock } from '@myarena/game-sdk';
import { serverMessageSchema, type ServerMessage } from '@myarena/protocol';
import { buildApp, type AppOptions } from '../../src/http/app.js';
import { parseEnv } from '../../src/config/env.js';
import { RoomService } from '../../src/rooms/room-service.js';
import type { GameCatalog } from '../../src/rooms/catalog.js';

export const testOrigin = 'http://localhost:3000';
export const testConfig = (overrides: Record<string, string> = {}) =>
  parseEnv({ NODE_ENV: 'test', ALLOWED_ORIGINS: testOrigin, ...overrides });

export class TestClock implements Clock {
  private time = 0;
  private sequence = 0;
  private readonly timers = new Map<number, { at: number; callback: () => void }>();
  now(): number { return this.time; }
  setTimeout(callback: () => void, delay: number): number {
    const handle = ++this.sequence;
    this.timers.set(handle, { at: this.time + delay, callback });
    return handle;
  }
  clearTimeout(handle: unknown): void { this.timers.delete(handle as number); }
  advance(milliseconds: number): void {
    const target = this.time + milliseconds;
    for (;;) {
      const next = Array.from(this.timers.entries()).sort((left, right) => left[1].at - right[1].at)[0];
      if (!next || next[1].at > target) break;
      this.time = next[1].at;
      this.timers.delete(next[0]);
      next[1].callback();
    }
    this.time = target;
  }
}

export class TestSocket {
  readonly messages: ServerMessage[] = [];
  // Never consumed, so tests can inspect everything a client received in order.
  readonly log: ServerMessage[] = [];
  readonly closed: Promise<number>;
  private readonly listeners = new Set<() => void>();
  constructor(readonly raw: WebSocket) {
    this.closed = new Promise((resolve) => raw.once('close', (code) => resolve(code)));
    raw.on('message', (data) => {
      const message = serverMessageSchema.parse(JSON.parse(data.toString()));
      this.messages.push(message);
      this.log.push(message);
      for (const listener of this.listeners) listener();
    });
  }
  events() {
    return this.log.flatMap((message) => (message.type === 'event' ? [message] : []));
  }
  async until(condition: () => boolean): Promise<void> {
    const deadline = Date.now() + 3000;
    while (!condition()) {
      if (Date.now() > deadline) throw new Error('Condition was not met in time.');
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
  }
  async act(intent: Record<string, unknown>) {
    const clientActionId = (intent.clientActionId as string | undefined) ?? randomUUID();
    this.send({ v: 1, clientActionId, ...intent });
    const ack = await this.waitFor((message) => message.type === 'ack' && message.clientActionId === clientActionId);
    return ack as Extract<ServerMessage, { type: 'ack' }>;
  }
  waitFor(predicate: (message: ServerMessage) => boolean): Promise<ServerMessage> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => { this.listeners.delete(check); reject(new Error('Expected WebSocket message was not received.')); }, 3000);
      const check = () => {
        const index = this.messages.findIndex(predicate);
        if (index < 0) return;
        clearTimeout(timeout);
        this.listeners.delete(check);
        resolve(this.messages.splice(index, 1)[0]!);
      };
      this.listeners.add(check);
      check();
    });
  }
  send(value: unknown): void { this.raw.send(JSON.stringify(value)); }
  close(): void { this.raw.close(); }
}

export async function startTestServer(options: AppOptions & { games?: GameCatalog; clock?: Clock; heartbeatClock?: Clock } = {}) {
  const origin = testOrigin;
  const config = options.config ?? testConfig();
  const rooms = options.rooms ?? new RoomService({
    config, ...(options.games ? { games: options.games } : {}), ...(options.clock ? { clock: options.clock } : {}),
  });
  const gateway = { ...options.gateway, ...(options.heartbeatClock ? { clock: options.heartbeatClock } : {}) };
  const app = await buildApp({
    config, rooms, gateway, ...(options.logStream ? { logStream: options.logStream } : { logger: false as const }),
  });
  const baseUrl = await app.listen({ port: 0, host: '127.0.0.1' });
  const sockets: TestSocket[] = [];
  const client = () => {
    const jar = new CookieJar();
    return {
      jar,
      async request(path: string, options: RequestInit = {}) {
        const headers = new Headers(options.headers);
        headers.set('Origin', origin);
        if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
        const cookies = await jar.getCookieString(baseUrl);
        if (cookies) headers.set('Cookie', cookies);
        const response = await fetch(`${baseUrl}${path}`, { ...options, headers });
        for (const value of response.headers.getSetCookie()) await jar.setCookie(value, baseUrl);
        return response;
      },
      async connect(roomId: string, connectOptions: { autoPong?: boolean } = {}) {
        const raw = new WebSocket(`${baseUrl.replace('http:', 'ws:')}/ws?room=${roomId}`, {
          origin, headers: { Cookie: await jar.getCookieString(baseUrl) }, ...connectOptions,
        });
        const socket = new TestSocket(raw);
        sockets.push(socket);
        await new Promise<void>((resolve, reject) => { raw.once('open', resolve); raw.once('error', reject); });
        return socket;
      },
    };
  };
  return {
    app, baseUrl, origin, client, rooms,
    async close() { for (const socket of sockets) socket.raw.terminate(); await app.close(); },
  };
}