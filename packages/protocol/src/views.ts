import { z } from 'zod';
import { invitationCodeSchema, chatTextSchema } from './validation.js';

export const roleSchema = z.enum(['HOST', 'PLAYER']);
export const connectionSchema = z.enum(['CONNECTED', 'DISCONNECTED']);
export const selfSchema = z.strictObject({ id: z.uuid(), role: roleSchema });
export const participantViewSchema = z.strictObject({
  id: z.uuid(), displayLabel: z.string(), role: roleSchema,
  ready: z.boolean(), connection: connectionSchema,
});
export const invitationViewSchema = z.strictObject({ code: invitationCodeSchema, link: z.string() });
export const settingsViewSchema = z.strictObject({
  maxParticipants: z.number().int().min(1).max(100),
  gameSettings: z.record(z.string(), z.json()),
});
export const chatMessageSchema = z.strictObject({
  id: z.uuid(), senderParticipantId: z.uuid(), senderLabel: z.string(),
  text: chatTextSchema, sentAt: z.number(),
});
export const lobbyViewSchema = z.strictObject({
  id: z.uuid(), version: z.number().int().nonnegative(),
  status: z.enum(['LOBBY', 'IN_MATCH', 'CLOSED']),
  selectedGameId: z.string().nullable(), settings: settingsViewSchema,
  matchStatus: z.enum(['NONE', 'IN_PROGRESS', 'ENDED']),
  invitation: invitationViewSchema.optional(),
  participants: z.array(participantViewSchema).max(100),
  chat: z.array(chatMessageSchema).max(200), self: selfSchema,
});
export type RoomRole = z.infer<typeof roleSchema>;
export type ParticipantView = z.infer<typeof participantViewSchema>;
export type LobbyView = z.infer<typeof lobbyViewSchema>;
export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type RoomSettings = z.infer<typeof settingsViewSchema>;