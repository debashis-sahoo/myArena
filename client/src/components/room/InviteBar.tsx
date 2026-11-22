import { useId, useRef, useState, type ReactElement } from 'react';
import { formatRoomCode } from '@myarena/shared';
import { sfx } from '../../audio/sfx';

async function copyText(text: string, field: HTMLInputElement | null): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    if (field) {
      field.focus();
      field.select();
      try {
        return document.execCommand('copy');
      } catch {
        return false;
      }
    }
    return false;
  }
}

interface Props {
  roomId: string;
  invitePath: string;
  compact?: boolean;
}

type CopyTarget = 'code' | 'link';

/** Shared room code and invite URL controls for lobbies and compact custom-game headers. */
export function InviteBar({ roomId, invitePath, compact = false }: Props): ReactElement {
  const id = useId();
  const link = `${window.location.origin}${invitePath}`;
  const codeFieldRef = useRef<HTMLInputElement>(null);
  const linkFieldRef = useRef<HTMLInputElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const [state, setState] = useState<{ target: CopyTarget; status: 'copied' | 'manual' } | null>(null);

  const copy = async (target: CopyTarget): Promise<void> => {
    sfx.tap();
    const field = target === 'code' ? codeFieldRef.current : linkFieldRef.current;
    const ok = await copyText(target === 'code' ? roomId : link, field);
    if (!ok) field?.select();
    setState({ target, status: ok ? 'copied' : 'manual' });
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState(null), 2400);
  };

  const controls = (
    <div className="invite-content">
      <div className="invite-code-row">
        <label htmlFor={`${id}-code`}>Room code</label>
        <input
          id={`${id}-code`}
          ref={codeFieldRef}
          className="field invite-code-field"
          readOnly
          value={formatRoomCode(roomId)}
          onFocus={(event) => event.currentTarget.select()}
        />
        <button
          type="button"
          className={`btn small ${state?.target === 'code' && state.status === 'copied' ? 'lime' : 'cyan'}`}
          onClick={() => void copy('code')}
        >
          {state?.target === 'code' && state.status === 'copied' ? 'Code copied!' : 'Copy code'}
        </button>
      </div>
      <div className="invite-row">
        <label className="sr-only" htmlFor={`${id}-link`}>
          Invite link
        </label>
        <input
          id={`${id}-link`}
          ref={linkFieldRef}
          className="field invite-field"
          readOnly
          value={link}
          onFocus={(event) => event.currentTarget.select()}
        />
        <button
          type="button"
          className={`btn small ${state?.target === 'link' && state.status === 'copied' ? 'lime' : 'cyan'}`}
          onClick={() => void copy('link')}
        >
          {state?.target === 'link' && state.status === 'copied' ? 'Link copied!' : 'Copy invite link'}
        </button>
      </div>
      {state?.status === 'manual' && (
        <p className="hint" role="status">
          Could not copy automatically. The selected {state.target === 'code' ? 'code' : 'link'} is ready for manual copy.
        </p>
      )}
    </div>
  );

  if (compact) {
    return (
      <details className="invite-compact">
        <summary className="invite-summary" aria-label={`Invite to room ${formatRoomCode(roomId)}`}>
          <span className="code-chip">{formatRoomCode(roomId)}</span>
          <span aria-hidden="true">↗</span>
        </summary>
        <div className="invite-popover">{controls}</div>
      </details>
    );
  }

  return (
    <section className="invite" aria-label="Invite friends">
      {controls}
    </section>
  );
}
