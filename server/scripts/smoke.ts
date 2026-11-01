/**
 * Headless two-client smoke check for the room engine (research R13).
 *
 *   npm run build -w shared -w server && npm run smoke
 *   npm run smoke -- --rooms 50          # optional load mode (SC-009)
 *
 * By default it starts the built server on a free port with short reconnect and
 * cooldown windows. Set SMOKE_URL to test an already running server instead
 * (then those windows are whatever that server uses; set SMOKE_WINDOW_MS to match).
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { createServer } from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { io as connectClient, type Socket } from 'socket.io-client';
import {
  EVENTS,
  type Ack,
  type ChatMessage,
  type ClosedReason,
  type GuestInfo,
  type JoinedData,
  type RoomState,
} from '@myarena/shared';

const WINDOW_MS = Number(process.env.SMOKE_WINDOW_MS ?? 3000);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// ---------- tiny helpers ----------
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

let ipCounter = 1;
let hostViolations = 0;

interface Client {
  socket: Socket;
  guest: GuestInfo;
  last?: RoomState;
  playerId?: string;
  chat: ChatMessage[];
  closed: ClosedReason[];
  removed: number[];
}

function newGuest(name: string): GuestInfo {
  return { guestId: randomUUID(), displayName: name, avatar: 'fox' };
}

async function connect(url: string, name: string, guest = newGuest(name)): Promise<Client> {
  // A unique forwarded IP per client keeps per-IP limits from affecting the test.
  const n = ipCounter++;
  const socket = connectClient(url, {
    transports: ['websocket'],
    reconnection: false,
    extraHeaders: { 'x-forwarded-for': `10.${(n >> 16) & 255}.${(n >> 8) & 255}.${n & 255}` },
  });
  const client: Client = { socket, guest, chat: [], closed: [], removed: [] };
  socket.on(EVENTS.ROOM_STATE, (state: RoomState) => {
    client.last = state;
    const hosts = state.seats.filter((s) => s.occupant?.isHost).length;
    const hostOk = state.seats.some((s) => s.occupant?.playerId === state.hostPlayerId && s.occupant.isHost);
    if (hosts !== 1 || !hostOk) hostViolations++;
  });
  socket.on(EVENTS.CHAT_MESSAGE, (m: ChatMessage) => client.chat.push(m));
  socket.on(EVENTS.ROOM_CLOSED, (d: { reason: ClosedReason }) => client.closed.push(d.reason));
  socket.on(EVENTS.PLAYER_REMOVED, (d: { cooldownMs: number }) => client.removed.push(d.cooldownMs));
  await new Promise<void>((resolve, reject) => {
    socket.once('connect', () => resolve());
    socket.once('connect_error', (e) => reject(e));
  });
  return client;
}

function emit<T = unknown>(c: Client, event: string, payload: object = {}): Promise<Ack<T>> {
  return new Promise((resolve, reject) => {
    c.socket.timeout(5000).emit(event, payload, (err: Error | null, res: Ack<T>) => (err ? reject(err) : resolve(res)));
  });
}

async function until<T>(what: string, fn: () => T | undefined | false, ms = 3000): Promise<T> {
  const start = Date.now();
  for (;;) {
    const v = fn();
    if (v) return v;
    if (Date.now() - start > ms) throw new Error(`timed out waiting for: ${what}`);
    await sleep(20);
  }
}

function ok<T>(res: Ack<T>): T {
  if (!res.ok) throw new Error(`expected ok, got ${res.error.code}: ${res.error.message}`);
  return res.data;
}

function fail(res: Ack<unknown>, code: string): void {
  if (res.ok) throw new Error(`expected ${code}, got ok`);
  if (res.error.code !== code) throw new Error(`expected ${code}, got ${res.error.code}`);
}

function assert(cond: unknown, message: string): void {
  if (!cond) throw new Error(message);
}

async function createOnline(url: string, name = 'Host'): Promise<{ host: Client; code: string; joined: JoinedData }> {
  const host = await connect(url, name);
  const joined = ok(await emit<JoinedData>(host, EVENTS.ROOM_CREATE, { gameId: 'ludo', mode: 'online', guest: host.guest }));
  host.last = joined.room;
  host.playerId = joined.you.playerId;
  return { host, code: joined.room.roomId, joined };
}

async function joinRoom(url: string, code: string, name: string, guest?: GuestInfo) {
  const c = await connect(url, name, guest);
  const res = await emit<JoinedData>(c, EVENTS.ROOM_JOIN, { gameId: 'ludo', roomId: code, guest: c.guest });
  return { c, res };
}

function closeAll(...clients: Client[]): void {
  for (const c of clients) c.socket.close();
}

// ---------- scenarios ----------
type Scenario = [name: string, run: (url: string) => Promise<void>];

const scenarios: Scenario[] = [
  [
    'health route reports ok',
    async (url) => {
      const res = await fetch(`${url}/healthz`);
      const body = (await res.json()) as { status: string };
      assert(res.status === 200 && body.status === 'ok', `healthz ${res.status} ${JSON.stringify(body)}`);
    },
  ],
  [
    'create: unique code, invite path, single host, default capacity',
    async (url) => {
      const a = await createOnline(url);
      const b = await createOnline(url);
      assert(/^[2-9A-HJKMNP-Z]{8}$/.test(a.code), `bad room code ${a.code}`);
      assert(a.code !== b.code, 'room codes must differ');
      assert(a.joined.invitePath === `/room/ludo/${a.code}`, `invitePath ${a.joined.invitePath}`);
      assert(a.joined.room.capacity === 4 && a.joined.room.inviteEnabled, 'capacity/invite');
      assert(a.joined.room.hostPlayerId === a.joined.you.playerId, 'creator must be host');
      assert(a.joined.room.seats.filter((s) => s.occupant?.isHost).length === 1, 'exactly one host');
      closeAll(a.host, b.host);
    },
  ],
  [
    'join: guest appears in host lobby; chat both ways; chat validation and rate limit',
    async (url) => {
      const { host, code } = await createOnline(url);
      const t0 = Date.now();
      const { c: guest, res } = await joinRoom(url, code, 'Guest');
      const data = ok(res);
      assert(data.room.seats.filter((s) => s.occupant).length === 2, 'guest should be seated');
      await until('host sees guest', () => host.last?.seats.filter((s) => s.occupant).length === 2);
      assert(Date.now() - t0 < 2000, 'presence took over 2 s');
      assert(data.chat.some((m) => m.systemCode === 'joined'), 'history should include join announcement');

      const t1 = Date.now();
      ok(await emit(guest, EVENTS.CHAT_SEND, { text: 'hello host' }));
      await until('host receives chat', () => host.chat.find((m) => m.text === 'hello host'));
      assert(Date.now() - t1 < 1000, 'chat took over 1 s');
      ok(await emit(host, EVENTS.CHAT_SEND, { text: '<img src=x onerror=alert(1)>' }));
      const raw = await until('guest receives chat', () => guest.chat.find((m) => m.kind === 'player' && m.text.startsWith('<img')));
      assert(raw.text === '<img src=x onerror=alert(1)>', 'text must be stored verbatim as plain text');

      fail(await emit(guest, EVENTS.CHAT_SEND, { text: '   ' }), 'INVALID_PAYLOAD');
      fail(await emit(guest, EVENTS.CHAT_SEND, { text: 'x'.repeat(501) }), 'INVALID_PAYLOAD');
      let limited = 0;
      for (let i = 0; i < 12; i++) {
        const r = await emit(guest, EVENTS.CHAT_SEND, { text: `burst ${i}` });
        if (!r.ok && r.error.code === 'RATE_LIMITED') limited++;
      }
      assert(limited > 0, 'rapid chat should be rate limited');
      closeAll(host, guest);
    },
  ],
  [
    'host-only actions are rejected for guests',
    async (url) => {
      const { host, code } = await createOnline(url);
      const { c: guest } = await joinRoom(url, code, 'Guest');
      await until('host sees guest', () => host.last?.seats.filter((s) => s.occupant).length === 2);
      fail(await emit(guest, EVENTS.ROOM_SET_CAPACITY, { capacity: 3 }), 'NOT_HOST');
      fail(await emit(guest, EVENTS.ROOM_START, {}), 'NOT_HOST');
      fail(await emit(guest, EVENTS.ROOM_KICK, { playerId: host.playerId }), 'NOT_HOST');
      closeAll(host, guest);
    },
  ],
  [
    'capacity bounds, full room, start rules, locked lobby',
    async (url) => {
      const solo = await createOnline(url, 'Solo');
      fail(await emit(solo.host, EVENTS.ROOM_START, {}), 'NOT_ENOUGH_PLAYERS');
      fail(await emit(solo.host, EVENTS.ROOM_SET_CAPACITY, { capacity: 5 }), 'CAPACITY_OUT_OF_RANGE');
      fail(await emit(solo.host, EVENTS.ROOM_SET_CAPACITY, { capacity: 1 }), 'CAPACITY_OUT_OF_RANGE');
      closeAll(solo.host);

      const { host, code } = await createOnline(url);
      ok(await emit(host, EVENTS.ROOM_SET_CAPACITY, { capacity: 3 }));
      assert(host.last?.capacity === 3 || (await until('capacity 3', () => host.last?.capacity === 3)), 'capacity 3');
      const g1 = await joinRoom(url, code, 'G1');
      const g2 = await joinRoom(url, code, 'G2');
      ok(g1.res);
      ok(g2.res);
      fail(await emit(host, EVENTS.ROOM_SET_CAPACITY, { capacity: 2 }), 'CAPACITY_BELOW_PLAYERS');
      const g3 = await joinRoom(url, code, 'G3');
      fail(g3.res, 'ROOM_FULL');

      const started = until('guests see start', () => g1.c.last?.state === 'in_progress' && g2.c.last?.state === 'in_progress');
      ok(await emit(host, EVENTS.ROOM_START, {}));
      await started;
      assert(g1.c.chat.some((m) => m.systemCode === 'match_started'), 'start announcement');
      const late = await joinRoom(url, code, 'Late');
      fail(late.res, 'MATCH_IN_PROGRESS');
      fail(await emit(host, EVENTS.ROOM_SET_CAPACITY, { capacity: 4 }), 'INVALID_STATE');
      closeAll(host, g1.c, g2.c, g3.c, late.c);
    },
  ],
  [
    'removal: player is told, blocked for the cooldown, then may rejoin',
    async (url) => {
      const { host, code } = await createOnline(url);
      const guestInfo = newGuest('Rowdy');
      const { c: guest } = await joinRoom(url, code, 'Rowdy', guestInfo);
      await until('host sees guest', () => host.last?.seats.filter((s) => s.occupant).length === 2);
      const guestId = host.last!.seats.find((s) => s.occupant && !s.occupant.isHost)!.occupant!.playerId;
      ok(await emit(host, EVENTS.ROOM_KICK, { playerId: guestId }));
      await until('guest notified', () => guest.removed.length > 0);
      const again = await joinRoom(url, code, 'Rowdy', guestInfo);
      fail(again.res, 'REMOVED_COOLDOWN');
      await sleep(WINDOW_MS + 300);
      const third = await joinRoom(url, code, 'Rowdy', guestInfo);
      ok(third.res);
      closeAll(host, guest, again.c, third.c);
    },
  ],
  [
    'reconnect: seat kept inside the window, released after it',
    async (url) => {
      const { host, code } = await createOnline(url);
      const info = newGuest('Wanderer');
      const first = await joinRoom(url, code, 'Wanderer', info);
      ok(first.res);
      await until('host sees guest', () => host.last?.seats.filter((s) => s.occupant).length === 2);
      first.c.socket.close();
      await until('marked disconnected', () => host.last?.seats.some((s) => s.occupant?.connection === 'disconnected'));
      const back = await joinRoom(url, code, 'Wanderer', info);
      assert(ok(back.res).resumed, 'should resume the same seat');
      await until('marked connected', () => host.last?.seats.every((s) => !s.occupant || s.occupant.connection === 'connected'));
      assert(host.last?.seats.filter((s) => s.occupant).length === 2, 'no duplicate seat after resume');

      back.c.socket.close();
      await sleep(WINDOW_MS + 600);
      assert(host.last?.seats.filter((s) => s.occupant).length === 1, 'seat should be released after the window');
      assert(host.chat.some((m) => m.systemCode === 'left'), 'leave announcement');
      closeAll(host, first.c, back.c);
    },
  ],
  [
    'second tab takes over the same seat',
    async (url) => {
      const { host, code } = await createOnline(url);
      const info = newGuest('TwoTabs');
      const tab1 = await joinRoom(url, code, 'TwoTabs', info);
      ok(tab1.res);
      const tab2 = await joinRoom(url, code, 'TwoTabs', info);
      assert(ok(tab2.res).resumed, 'second tab resumes');
      await until('first tab told', () => tab1.c.closed.includes('taken_over'));
      assert(host.last?.seats.filter((s) => s.occupant).length === 2, 'still one seat for the guest');
      closeAll(host, tab1.c, tab2.c);
    },
  ],
  [
    'host handover keeps exactly one host; room closes when empty',
    async (url) => {
      const { host, code } = await createOnline(url);
      const { c: guest } = await joinRoom(url, code, 'Heir');
      await until('guest seated', () => host.last?.seats.filter((s) => s.occupant).length === 2);
      ok(await emit(host, EVENTS.ROOM_LEAVE, {}));
      const heir = await until('guest becomes host', () =>
        guest.last?.seats.find((s) => s.occupant?.displayName === 'Heir' && s.occupant.isHost),
      );
      assert(heir.occupant?.isHost, 'guest should be host');
      assert(guest.chat.some((m) => m.systemCode === 'host_changed'), 'host change announcement');

      // Former host returns as a regular player.
      const back = await joinRoom(url, code, 'Host', host.guest);
      ok(back.res);
      await until('two seated', () => guest.last?.seats.filter((s) => s.occupant).length === 2);
      assert(guest.last?.seats.filter((s) => s.occupant?.isHost).length === 1, 'still exactly one host');
      assert(!guest.last?.seats.find((s) => s.occupant?.displayName === 'Host')?.occupant?.isHost, 'returning host is a regular player');

      // Everyone leaves: room closes immediately and the link is dead.
      ok(await emit(back.c, EVENTS.ROOM_LEAVE, {}));
      ok(await emit(guest, EVENTS.ROOM_LEAVE, {}));
      const dead = await joinRoom(url, code, 'Late');
      fail(dead.res, 'ROOM_NOT_FOUND');
      closeAll(host, guest, back.c, dead.c);
    },
  ],
  [
    'host disconnect past the window hands over; all disconnected closes the room',
    async (url) => {
      const { host, code } = await createOnline(url);
      const { c: guest } = await joinRoom(url, code, 'Steady');
      await until('guest seated', () => host.last?.seats.filter((s) => s.occupant).length === 2);
      host.socket.close();
      await sleep(WINDOW_MS + 600);
      assert(guest.last?.seats.find((s) => s.occupant?.displayName === 'Steady')?.occupant?.isHost, 'guest should now be host');
      guest.socket.close();
      await sleep(WINDOW_MS + 600);
      const dead = await joinRoom(url, code, 'Late');
      fail(dead.res, 'ROOM_NOT_FOUND');
      closeAll(host, guest, dead.c);
    },
  ],
  [
    'in a match a released seat is announced and the match continues',
    async (url) => {
      const { host, code } = await createOnline(url);
      const a = await joinRoom(url, code, 'Ann');
      const b = await joinRoom(url, code, 'Ben');
      await until('three seated', () => host.last?.seats.filter((s) => s.occupant).length === 3);
      ok(await emit(host, EVENTS.ROOM_START, {}));
      b.c.socket.close();
      await sleep(WINDOW_MS + 600);
      assert(host.last?.state === 'in_progress', 'match should continue');
      assert(host.last?.seats.filter((s) => s.occupant).length === 2, 'seat released');
      assert(host.chat.some((m) => m.systemCode === 'seat_released'), 'seat release announcement');
      const rejoin = await joinRoom(url, code, 'Ben', b.c.guest);
      fail(rejoin.res, 'MATCH_IN_PROGRESS');
      closeAll(host, a.c, b.c, rejoin.c);
    },
  ],
  [
    'AI room: bots seated, no invite, closed to others, closes when the human leaves',
    async (url) => {
      const human = await connect(url, 'Solo');
      const created = ok(
        await emit<JoinedData>(human, EVENTS.ROOM_CREATE, { gameId: 'ludo', mode: 'ai', botCount: 2, guest: human.guest }),
      );
      assert(created.invitePath === null && !created.room.inviteEnabled, 'AI rooms have no invite');
      assert(created.room.capacity === 3, 'capacity = 1 + bots');
      assert(created.room.seats.filter((s) => s.occupant?.kind === 'bot').length === 2, 'two bots');
      assert(created.room.seats.filter((s) => s.occupant?.isHost).length === 1, 'human is the only host');
      fail(await emit(human, EVENTS.ROOM_SET_CAPACITY, { capacity: 4 }), 'INVALID_STATE');
      const stranger = await joinRoom(url, created.room.roomId, 'Stranger');
      fail(stranger.res, 'ROOM_NOT_FOUND');
      ok(await emit(human, EVENTS.ROOM_START, {}));
      ok(await emit(human, EVENTS.ROOM_LEAVE, {}));
      const after = await joinRoom(url, created.room.roomId, 'Late', human.guest);
      fail(after.res, 'ROOM_NOT_FOUND');
      fail(await emit(human, EVENTS.ROOM_CREATE, { gameId: 'ludo', mode: 'ai', botCount: 9, guest: human.guest }), 'INVALID_PAYLOAD');
      closeAll(human, stranger.c, after.c);
    },
  ],
  [
    'invalid requests: unknown fields, unavailable game, not in a room',
    async (url) => {
      const c = await connect(url, 'Odd');
      fail(await emit(c, EVENTS.ROOM_JOIN, { gameId: 'ludo', roomId: 'ABCDEFGH', guest: c.guest, extra: 1 }), 'INVALID_PAYLOAD');
      fail(await emit(c, EVENTS.ROOM_CREATE, { gameId: 'bingo', mode: 'online', guest: c.guest }), 'GAME_UNAVAILABLE');
      fail(await emit(c, EVENTS.ROOM_CREATE, { gameId: 'ludo', mode: 'online', guest: { ...c.guest, guestId: 'nope' } }), 'INVALID_PAYLOAD');
      fail(await emit(c, EVENTS.CHAT_SEND, { text: 'hi' }), 'NOT_IN_ROOM');
      fail(await emit(c, EVENTS.ROOM_START, {}), 'NOT_IN_ROOM');
      closeAll(c);
    },
  ],
];

// ---------- load mode (SC-009) ----------
function percentile(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))] ?? 0;
}

async function loadTest(url: string, rooms: number): Promise<boolean> {
  const createMs: number[] = [];
  const joinMs: number[] = [];
  const chatMs: number[] = [];
  const all: Client[] = [];
  const started = Date.now();
  await Promise.all(
    Array.from({ length: rooms }, async (_, i) => {
      const t0 = Date.now();
      const { host, code } = await createOnline(url, `H${i}`);
      createMs.push(Date.now() - t0);
      all.push(host);
      const guests: Client[] = [];
      for (let g = 0; g < 3; g++) {
        const t1 = Date.now();
        const { c, res } = await joinRoom(url, code, `G${i}-${g}`);
        ok(res);
        joinMs.push(Date.now() - t1);
        guests.push(c);
        all.push(c);
      }
      const text = `ping ${i}`;
      const t2 = Date.now();
      ok(await emit(guests[0]!, EVENTS.CHAT_SEND, { text }));
      await until('chat reaches host', () => host.chat.find((m) => m.text === text), 5000);
      chatMs.push(Date.now() - t2);
    }),
  );
  const health = (await (await fetch(`${url}/healthz`)).json()) as { rooms: number; connections: number };
  const create95 = percentile(createMs, 95);
  const join95 = percentile(joinMs, 95);
  const chat95 = percentile(chatMs, 95);
  console.log(
    `load: ${rooms} rooms, ${all.length} sockets in ${Date.now() - started} ms; ` +
      `server reports ${health.rooms} rooms / ${health.connections} connections`,
  );
  console.log(`load: p95 create ${create95} ms, join ${join95} ms, chat ${chat95} ms`);
  closeAll(...all);
  const pass = create95 <= 2000 && join95 <= 2000 && chat95 <= 1000 && health.rooms >= rooms;
  console.log(`${pass ? 'PASS' : 'FAIL'}  load (create/join within 2 s, chat within 1 s at p95)`);
  return pass;
}

// ---------- runner ----------
async function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.once('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address() as { port: number };
      srv.close(() => resolve(port));
    });
  });
}

async function startServer(): Promise<{ url: string; child: ChildProcess }> {
  const port = await freePort();
  const child = spawn(process.execPath, [path.join(root, 'server/dist/index.js')], {
    env: {
      ...process.env,
      PORT: String(port),
      NODE_ENV: 'production',
      LOG_LEVEL: 'warn',
      RECONNECT_WINDOW_MS: String(WINDOW_MS),
      REMOVAL_COOLDOWN_MS: String(WINDOW_MS),
    },
    stdio: ['ignore', 'inherit', 'inherit'],
  });
  const url = `http://127.0.0.1:${port}`;
  const deadline = Date.now() + 15_000;
  for (;;) {
    try {
      if ((await fetch(`${url}/healthz`)).ok) return { url, child };
    } catch {
      /* not up yet */
    }
    if (Date.now() > deadline) {
      child.kill();
      throw new Error('server did not become healthy (did you run: npm run build -w shared -w server ?)');
    }
    await sleep(100);
  }
}

