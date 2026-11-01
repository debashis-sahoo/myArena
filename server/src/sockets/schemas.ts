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
