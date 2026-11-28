import { randomUUID } from 'node:crypto';
import { io, type Socket } from 'socket.io-client';
import { EVENTS, type Ack, type GuestInfo, type JoinedData } from '@myarena/shared';

const endpoint = process.env.LOAD_URL;
if (!endpoint) throw new Error('LOAD_URL is required; point it at the one-worker S1 candidate.');
const candidateVerifier = process.env.CANDIDATE_VERIFIER_TOKEN;
const roomCount = Number(process.env.LOAD_ROOMS ?? 50);
const connectionsPerRoom = Number(process.env.LOAD_CONNECTIONS_PER_ROOM ?? 10);
const roomConcurrency = Number(process.env.LOAD_ROOM_CONCURRENCY ?? 5);
if (roomCount * connectionsPerRoom !== 500) {
  throw new Error('The qualification must create exactly 500 concurrent WebSocket connections.');
}
if (!Number.isInteger(roomConcurrency) || roomConcurrency < 1 || roomConcurrency > roomCount) {
  throw new Error('LOAD_ROOM_CONCURRENCY must be a whole number between 1 and LOAD_ROOMS.');
}

const sockets: Socket[] = [];
const latencies: number[] = [];
const guests = Array.from({ length: 500 }, (_, index) => ({
  guestId: randomUUID(),
  displayName: `Load ${index + 1}`,
  avatar: 'fox',
}));

async function hostCookie(): Promise<string> {
  const response = await fetch(`${endpoint}/host`, { redirect: 'manual' });
  const value = response.headers.get('set-cookie');
  if (!value) throw new Error('GET /host did not issue a host capability.');
  return value.split(';')[0] ?? value;
}

async function connect(guest: GuestInfo, cookie?: string): Promise<Socket> {
  const socket = io(endpoint, {
    transports: ['websocket'],
    reconnection: false,
    extraHeaders: {
      cookie: cookie ?? '',
      'x-forwarded-for': `198.51.100.${(sockets.length % 200) + 1}`,
    },
    auth: candidateVerifier ? { candidateVerifier } : undefined,
  });
  sockets.push(socket);
  await new Promise<void>((resolve, reject) => {
    socket.once('connect', resolve);
    socket.once('connect_error', reject);
  });
  return socket;
}

function emit<T>(socket: Socket, event: string, payload: object): Promise<T> {
  const started = performance.now();
  return new Promise((resolve, reject) => {
    socket.timeout(15_000).emit(event, payload, (error: Error | null, result: Ack<T>) => {
      latencies.push(performance.now() - started);
      if (error) reject(error);
      else if (!result.ok) reject(new Error(`${result.error.code}: ${result.error.message}`));
      else resolve(result.data);
    });
  });
}

function percentile(values: number[], fraction: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(fraction * sorted.length) - 1)] ?? 0;
}

async function exerciseRoom(roomIndex: number): Promise<void> {
  const offset = roomIndex * connectionsPerRoom;
  const host = await connect(guests[offset]!, await hostCookie());
  const joined = await emit<JoinedData>(host, EVENTS.ROOM_CREATE, {
    gameId: 'housie',
    mode: 'online',
    capacity: connectionsPerRoom,
    guest: guests[offset],
  });
  for (let player = 1; player < connectionsPerRoom; player++) {
    const guest = guests[offset + player]!;
    const socket = await connect(guest);
    await emit<JoinedData>(socket, EVENTS.ROOM_JOIN, {
      gameId: 'housie',
      roomId: joined.room.roomId,
      guest,
    });
    await emit(socket, EVENTS.CHAT_SEND, { text: `load-${roomIndex}-${player}` });
  }
  await emit(host, EVENTS.GAME_ACTION, { type: 'setCaller', mode: 'manual' });
}

try {
  for (let start = 0; start < roomCount; start += roomConcurrency) {
    const roomIndexes = Array.from(
      { length: Math.min(roomConcurrency, roomCount - start) },
      (_, index) => start + index,
    );
    await Promise.all(roomIndexes.map(exerciseRoom));
  }

  const p95 = percentile(latencies, 0.95);
  const result = {
    connections: sockets.length,
    rooms: roomCount,
    operations: latencies.length,
    p50Ms: Math.round(percentile(latencies, 0.5)),
    p95Ms: Math.round(p95),
    p99Ms: Math.round(percentile(latencies, 0.99)),
  };
  if (sockets.length !== 500 || p95 > 2000) throw new Error(`S1 load gate failed: ${JSON.stringify(result)}`);
  console.log(JSON.stringify(result));
} finally {
  for (const socket of sockets) socket.close();
}
