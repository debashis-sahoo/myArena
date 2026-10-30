import { z } from 'zod';

export const MAX_FRAME_BYTES = 4096;
export const invitationCodeSchema = z.string().regex(/^[A-HJ-NP-Z2-9]{10}$/);
export const displayNameSchema = z.string()
  .refine((value) => !/[\p{Cc}\p{Cf}]/u.test(value), 'Control and invisible characters are not allowed.')
  .transform((value) => value.trim().normalize('NFC'))
  .refine((value) => Array.from(value).length >= 1 && Array.from(value).length <= 24, 'Use 1 to 24 characters.')
  .refine((value) => /^[\p{L}\p{N} '\-_.]+$/u.test(value), 'Use letters, numbers, spaces, apostrophes, hyphens, underscores, or periods.');

export const chatTextSchema = z.string().min(1).refine((text) => Array.from(text).length <= 500, 'Use at most 500 characters.');