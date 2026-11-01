import { useSyncExternalStore } from 'react';
import { AVATAR_KEYS, DISPLAY_NAME_MAX, type GuestInfo } from '@myarena/shared';

const KEY = 'myarena.guest.v1';

export interface Guest {
  /** Private reclaim key: sent to the server only to resume a seat, never shown to other players. */
  guestId: string;
  displayName: string;
  avatar: string;
  soundOn: boolean;
}

const ADJECTIVES = ['Swift', 'Lucky', 'Cosmic', 'Jolly', 'Brave', 'Sunny', 'Zesty', 'Mighty', 'Sparky', 'Cheeky'];
const ANIMALS = ['Panda', 'Fox', 'Tiger', 'Owl', 'Koala', 'Lion', 'Frog', 'Robot'];

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)] as T;
}

export function friendlyName(): string {
  return `${pick(ADJECTIVES)} ${pick(ANIMALS)}`;
}

/** Plain text only: control characters stripped, trimmed, cut to 20 characters. Blank becomes a friendly name. */
export function cleanName(raw: string): string {
  // eslint-disable-next-line no-control-regex
  const cleaned = raw.replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, DISPLAY_NAME_MAX);
  return cleaned || friendlyName();
}

/** crypto.randomUUID needs a secure context; phones testing over plain http on a LAN do not have one. */
function uuid(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6]! & 0x0f) | 0x40;
  b[8] = (b[8]! & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

function load(): Guest {
  let saved: Partial<Guest> = {};
  try {
    saved = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Guest>;
  } catch {
    /* storage unavailable or corrupt: start fresh */
  }
  const guest: Guest = {
    guestId: typeof saved.guestId === 'string' && saved.guestId.length >= 32 ? saved.guestId : uuid(),
    displayName: cleanName(typeof saved.displayName === 'string' ? saved.displayName : ''),
    avatar: (AVATAR_KEYS as readonly string[]).includes(saved.avatar ?? '') ? (saved.avatar as string) : pick(AVATAR_KEYS),
    soundOn: typeof saved.soundOn === 'boolean' ? saved.soundOn : true,
  };
  persist(guest);
  return guest;
}

function persist(guest: Guest): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(guest));
  } catch {
    /* ignore: profile just will not persist */
  }
}

let current: Guest = load();
const listeners = new Set<() => void>();

export function getGuest(): Guest {
  return current;
}

export function updateGuest(patch: Partial<Pick<Guest, 'displayName' | 'avatar' | 'soundOn'>>): void {
  current = {
    ...current,
    ...patch,
    displayName: patch.displayName !== undefined ? cleanName(patch.displayName) : current.displayName,
  };
  persist(current);
  listeners.forEach((l) => l());
}

export function useGuest(): Guest {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => current,
  );
}

/** What the server needs to seat this guest. */
export function guestInfo(): GuestInfo {
  return { guestId: current.guestId, displayName: current.displayName, avatar: current.avatar };
}
