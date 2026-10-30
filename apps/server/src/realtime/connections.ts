import type { Clock } from '@myarena/game-sdk';
import type { WebSocket } from 'ws';
import { systemClock } from '../config/clock.js';
import type { ConnectionIdentity } from '../rooms/identity.js';

export type { ConnectionIdentity };
interface Connection extends ConnectionIdentity { socket: WebSocket; missedPongs: number; }

export class Connections {
  private readonly connections = new Map<string, Connection>();
  private timer: unknown;
  private stopped = false;
  constructor(
    private readonly onDisconnect: (identity: ConnectionIdentity) => void = () => {},
    private readonly clock: Clock = systemClock,
    private readonly heartbeatMs = 20_000,
  ) { this.scheduleHeartbeat(); }

  attach(identity: ConnectionIdentity, socket: WebSocket): void {
    const key = `${identity.roomId}:${identity.participantId}`;
    const previous = this.connections.get(key);
    const connection = { ...identity, socket, missedPongs: 0 };
    this.connections.set(key, connection);
    previous?.socket.close(4009, 'Superseded by a newer connection.');
    socket.on('error', () => socket.terminate());
    socket.on('pong', () => { connection.missedPongs = 0; });
    socket.on('close', () => {
      if (this.connections.get(key) !== connection) return;
      this.connections.delete(key);
      if (!this.stopped) this.onDisconnect(identity);
    });
  }

  send(identity: ConnectionIdentity, message: unknown): void {
    const socket = this.connections.get(`${identity.roomId}:${identity.participantId}`)?.socket;
    if (socket?.readyState === 1) socket.send(JSON.stringify(message));
  }
  forRoom(roomId: string): ConnectionIdentity[] {
    return Array.from(this.connections.values()).filter((connection) => connection.roomId === roomId)
      .map(({ participantId }) => ({ roomId, participantId }));
  }
  close(identity: ConnectionIdentity, code: number, reason: string): void {
    const key = `${identity.roomId}:${identity.participantId}`;
    const connection = this.connections.get(key);
    this.connections.delete(key);
    connection?.socket.close(code, reason);
  }
  dispose(): void {
    this.stopped = true;
    this.clock.clearTimeout(this.timer);
    for (const connection of this.connections.values()) {
      if (connection.socket.readyState === 1) connection.socket.send(JSON.stringify({ v: 1, type: 'closing', reason: 'shutdown' }));
      connection.socket.close(1001, 'Server restarting.');
    }
    this.connections.clear();
  }
  private scheduleHeartbeat(): void {
    this.timer = this.clock.setTimeout(() => {
      if (this.stopped) return;
      for (const connection of this.connections.values()) {
        if (connection.missedPongs >= 2) connection.socket.terminate();
        else { connection.missedPongs += 1; connection.socket.ping(); }
      }
      this.scheduleHeartbeat();
    }, this.heartbeatMs);
  }
}