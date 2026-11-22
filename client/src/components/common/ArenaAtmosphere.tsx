import type { CSSProperties, ReactElement } from 'react';
import { useLocation } from 'react-router';
import { getGame } from '@myarena/shared';
import { useRoom } from '../../state/roomStore';

const PARTICLES = Array.from({ length: 10 }, (_, index) => index);

export function ArenaAtmosphere(): ReactElement {
  const location = useLocation();
  const { room } = useRoom();
  const inRoom = location.pathname.startsWith('/room/');
  const game = inRoom && room ? getGame(room.gameId) : undefined;
  const variant = inRoom ? 'room' : location.pathname === '/host' ? 'host' : 'player';
  const accent = game?.theme.accent ?? `var(--arena-${variant === 'host' ? 'host' : 'player'}-accent)`;
  const accent2 = game?.theme.accent2 ?? `var(--arena-${variant === 'host' ? 'host' : 'player'}-accent-2)`;
  const style = {
    '--arena-accent': accent,
    '--arena-accent-2': accent2,
  } as CSSProperties;

  return (
    <div className={`arena-atmosphere ${variant}`} style={style} aria-hidden="true">
      <div className="arena-orb orb-one" />
      <div className="arena-orb orb-two" />
      <div className="arena-grid" />
      {PARTICLES.map((index) => (
        <span key={index} className="arena-particle" style={{ '--particle-i': index } as CSSProperties} />
      ))}
    </div>
  );
}
