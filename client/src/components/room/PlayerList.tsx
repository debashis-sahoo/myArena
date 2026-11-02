import type { CSSProperties, ReactElement, ReactNode } from 'react';
import { COLOR_HEX, type RoomState } from '@myarena/shared';
import { Avatar } from '../../art/Avatars';

interface Props {
  room: RoomState;
  youId: string;
  /** Present only for the host in a lobby: shows remove buttons. */
  onKick?: (playerId: string) => void;
  /** Optional game-specific content rendered at the end of each occupied row. */
  badge?: (playerId: string) => ReactNode;
}

/** Every seat with color tag, name, glowing host marker, connection state, and open-seat placeholders (FR-017, FR-034). */
export function PlayerList({ room, youId, onKick, badge }: Props): ReactElement {
  const seatedCount = room.seats.reduce((n, s) => (s.occupant ? n + 1 : n), 0);
  return (
    <ul className="player-list" aria-label={`Players ${seatedCount} of ${room.capacity}`}>
      {room.seats.map((seat) => {
        const p = seat.occupant;
        const style = { '--c': COLOR_HEX[seat.color] ?? '#fff' } as CSSProperties;
        if (!p) {
          return (
            <li key={seat.index} className="player open" style={style}>
              <span className="seat-dot" aria-hidden="true" />
              <span className="player-name">Open seat</span>
            </li>
          );
        }
        const away = p.connection === 'disconnected';
        return (
          <li key={seat.index} className={`player ${away ? 'away' : ''} ${p.isHost ? 'is-host' : ''}`} style={style}>
            <span className="seat-dot" aria-hidden="true" />
            <Avatar k={p.avatar} size={32} ring={COLOR_HEX[seat.color]} />
            <span className="player-name">
              {p.displayName}
              {p.playerId === youId && <em className="you"> (you)</em>}
            </span>
            {p.kind === 'bot' && <span className="tag bot-tag">Bot</span>}
            {p.isHost && (
              <span className="tag host-badge" title="Room host">
                <span aria-hidden="true">👑</span> Host
              </span>
            )}
            {away && (
              <span className="tag away-tag" role="status">
                <span className="spinner small" aria-hidden="true" /> Reconnecting
              </span>
            )}
            {onKick && p.kind === 'human' && p.playerId !== youId && (
              <button
                type="button"
                className="btn danger small"
                aria-label={`Remove ${p.displayName}`}
                onClick={() => onKick(p.playerId)}
              >
                Remove
              </button>
            )}
            {badge && <span className="player-badge">{badge(p.playerId)}</span>}
          </li>
        );
      })}
    </ul>
  );
}
