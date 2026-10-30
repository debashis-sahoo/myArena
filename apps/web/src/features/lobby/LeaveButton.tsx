import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ApiError, apiRequest } from '../../platform/api-client';
import { clearLastRoom } from '../../platform/last-room';
import { ConfirmDialog } from './ConfirmDialog';

export function LeaveButton({ roomId }: { roomId: string }) {
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function leave() {
    setConfirming(false);
    try {
      await apiRequest(`/api/rooms/${encodeURIComponent(roomId)}/leave`, { method: 'POST' });
      clearLastRoom();
      navigate('/');
    } catch (failure) {
      if (failure instanceof ApiError && failure.status === 401) { clearLastRoom(); navigate('/'); return; }
      setError('We could not confirm that you left, so your seat may still be held. Try Leave again.');
    }
  }

  return (
    <div className="stack">
      <button type="button" onClick={() => { setError(null); setConfirming(true); }}>Leave room</button>
      {error ? <p role="alert">{error}</p> : null}
      {confirming ? (
        <ConfirmDialog title="Leave this room?" confirmLabel="Leave room" cancelLabel="Stay" onConfirm={leave} onCancel={() => setConfirming(false)}>
          <p>Your seat is released right away. To come back you need a valid invitation.</p>
        </ConfirmDialog>
      ) : null}
    </div>
  );
}
