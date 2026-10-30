import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { clearLastRoom, getLastRoom } from '../../platform/last-room';
import { probeSession } from '../../platform/session';

/** Offers a way back to a room this device still holds a seat in; shown only once the server confirms the seat. */
export function ReturnToRoom() {
  const [roomId, setRoomId] = useState<string | null>(null);

  useEffect(() => {
    const remembered = getLastRoom();
    if (!remembered) return;
    let active = true;
    probeSession(remembered).then((result) => {
      if (!active) return;
      if (result === 'ok') setRoomId(remembered);
      else if (result === 'expired' || result === 'unauthenticated') clearLastRoom();
    });
    return () => { active = false; };
  }, []);

  if (!roomId) return null;
  return (
    <section aria-labelledby="return-heading" className="banner stack">
      <h2 id="return-heading">Return to your room</h2>
      <p>You still have a seat in a room on this device.</p>
      <div><Link to={`/room/${encodeURIComponent(roomId)}`} className="btn-link btn-primary">Return to your room</Link></div>
    </section>
  );
}
