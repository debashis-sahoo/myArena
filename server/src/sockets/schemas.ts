import { z } from 'zod';
import { DISPLAY_NAME_MAX } from '@myarena/shared';

// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u001F\u007F]/g;

/** Plain text only: control characters stripped, trimmed, cut to the maximum length. */
const displayName = z
  .string()
  .max(200)
  .transform((s) => s.replace(CONTROL_CHARS, '').trim().slice(0, DISPLAY_NAME_MAX))
  .pipe(z.string().min(1));

const guest = z
  .object({
    guestId: z.string().uuid(),
    displayName,
    avatar: z.string().max(20),
  })
  .strict();

const gameId = z.string().min(1).max(40);

export const createRoomSchema = z
  .object({
    gameId,
    mode: z.enum(['online', 'ai']),
    botCount: z.number().int().min(1).max(3).optional(),
    guest,
  })
  .strict();

export const joinRoomSchema = z
  .object({
    gameId,
    roomId: z.string().min(1).max(32),
    guest,
  })
  .strict();

export const emptySchema = z.object({}).strict();

export const setCapacitySchema = z.object({ capacity: z.number() }).strict();

export const kickSchema = z.object({ playerId: z.string().min(1).max(40) }).strict();

export const chatSendSchema = z.object({ text: z.string().max(2000) }).strict();

const autoInterval = z.union([z.literal(5000), z.literal(8000), z.literal(10000)]); // mirrors AUTO_INTERVALS_MS

/**
 * Game intents. Ludo: a roll or a pawn choice. Housie: host settings, calling and player marks/claims.
 * There is deliberately no field for a die value, a ball number, ticket contents or a result.
 */
export const gameActionSchema = z.union([
  z.object({ type: z.literal('roll') }).strict(),
  z.object({ type: z.literal('move'), pawn: z.number().int().min(0).max(3) }).strict(),
  z.object({ type: z.literal('setCeiling'), value: z.number().int().min(1).max(4) }).strict(),
  z.object({ type: z.literal('setHostPlays'), value: z.boolean() }).strict(),
  z
    .object({ type: z.literal('setPatterns'), ids: z.array(z.string().min(1).max(40)).max(40) })
    .strict(),
  z
    .object({ type: z.literal('setCaller'), mode: z.enum(['manual', 'auto']), intervalMs: autoInterval.optional() })
    .strict(),
  z.object({ type: z.literal('setTickets'), count: z.number().int().min(1).max(4) }).strict(),
  z.object({ type: z.literal('draw') }).strict(),
  z.object({ type: z.literal('auto'), intervalMs: autoInterval }).strict(),
  z.object({ type: z.literal('manual') }).strict(),
  z.object({ type: z.literal('pause') }).strict(),
  z.object({ type: z.literal('resume') }).strict(),
  z
    .object({
      type: z.literal('marks'),
      changes: z
        .array(
          z
            .object({
              t: z.number().int().min(0).max(3),
              c: z.number().int().min(0).max(26),
              on: z.boolean(),
            })
            .strict(),
        )
        .min(1)
        .max(30),
    })
    .strict(),
  z
    .object({ type: z.literal('claim'), combo: z.string().min(1).max(40), ticket: z.number().int().min(0).max(3) })
    .strict(),
]);
