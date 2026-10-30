export const ART_ICONS = ['TARGET', 'SNAKE', 'TICKET', 'PALETTE', 'CROWN', 'DICE', 'DISCS', 'FLASK'] as const;
export const ART_PALETTES = ['CRIMSON', 'EMERALD', 'AMBER', 'VIOLET', 'INDIGO', 'ROSE', 'TEAL', 'SLATE'] as const;
export const GAME_MODES = ['SOLO_AI', 'ONLINE'] as const;
export const ART_IMAGES = ['LUDO'] as const;

export type ArtIcon = (typeof ART_ICONS)[number];
export type ArtPalette = (typeof ART_PALETTES)[number];
export type ArtImage = (typeof ART_IMAGES)[number];
export type GameMode = (typeof GAME_MODES)[number];

export interface GameArt { icon: ArtIcon; palette: ArtPalette; image?: ArtImage }
export interface DurationRange { min: number; max: number }
