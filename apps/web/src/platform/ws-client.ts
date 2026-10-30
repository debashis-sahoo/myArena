import { clientIntentSchema, serverMessageSchema, type ClientIntent, type ServerMessage } from '@myarena/protocol';
import { initialRoomState, reduceRoomMessage, type RoomState } from './room-state';

export interface RoomSocketOptions {
  onState(state: RoomState): void;
  onMessage?(message: ServerMessage): void;
  onClose?(event: CloseEvent): void;
}
export function connectRoom(roomId: string, options: RoomSocketOptions) {
  const url = new URL('/ws', window.location.href);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.searchParams.set('room', roomId);
  const socket = new WebSocket(url);
  let state = initialRoomState;
  let resyncRequested = false;
  const send = (intent: ClientIntent) => {
    if (socket.readyState !== WebSocket.OPEN) return false;
    socket.send(JSON.stringify(clientIntentSchema.parse(intent)));
    return true;
  };
  socket.addEventListener('message', (event) => {
    let message: ServerMessage;
    try { message = serverMessageSchema.parse(JSON.parse(String(event.data))); }
    catch { socket.close(1008, 'Invalid server message.'); return; }
    state = reduceRoomMessage(state, message);
    if (message.type === 'snapshot') resyncRequested = false;
    if (state.needsResync && !resyncRequested) {
      resyncRequested = true;
      send({ v: 1, type: 'resync', clientActionId: crypto.randomUUID(), lastVersion: state.version });
    }
    options.onState(state);
    options.onMessage?.(message);
  });
  socket.addEventListener('close', (event) => options.onClose?.(event));
  return { send, close: () => socket.close(), isOpen: () => socket.readyState === WebSocket.OPEN, get state() { return state; } };
}