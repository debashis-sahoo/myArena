import type { CSSProperties, ReactElement } from 'react';
import { COLOR_HEX, PAWNS_PER_PLAYER, type LudoState } from '@myarena/shared';
import { Avatar } from '../../art/Avatars';
import type { PlayerInfo } from './playerInfo';

interface Props {
  state: LudoState;
  info: Map<string, PlayerInfo>;
  youId: string;
  /** Smaller bubbles for short screens. */
  compact: boolean;
}

/**
 * One circular bubble per seated player: avatar in a colour ring, host crown, "n/4" home badge, and the name underneath.
 * The active player's ring glows and pulses. Bubbles live outside the board, so they never cover squares.
 */
export function PlayerPanels({ state, info, youId, compact }: Props): ReactElement {
  return (
    <ul className={`player-bubbles ${compact ? 'compact' : ''}`} aria-label="Players">
      {state.players.map((p) => {
        const who = info.get(p.playerId);
        const name = who?.name ?? 'Player';
        const left = p.status === 'left';
        const away = !left && who?.connection === 'disconnected';
        const active = state.turn === p.playerId && state.phase !== 'finished';
        const status = left ? 'Left' : away ? 'Reconnecting' : null;
        return (
          <li
            key={p.playerId}
            className={`bubble-card ${p.color} ${active ? 'active' : ''} ${left ? 'left' : ''}`}
            style={{ ['--c' as string]: COLOR_HEX[p.color] ?? '#fff' } as CSSProperties}
            aria-current={active ? 'true' : undefined}
            aria-label={`${name}, ${p.color}, P${p.slot}${who?.isHost && !left ? ', host' : ''}, ${p.home} of ${PAWNS_PER_PLAYER} home${status ? `, ${status}` : ''}${active ? ', playing now' : ''}`}
            title={`${name}${p.kind === 'bot' ? ' (bot)' : ''}`}
          >
            <span className="b-avatar">
              <Avatar k={who?.avatar ?? 'fox'} size={compact ? 32 : 46} ring={COLOR_HEX[p.color]} />
              {who?.isHost && !left && (
                <span className="crown" aria-hidden="true">
                  👑
                </span>
              )}
              <span className="b-home" aria-hidden="true">
                {p.home}/{PAWNS_PER_PLAYER}
              </span>
            </span>
            <span className="b-name">
              {name}
              {p.playerId === youId && <em className="you"> (you)</em>}
            </span>
            {status && <span className={`b-status ${left ? 'left' : 'away'}`}>{status}</span>}
          </li>
        );
      })}
    </ul>
  );
}
