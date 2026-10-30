import type { FastifyInstance } from 'fastify';
import type { RoomService } from './rooms/room-service.js';

// Stops new rooms first, then closes every socket with 1001 so clients reconnect or see "room unavailable".
export async function gracefulShutdown(app: FastifyInstance, rooms: RoomService): Promise<void> {
  rooms.stopAcceptingRooms();
  app.closeSockets();
  await app.close();
}
