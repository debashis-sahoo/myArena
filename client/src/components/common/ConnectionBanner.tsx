import { useEffect, useState, type ReactElement } from 'react';
import { retryNow, useConnection } from '../../state/socket';

const GIVE_UP_MS = 30_000;
const SHOW_AFTER_MS = 2500;

/** Genuine reconnect feedback for the always-on S1 deployment. */
export function ConnectionBanner(): ReactElement | null {
  const conn = useConnection();
  const [, tick] = useState(0);
  const away = conn.status === 'connecting' || conn.status === 'reconnecting';

  useEffect(() => {
    if (!away) return;
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [away]);

  if (!away) return null;
  const elapsed = Date.now() - (conn.since || Date.now());
  const waking = conn.status === 'connecting';
  if (waking && elapsed < SHOW_AFTER_MS && conn.attempts === 0) return null;

  const gaveUp = elapsed > GIVE_UP_MS;
  return (
    <div className="conn-banner" role="status" aria-live="polite">
      {!gaveUp && <span className="spinner small" aria-hidden="true" />}
      <span>
        {gaveUp
          ? 'Still cannot reach the arena.'
          : waking
            ? 'Connecting to the arena...'
            : 'Connection lost. Reconnecting...'}
      </span>
      {gaveUp && (
        <button type="button" className="btn small" onClick={retryNow}>
          Retry now
        </button>
      )}
    </div>
  );
}
