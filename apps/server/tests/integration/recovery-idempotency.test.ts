import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { isSnapshot, setupLobby } from './lobby-helpers.js';

describe('recovery with resent intents', () => {
  it('applies an intent resent after reconnect once and returns the original ack', async () => {
    const lobby = await setupLobby(['Alex']);
    try {
      const { host, players, room, roomId } = lobby;
      const alex = players[0]!;
      const clientActionId = randomUUID();
      const original = await alex.socket.act({ type: 'chat.send', text: 'once only', clientActionId });
      const version = room.version;

      alex.socket.raw.terminate();
      await host.socket.until(() => room.participants[1]!.connection === 'DISCONNECTED');
      const back = await alex.client.connect(roomId);
      await back.waitFor(isSnapshot);

      const resent = await back.act({ type: 'chat.send', text: 'once only', clientActionId });
      expect(resent).toEqual(original);
      expect(room.chat).toHaveLength(1);
      expect(room.version).toBe(version + 2);

      const chats = host.socket.events().filter((event) => event.kind === 'chat.message');
      expect(chats).toHaveLength(1);
    } finally { await lobby.close(); }
  });

  it('keeps an unanswered intent safe to resend when the ack was never seen', async () => {
    const lobby = await setupLobby(['Alex']);
    try {
      const { players, room, roomId } = lobby;
      const alex = players[0]!;
      const clientActionId = randomUUID();
      alex.socket.send({ v: 1, type: 'ready.set', ready: true, clientActionId });
      await alex.socket.until(() => room.participants[1]!.ready);
      alex.socket.raw.terminate();
      const back = await alex.client.connect(roomId);
      await back.waitFor(isSnapshot);
      const resent = await back.act({ type: 'ready.set', ready: true, clientActionId });
      expect(resent.status).toBe('ACCEPTED');
      expect(room.participants[1]!.ready).toBe(true);
    } finally { await lobby.close(); }
  });
});
