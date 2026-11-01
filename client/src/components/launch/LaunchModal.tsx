import { useEffect, useState, type ReactElement } from 'react';
import { useNavigate } from 'react-router';
import type { GameDefinition } from '@myarena/shared';
import { sfx } from '../../audio/sfx';
import { createRoom } from '../../state/roomStore';
import { Modal } from '../common/Modal';
import { AiOpponentPicker } from './AiOpponentPicker';

interface Props {
  game: GameDefinition | null;
  onClose: () => void;
}

/** Game launch modal: two distinct actions, "Play with AI" and "Play Online" (FR-009 to FR-012). */
export function LaunchModal({ game, onClose }: Props): ReactElement {
  const navigate = useNavigate();
  const [step, setStep] = useState<'choose' | 'ai'>('choose');
  const [busy, setBusy] = useState<null | 'online' | 'ai'>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (game) {
      setStep('choose');
      setBusy(null);
      setError(null);
    }
  }, [game]);

  const launch = async (mode: 'online' | 'ai', botCount?: number): Promise<void> => {
    if (!game || busy) return;
    sfx.tap();
    setBusy(mode);
    setError(null);
    const res = await createRoom(mode, botCount);
    if (res.ok) {
      sfx.success();
      navigate(`/room/${game.id}/${res.roomId}`);
    } else {
      sfx.error();
      setError(res.message);
      setBusy(null);
    }
  };

  return (
    <Modal open={game !== null} title={`Play ${game?.name ?? ''}`} onClose={busy ? () => undefined : onClose}>
      {game && step === 'choose' && (
        <div className="launch-step">
          <h2 className="modal-title">Play {game.name}</h2>
          <p className="hint">Practice against the bots, or invite your friends to a private room.</p>
          <div className="launch-choices">
            <button type="button" className="launch-choice ai" onClick={() => setStep('ai')} disabled={busy !== null}>
              <span className="launch-icon" aria-hidden="true">
                🤖
              </span>
              <span className="launch-label">Play with AI</span>
              <span className="launch-sub">Start right away, solo</span>
            </button>
            <button type="button" className="launch-choice online" onClick={() => void launch('online')} disabled={busy !== null}>
              <span className="launch-icon" aria-hidden="true">
                {busy === 'online' ? <span className="spinner small" /> : '🌐'}
              </span>
              <span className="launch-label">{busy === 'online' ? 'Creating room...' : 'Play Online'}</span>
              <span className="launch-sub">Private room with an invite link</span>
            </button>
          </div>
          {error && (
            <p className="error-text" role="alert">
              {error}
            </p>
          )}
        </div>
      )}
      {game && step === 'ai' && (
        <>
          <AiOpponentPicker
            max={game.maxPlayers - 1}
            busy={busy === 'ai'}
            onBack={() => setStep('choose')}
            onConfirm={(n) => void launch('ai', n)}
          />
          {error && (
            <p className="error-text" role="alert">
              {error}
            </p>
          )}
        </>
      )}
    </Modal>
  );
}
