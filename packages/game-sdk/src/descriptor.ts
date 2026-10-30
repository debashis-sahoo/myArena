import type { ArtIcon, ArtPalette, DurationRange, GameMode } from './presentation.js';

export interface SettingsSchema {
  safeParse(value: unknown):
    | { success: true; data: Record<string, unknown> }
    | { success: false; error: unknown };
}

export interface GameDescriptor {
  id: string;
  name: string;
  minParticipants: number;
  maxParticipants: number;
  settingsSchema: SettingsSchema;
  /** 1 to 200 characters. */
  description: string;
  /** 1 to 30 characters. */
  category: string;
  /** Whole minutes, 1 to 600, min <= max. */
  durationMinutes: DurationRange;
  /** Non-empty, unique. */
  modes: readonly GameMode[];
  /** Inside [max(2, min), min(100, max)]; omitted means the maximum capped at 100. */
  defaultParticipants?: number;
  art: { icon: ArtIcon; palette: ArtPalette };
  /** True only for test games, which the catalog labels "Test game". */
  test?: boolean;
}
