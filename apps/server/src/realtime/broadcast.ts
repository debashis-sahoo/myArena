import type { ServerMessage } from '@myarena/protocol';
import type { Connections, ConnectionIdentity } from './connections.js';

// Each recipient gets its own projection, so nothing private is shared by reference.
export function broadcast(connections: Connections, roomId: string, project: (recipient: ConnectionIdentity) => ServerMessage | undefined): void {
  for (const identity of connections.forRoom(roomId)) {
    const message = project(identity);
    if (message) connections.send(identity, message);
  }
}
