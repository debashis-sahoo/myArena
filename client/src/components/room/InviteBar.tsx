import { useRef, useState, type ReactElement } from 'react';
import { sfx } from '../../audio/sfx';

async function copyText(text: string, field: HTMLInputElement | null): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Clipboard API unavailable or denied: fall back to selecting the field and the legacy copy command.
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

/** Room code, invite link, and a one-click "Copy Invite Link" (FR-014). The link stays in a selectable field as a fallback. */
export function InviteBar({ invitePath }: { invitePath: string }): ReactElement {
  const link = `${window.location.origin}${invitePath}`;
  const fieldRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<'idle' | 'copied' | 'manual'>('idle');
  const timer = useRef<number | undefined>(undefined);

  const copy = async (): Promise<void> => {
    sfx.tap();
    const ok = await copyText(link, fieldRef.current);
    if (!ok) fieldRef.current?.select();
    setState(ok ? 'copied' : 'manual');
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState('idle'), 2400);
  };

  return (
    <section className="invite" aria-label="Invite friends">
      <div className="invite-row">
        <label className="sr-only" htmlFor="invite-link">
          Invite link
        </label>
        <input
          id="invite-link"
          ref={fieldRef}
          className="field invite-field"
          readOnly
          value={link}
          onFocus={(e) => e.currentTarget.select()}
        />
        <button type="button" className={`btn small ${state === 'copied' ? 'lime' : 'cyan'}`} onClick={() => void copy()}>
          {state === 'copied' ? 'Copied!' : 'Copy Invite Link'}
        </button>
      </div>
      {state === 'manual' && (
        <p className="hint" role="status">
          Could not copy automatically. The link is selected: press Ctrl+C (or long-press) to copy it.
        </p>
      )}
    </section>
  );
}
