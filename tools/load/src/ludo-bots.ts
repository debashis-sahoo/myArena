import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import WebSocket from 'ws';
import type { LudoMatchView } from '@myarena/ludo';
import { percentile } from './stats.js';

interface Message { type: string; seq?: number; state?: unknown; kind?: string; clientActionId?: string; status?: string; code?: string; }
interface Entry { roomId: string; participantId: string; invitation?: { code: string }; }

/** The bot's choice: the legal pawn that is furthest along, the lowest number on a tie. */
export function pickPawn(view: LudoMatchView): number | null {
  if (view.you === null) return null;
  const pawns = view.seats[view.you]?.pawns ?? [];
  let best: number | null = null;
  for (const pawn of view.turn.legalPawns) if (best === null || pawns[pawn]! > pawns[best]!) best = pawn;
  return best;
}

export interface ActionStats { acks: number[]; broadcasts: number[]; rejected: Record<string, number>; actions: number; }

export function summarizeActions(stats: ActionStats) {
  const acks = [...stats.acks].sort((left, right) => left - right);
  const broadcasts = [...stats.broadcasts].sort((left, right) => left - right);
  const within = broadcasts.filter((latency) => latency <= 1000).length;
  return {
    actions: stats.actions,
    rejected: stats.rejected,
    ackMs: { p50: percentile(acks, 50), p95: percentile(acks, 95), max: acks.at(-1) ?? 0 },
    broadcastMs: { p50: percentile(broadcasts, 50), p95: percentile(broadcasts, 95), max: broadcasts.at(-1) ?? 0 },
    percentBroadcastWithinOneSecond: broadcasts.length === 0 ? 0 : (within / broadcasts.length) * 100,
  };
}

class Bot {
  view: LudoMatchView | null = null;
  seq = 0;
  readonly arrivals = new Map<number, number>();
  private readonly pending = new Map<string, (message: Message) => void>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  constructor(readonly socket: WebSocket, private readonly match: LoadMatch) {
    socket.on('message', (raw) => this.receive(JSON.parse(raw.toString()) as Message));
  }

  static async connect(baseUrl: string, roomId: string, cookie: string, match: LoadMatch): Promise<Bot> {
    const socket = new WebSocket(`${baseUrl.replace(/^http/, 'ws')}/ws?room=${roomId}`, { origin: new URL(baseUrl).origin, headers: { Cookie: cookie } });
    const bot = new Bot(socket, match);
    await new Promise<void>((resolve, reject) => { socket.once('open', resolve); socket.once('error', reject); });
    return bot;
  }

  private receive(message: Message): void {
    if (message.type === 'ack' && message.clientActionId) this.pending.get(message.clientActionId)?.(message);
    if (message.type !== 'game' || message.seq === undefined) return;
    this.seq = message.seq;
    this.arrivals.set(message.seq, performance.now());
    const state = message.state as { kind?: string } | null;
    if (state?.kind !== 'MATCH') return;
    this.view = state as LudoMatchView;
    this.decide();
  }

  send(intent: Record<string, unknown>): Promise<Message> {
    const clientActionId = crypto.randomUUID();
    const startedAt = performance.now();
    this.match.sentAt.set(this.seq + 1, startedAt);
    return new Promise((resolve) => {
      this.pending.set(clientActionId, (message) => {
        this.pending.delete(clientActionId);
        this.match.stats.acks.push(performance.now() - startedAt);
        this.match.stats.actions += 1;
        if (message.status !== 'ACCEPTED') this.match.stats.rejected[message.code ?? 'UNKNOWN'] = (this.match.stats.rejected[message.code ?? 'UNKNOWN'] ?? 0) + 1;
        resolve(message);
      });
      this.socket.send(JSON.stringify({ v: 1, clientActionId, ...intent }));
    });
  }

  private decide(): void {
    const view = this.view;
    if (!view || view.turn.phase === 'ENDED') { this.match.finish(); return; }
    if (view.turn.seat !== view.you) return;
    if (this.timer) clearTimeout(this.timer);
    if (view.turn.phase === 'ROLL') {
      this.timer = setTimeout(() => void this.send({ type: 'game.action', action: { type: 'roll' } }), 50);
    } else if (view.turn.legalPawns.length > 0) {
      const pawn = pickPawn(view)!;
      this.timer = setTimeout(() => void this.send({ type: 'game.action', action: { type: 'move', payload: { pawn } } }), view.turn.settleMsLeft + 50);
    }
  }