async function main(): Promise<void> {
  const roomsArg = process.argv.indexOf('--rooms');
  const loadRooms = roomsArg >= 0 ? Number(process.argv[roomsArg + 1] ?? 50) : 0;

  let child: ChildProcess | undefined;
  let url = process.env.SMOKE_URL ?? '';
  if (!url) ({ url, child } = await startServer());
  console.log(`smoke target: ${url} (reconnect/cooldown window ${WINDOW_MS} ms)`);

  let failures = 0;
  try {
    if (loadRooms > 0) {
      if (!(await loadTest(url, loadRooms))) failures++;
    } else {
      const results = await Promise.all(
        scenarios.map(async ([name, run]) => {
          try {
            await run(url);
            return { name, error: null as string | null };
          } catch (err) {
            return { name, error: err instanceof Error ? err.message : String(err) };
          }
        }),
      );
      for (const r of results) {
        console.log(`${r.error ? 'FAIL' : 'PASS'}  ${r.name}${r.error ? `\n        ${r.error}` : ''}`);
        if (r.error) failures++;
      }
      const invariant = hostViolations === 0;
      console.log(`${invariant ? 'PASS' : 'FAIL'}  every room:state had exactly one host (violations: ${hostViolations})`);
      if (!invariant) failures++;
    }
  } finally {
    child?.kill();
  }
  console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) failed.`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
