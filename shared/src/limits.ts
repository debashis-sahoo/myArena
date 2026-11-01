/** Shared constants. Values mirror specs/001-platform-hub-rooms/data-model.md. */

export const ROOM_ID_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'; // 31 characters, no 0/O/1/I/L
export const ROOM_ID_LENGTH = 8;

export const DISPLAY_NAME_MIN = 1;
export const DISPLAY_NAME_MAX = 20;
export const CHAT_TEXT_MIN = 1;
export const CHAT_TEXT_MAX = 500;
export const CHAT_HISTORY = 50;

export const RECONNECT_WINDOW_MS = 60_000;
export const REMOVAL_COOLDOWN_MS = 60_000;
export const MAX_ROOMS = 100;

/** Chat token bucket: burst of 5, then 1 per second. */
export const CHAT_BURST = 5;
export const CHAT_REFILL_PER_SEC = 1;

/** Socket.IO heartbeat. Worst-case dead-connection detection is interval + timeout = 8 s (SC-003). */
export const PING_INTERVAL_MS = 4000;
export const PING_TIMEOUT_MS = 4000;

export const AVATAR_KEYS = ['fox', 'panda', 'tiger', 'frog', 'owl', 'koala', 'lion', 'robot'] as const;
export type AvatarKey = (typeof AVATAR_KEYS)[number];
