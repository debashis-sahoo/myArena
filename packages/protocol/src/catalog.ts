import { z } from 'zod';

// Same literals as the game SDK's presentation vocabulary; a server test asserts they match.
export const artIcons = ['TARGET', 'SNAKE', 'TICKET', 'PALETTE', 'CROWN', 'DICE', 'DISCS', 'FLASK'] as const;
export const artPalettes = ['CRIMSON', 'EMERALD', 'AMBER', 'VIOLET', 'INDIGO', 'ROSE', 'TEAL', 'SLATE'] as const;
export const gameModes = ['SOLO_AI', 'ONLINE'] as const;
export const artImages = ['LUDO'] as const;

const duration = z.int().min(1).max(600);
const seats = z.int().min(1).max(100);

export const catalogEntrySchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9-]{1,40}$/),
  name: z.string().min(1).max(40),
  description: z.string().min(1).max(200),
  category: z.string().min(1).max(30),
  status: z.enum(['PLAYABLE', 'COMING_SOON']),
  test: z.boolean(),
  minParticipants: seats,
  maxParticipants: seats,
  defaultParticipants: seats,
  durationMinutes: z.strictObject({ min: duration, max: duration }).refine((value) => value.min <= value.max),
  modes: z.array(z.enum(gameModes)).min(1).refine((modes) => new Set(modes).size === modes.length),
  art: z.strictObject({ icon: z.enum(artIcons), palette: z.enum(artPalettes), image: z.enum(artImages).optional() }),
});

export const catalogResponseSchema = z.strictObject({ entries: z.array(catalogEntrySchema) });

export type CatalogEntry = z.infer<typeof catalogEntrySchema>;
export type CatalogResponse = z.infer<typeof catalogResponseSchema>;
