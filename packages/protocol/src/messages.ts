import { z } from 'zod';
import { rejections } from './errors.js';
import { MAX_FRAME_BYTES, chatTextSchema } from './validation.js';
import { chatMessageSchema, connectionSchema, invitationViewSchema, lobbyViewSchema, participantViewSchema, selfSchema, settingsViewSchema } from './views.js';

const intentBase = { v: z.literal(1), clientActionId: z.uuid() };
const emptyIntent = <Name extends string>(type: Name) => z.strictObject({ ...intentBase, type: z.literal(type) });
export const clientIntentSchema = z.discriminatedUnion('type', [
  z.strictObject({ ...intentBase, type: z.literal('ready.set'), ready: z.boolean() }),
  z.strictObject({ ...intentBase, type: z.literal('chat.send'), text: chatTextSchema }),
  z.strictObject({ ...intentBase, type: z.literal('game.select'), gameId: z.string().min(1).max(100) }),
  z.strictObject({ ...intentBase, type: z.literal('settings.update'), changes: z.strictObject({ maxParticipants: z.number().int().min(1).max(100).optional(), gameSettings: z.record(z.string(), z.json()).optional() }) }),
  emptyIntent('match.start'), emptyIntent('match.rematch'), emptyIntent('match.returnToLobby'),
  emptyIntent('invite.regenerate'), emptyIntent('room.close'), emptyIntent('ping'),
  z.strictObject({ ...intentBase, type: z.literal('host.transfer'), targetParticipantId: z.uuid() }),
  z.strictObject({ ...intentBase, type: z.literal('member.remove'), targetParticipantId: z.uuid() }),
  z.strictObject({ ...intentBase, type: z.literal('resync'), lastVersion: z.number().int().nonnegative().optional() }),
]);

const messageBase = { v: z.literal(1) };
const version = z.number().int().nonnegative();
const event = <Name extends string, Shape extends z.ZodRawShape>(kind: Name, data: Shape) => z.strictObject({
  ...messageBase, type: z.literal('event'), version, kind: z.literal(kind), data: z.strictObject(data),
});
export const eventSchema = z.discriminatedUnion('kind', [
  event('participant.joined', { participant: participantViewSchema }),
  event('participant.left', { participantId: z.uuid() }),
  event('participant.removed', { participantId: z.uuid() }),
  event('participant.connection', { participantId: z.uuid(), connection: connectionSchema }),
  event('participant.ready', { participantId: z.uuid(), ready: z.boolean() }),
  event('chat.message', { message: chatMessageSchema }),
  event('game.selected', { gameId: z.string(), settings: settingsViewSchema }),
  event('settings.updated', { settings: settingsViewSchema }),
  event('match.started', {}), event('match.ended', {}), event('match.rematch', {}), event('match.returnedToLobby', {}),
  event('invite.regenerated', { invitation: invitationViewSchema.optional() }),
  event('host.changed', { hostParticipantId: z.uuid(), previousHostParticipantId: z.uuid() }),
  event('room.closed', {}),
]);
const ackBase = { ...messageBase, type: z.literal('ack'), clientActionId: z.uuid(), version };
export const ackSchema = z.discriminatedUnion('status', [
  z.strictObject({ ...ackBase, status: z.literal('ACCEPTED') }),
  z.strictObject({ ...ackBase, status: z.literal('REJECTED'), code: z.enum(Object.keys(rejections) as [keyof typeof rejections, ...(keyof typeof rejections)[]]), detail: z.string(), nextStep: z.string() }),
]);
export const snapshotSchema = z.strictObject({ ...messageBase, type: z.literal('snapshot'), version, lobby: lobbyViewSchema, self: selfSchema });
export const serverMessageSchema = z.union([
  snapshotSchema, eventSchema, ackSchema,
  z.strictObject({ ...messageBase, type: z.literal('pong') }),
  z.strictObject({ ...messageBase, type: z.literal('closing'), reason: z.string() }),
]);
export function parseClientFrame(frame: string) {
  if (new TextEncoder().encode(frame).byteLength > MAX_FRAME_BYTES) throw new Error('Frame exceeds 4 KB.');
  return clientIntentSchema.parse(JSON.parse(frame));
}
export type ClientIntent = z.infer<typeof clientIntentSchema>;
export type ServerMessage = z.infer<typeof serverMessageSchema>;
export type RoomEvent = z.infer<typeof eventSchema>;
export type Ack = z.infer<typeof ackSchema>;