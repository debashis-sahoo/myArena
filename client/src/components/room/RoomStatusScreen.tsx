import { useEffect, useState, type ReactElement } from 'react';
import type { RoomStatus } from '../../state/roomStore';

interface Props {
  status: RoomStatus;
  onBack: () => void;
  onRetry: () => void;
}

const COPY: Record<RoomStatus['kind'], { emoji: string; title: string; body: string }> = {
  not_found: { emoji: '🔍', title: 'Room not found', body: 'This room does not exist, or it has already closed.' },
  full: { emoji: '🚪', title: 'This room is full', body: 'Every seat is taken. Ask the host to make room, or start your own game.' },
  in_progress: {
    emoji: '🎲',
    title: 'Match in progress',
    body: 'This match has already started, so new players cannot join. Ask your friend to create a new room.',
  },
  removed: { emoji: '✋', title: 'You were removed', body: 'The host removed you from this room.' },
  inactive: {
    emoji: '💤',
    title: 'You were removed for inactivity',
    body: 'You missed three turns in a row, so your seat was released.',
  },
  ended: { emoji: '🏁', title: 'This room has ended', body: 'The room closed, or the server restarted. Head back to the Hub to start a new one.' },
  taken_over: { emoji: '🪟', title: 'Open in another tab', body: 'You joined this room from another window, so this one has been disconnected.' },
  error: { emoji: '⚠️', title: 'Something went wrong', body: 'We could not reach the room.' },
};

/** Full-screen messages with a way back to the Hub (FR-015). */
export function RoomStatusScreen({ status, onBack, onRetry }: Props): ReactElement {
  const copy = COPY[status.kind];
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (status.kind !== 'removed') return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [status.kind]);

  const waitMs = status.kind === 'removed' ? Math.max(0, (status.retryUntil ?? 0) - now) : 0;
  const canRetry = status.kind === 'error' || (status.kind === 'removed' && waitMs === 0);

  return (
    <main className="status-screen">
      <div className="status-card" role="alert">
        <span className="status-emoji" aria-hidden="true">
          {copy.emoji}
        </span>
        <h1 className="status-title">{copy.title}</h1>
        <p className="hint">{status.kind === 'error' && status.message ? status.message : copy.body}</p>
        {status.kind === 'removed' && waitMs > 0 && (
          <p aria-live="polite">
            You can try to rejoin in <strong>{Math.ceil(waitMs / 1000)}s</strong>.
          </p>
        )}
        {canRetry && (
          <button type="button" className="btn cyan" onClick={onRetry}>
            {status.kind === 'removed' ? 'Try to rejoin' : 'Try again'}
          </button>
        )}
        <button type="button" className="btn lime" onClick={onBack}>
          Back to Hub
        </button>
      </div>
    </main>
  );
}
