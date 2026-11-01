import { useRef } from 'react';
import type { RoomState } from '@myarena/shared';

export interface PlayerInfo {
  name: string;
  avatar: string;
  isHost: boolean;
  /** 'gone' once the seat was released (the platform no longer lists the occupant). */
  connection: 'connected' | 'disconnected' | 'gone';
}

/** Names and avatars by playerId. Released players stay known, so the log and panels can still name them. */
export function usePlayerInfo(room: RoomState): Map<string, PlayerInfo> {
  const known = useRef(new Map<string, { name: string; avatar: string }>());
  const out = new Map<string, PlayerInfo>();
  for (const seat of room.seats) {
    const p = seat.occupant;
    if (!p) continue;
    known.current.set(p.playerId, { name: p.displayName, avatar: p.avatar });
    out.set(p.playerId, { name: p.displayName, avatar: p.avatar, isHost: p.isHost, connection: p.connection });
  }
  for (const [id, k] of known.current) {
    if (!out.has(id)) out.set(id, { ...k, isHost: false, connection: 'gone' });
  }
  return out;
}