  close(): void { if (this.timer) clearTimeout(this.timer); this.socket.close(); }
}

class LoadMatch {
  readonly sentAt = new Map<number, number>();
  readonly stats: ActionStats = { acks: [], broadcasts: [], rejected: {}, actions: 0 };
  bots: Bot[] = [];
  finished = false;
  private resolveDone: () => void = () => undefined;
  readonly done = new Promise<void>((resolve) => { this.resolveDone = resolve; });
  finish(): void { this.finished = true; this.resolveDone(); }
}

async function post(baseUrl: string, path: string, body: unknown) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: new URL(baseUrl).origin }, body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`${path} failed with ${response.status}: ${await response.text()}`);
  return { body: (await response.json()) as Entry, cookie: response.headers.getSetCookie()[0]!.split(';')[0]! };
}

async function playMatch(baseUrl: string, players: number, maxSeconds: number): Promise<LoadMatch> {
  const match = new LoadMatch();
  const host = await post(baseUrl, '/api/rooms', { displayName: 'Bot 0', gameId: 'ludo', maxParticipants: players });
  const seats = [{ roomId: host.body.roomId, cookie: host.cookie }];
  for (let index = 1; index < players; index += 1) {
    const joined = await post(baseUrl, '/api/rooms/join', { code: host.body.invitation!.code, displayName: `Bot ${index}` });
    seats.push({ roomId: joined.body.roomId, cookie: joined.cookie });
  }
  match.bots = await Promise.all(seats.map((seat) => Bot.connect(baseUrl, seat.roomId, seat.cookie, match)));
  await new Promise((resolve) => setTimeout(resolve, 300));
  const send = (bot: Bot, intent: Record<string, unknown>) => bot.send(intent);
  for (const bot of match.bots.slice(1)) await send(bot, { type: 'ready.set', ready: true });
  await send(match.bots[0]!, { type: 'match.start' });
  await Promise.race([match.done, new Promise((resolve) => setTimeout(resolve, maxSeconds * 1000))]);

  // A broadcast counts once every bot has received it.
  for (const [seq, startedAt] of match.sentAt) {
    const arrivals = match.bots.map((bot) => bot.arrivals.get(seq));
    if (arrivals.every((time) => time !== undefined)) match.stats.broadcasts.push(Math.max(...(arrivals as number[])) - startedAt);
  }
  for (const bot of match.bots) bot.close();
  return match;
}

export interface LudoLoadOptions { baseUrl: string; matches: number; players: number; maxSeconds: number; }

/** Plays full Ludo matches with bots over real sockets and reports action and broadcast latency and any refusals. */
export async function runLudoBots({ baseUrl, matches, players, maxSeconds }: LudoLoadOptions) {
  const played = await Promise.all(Array.from({ length: matches }, () => playMatch(baseUrl, players, maxSeconds)));
  const total: ActionStats = { acks: [], broadcasts: [], rejected: {}, actions: 0 };
  for (const match of played) {
    total.acks.push(...match.stats.acks);
    total.broadcasts.push(...match.stats.broadcasts);
    total.actions += match.stats.actions;
    for (const [code, count] of Object.entries(match.stats.rejected)) total.rejected[code] = (total.rejected[code] ?? 0) + count;
  }
  const summary = summarizeActions(total);
  const refused = Object.values(summary.rejected).reduce((sum, count) => sum + count, 0);
  return {
    matches, playersPerMatch: players, completed: played.filter((match) => match.finished).length, maxSeconds, ...summary,
    verdict: { noRefusedActions: refused === 0, broadcastsWithinOneSecond: summary.percentBroadcastWithinOneSecond >= 95 },
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { values } = parseArgs({ options: {
    url: { type: 'string', default: 'http://127.0.0.1:3000' }, matches: { type: 'string', default: '5' },
    players: { type: 'string', default: '4' }, 'max-seconds': { type: 'string', default: '120' },
  } });
  const result = await runLudoBots({ baseUrl: values.url!, matches: Number(values.matches), players: Number(values.players), maxSeconds: Number(values['max-seconds']) });
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.verdict.noRefusedActions && result.verdict.broadcastsWithinOneSecond ? 0 : 1);
}
