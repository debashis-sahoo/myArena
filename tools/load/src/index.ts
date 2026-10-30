import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import WebSocket from 'ws';
import {
  PROFILES, foldReady, judge, sameReadiness, summarize, versionGaps, type ReadyEvent, type Summary,
} from './stats.js';

interface Message {
  type: string; version?: number; kind?: string; data?: Record<string, unknown>; clientActionId?: string; status?: string;
  lobby?: { participants: { id: string; ready: boolean }[]; version: number };
}

class Member {
  readonly events: ReadyEvent[] = [];
  readonly receivedAt = new Map<number, number>();
  snapshot: Message | null = null;
  private readonly pending = new Map<string, (message: Message) => void>();
  private constructor(readonly socket: WebSocket) {}

  static async connect(baseUrl: string, roomId: string, cookie: string): Promise<Member> {
    const origin = new URL(baseUrl).origin;
    const socket = new WebSocket(`${baseUrl.replace(/^http/, 'ws')}/ws?room=${roomId}`, { origin, headers: { Cookie: cookie } });
    const member = new Member(socket);
    socket.on('message', (raw) => member.receive(JSON.parse(raw.toString()) as Message));
    await new Promise<void>((resolve, reject) => { socket.once('open', resolve); socket.once('error', reject); });
    await member.waitFor(() => member.snapshot !== null);
    return member;
  }

  private receive(message: Message): void {
    if (message.type === 'snapshot') this.snapshot = message;
    if (message.type === 'event' && message.version !== undefined) {
      this.events.push({ version: message.version, kind: message.kind ?? '', data: (message.data ?? {}) as ReadyEvent['data'] });
      this.receivedAt.set(message.version, performance.now());
    }
    if (message.type === 'ack' && message.clientActionId) this.pending.get(message.clientActionId)?.(message);
  }

  async waitFor(condition: () => boolean, timeoutMs = 10_000): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (!condition()) {
      if (Date.now() > deadline) throw new Error('Timed out waiting for the server.');
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }

  act(intent: Record<string, unknown>): Promise<Message> {
    const clientActionId = crypto.randomUUID();
    return new Promise((resolve) => {
      this.pending.set(clientActionId, (message) => { this.pending.delete(clientActionId); resolve(message); });
      this.socket.send(JSON.stringify({ v: 1, clientActionId, ...intent }));
    });
  }
}

interface Entry { roomId: string; participantId: string; invitation?: { code: string }; }

async function post(baseUrl: string, path: string, body: unknown) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: new URL(baseUrl).origin }, body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`${path} failed with ${response.status}: ${await response.text()}`);
  return { body: (await response.json()) as Entry, cookie: response.headers.getSetCookie()[0]!.split(';')[0]! };
}

async function inPool<Item>(items: Item[], size: number, work: (item: Item) => Promise<void>): Promise<void> {
  const queue = [...items];
  await Promise.all(Array.from({ length: size }, async () => {
    for (let item = queue.shift(); item !== undefined; item = queue.shift()) await work(item);
  }));
}

const readiness = (snapshot: Message) => Object.fromEntries(snapshot.lobby!.participants.map((participant) => [participant.id, participant.ready]));

export interface RunOptions { baseUrl: string; profile: string; durationSeconds: number; intervalMs: number; }

export async function run({ baseUrl, profile, durationSeconds, intervalMs }: RunOptions) {
  const shape = PROFILES[profile];
  if (!shape) throw new Error(`Unknown profile "${profile}". Use ${Object.keys(PROFILES).join(' or ')}.`);

  const rooms: Member[][] = [];
  for (let roomIndex = 0; roomIndex < shape.rooms; roomIndex++) {
    const host = await post(baseUrl, '/api/rooms', { displayName: `Host ${roomIndex}` });
    const seats = [{ roomId: host.body.roomId, cookie: host.cookie }];
    await inPool(Array.from({ length: shape.players - 1 }, (_, index) => index), 10, async (index) => {
      const joined = await post(baseUrl, '/api/rooms/join', { code: host.body.invitation!.code, displayName: `Player ${index}` });
      seats.push({ roomId: joined.body.roomId, cookie: joined.cookie });
    });
    const members: Member[] = [];
    await inPool(seats, 20, async (seat) => { members.push(await Member.connect(baseUrl, seat.roomId, seat.cookie)); });
    rooms.push(members);
  }

  const startState = rooms.map((members) => readiness(members[0]!.snapshot!));
  const sent = rooms.map(() => new Map<number, number>());
  const stopAt = Date.now() + durationSeconds * 1000;
  const ready = new Map<Member, boolean>();

  await Promise.all(rooms.flatMap((members, roomIndex) => members.map(async (member) => {
    await new Promise((resolve) => setTimeout(resolve, Math.random() * intervalMs));
    while (Date.now() < stopAt) {
      const next = !(ready.get(member) ?? false);
      ready.set(member, next);
      const startedAt = performance.now();
      const ack = await member.act({ type: 'ready.set', ready: next });
      if (ack.status === 'ACCEPTED' && ack.version !== undefined) sent[roomIndex]!.set(ack.version, startedAt);
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  })));
  await new Promise((resolve) => setTimeout(resolve, 3000));

  const latencies: number[] = [];
  let lost = 0;
  let gaps = 0;
  let inconsistencies = 0;
  for (const [roomIndex, members] of rooms.entries()) {
    // Accepted ready changes that did not change anything keep no version of their own, so only versions every member saw count.
    for (const [version, startedAt] of sent[roomIndex]!) {
      const arrivals = members.map((member) => member.receivedAt.get(version));
      if (arrivals.some((time) => time === undefined)) lost += 1;
      else latencies.push(Math.max(...(arrivals as number[])) - startedAt);
    }
    const serverViews: Record<string, boolean>[] = [];
    for (const member of members) {
      gaps += versionGaps(member.events.map((event) => event.version));
      const folded = foldReady(startState[roomIndex]!, member.events);
      member.snapshot = null;
      await member.act({ type: 'resync' });
      await member.waitFor(() => member.snapshot !== null);
      const server = readiness(member.snapshot!);
      serverViews.push(server);
      if (!sameReadiness(folded, server)) inconsistencies += 1;
    }
    for (const view of serverViews) if (!sameReadiness(view, serverViews[0]!)) inconsistencies += 1;
  }
  for (const members of rooms) for (const member of members) member.socket.close();

  const summary: Summary = summarize(latencies, lost);
  return {
    profile, rooms: shape.rooms, participantsPerRoom: shape.players, durationSeconds, intervalMs,
    summary, gaps, inconsistencies, verdict: judge(summary, gaps, inconsistencies),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { values } = parseArgs({ options: {
    profile: { type: 'string', default: '2x100' }, url: { type: 'string', default: 'http://127.0.0.1:3000' },
    duration: { type: 'string', default: '30' }, 'interval-ms': { type: 'string', default: '5000' },
  } });
  const result = await run({ baseUrl: values.url!, profile: values.profile!, durationSeconds: Number(values.duration), intervalMs: Number(values['interval-ms']) });
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.verdict.sc009 && result.verdict.sc010 ? 0 : 1);
}
