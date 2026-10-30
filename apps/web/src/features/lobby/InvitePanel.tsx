import { useState } from 'react';
import { Copy, RefreshCw, Share2 } from 'lucide-react';
import { useAnnouncer } from '../../a11y/announcer';
import type { RunIntent } from './useRoom';

export function InvitePanel({ invitation, run }: { invitation: { code: string; link: string }; run: RunIntent }) {
  const announce = useAnnouncer();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const link = new URL(invitation.link, window.location.origin).href;

  async function regenerate() {
    setConfirming(false);
    const problem = await run({ type: 'invite.regenerate' });
    setError(problem);
    if (!problem) announce('Invitation regenerated. The old code and link no longer work.');
  }

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      announce(`${label} copied.`);
    } catch {
      announce(`Could not copy the ${label.toLowerCase()}. Select it and copy it manually.`);
    }
  }

  return (
    <section aria-labelledby="invite-heading" className="panel stack">
      <h2 id="invite-heading">Invite friends</h2>
      <dl className="invite">
        <dt>Room code</dt>
        <dd><code>{invitation.code}</code></dd>
        <dt>Invite link</dt>
        <dd><code>{link}</code></dd>
      </dl>
      <div className="cluster">
        <button type="button" onClick={() => copy(invitation.code, 'Room code')}><Copy aria-hidden="true" size={18} />Copy code</button>
        <button type="button" onClick={() => copy(link, 'Invite link')}><Copy aria-hidden="true" size={18} />Copy link</button>
        {typeof navigator.share === 'function' ? (
          <button type="button" onClick={() => navigator.share({ title: 'Join my myArena room', url: link }).catch(() => undefined)}>
            <Share2 aria-hidden="true" size={18} />Share
          </button>
        ) : null}
      </div>
      {confirming ? (
        <div role="group" aria-label="Confirm new invitation" className="stack">
          <p>The current code and link will stop working. Regenerate the invitation?</p>
          <div className="cluster">
            <button type="button" onClick={regenerate}>Regenerate</button>
            <button type="button" onClick={() => setConfirming(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setConfirming(true)}><RefreshCw aria-hidden="true" size={18} />New invitation</button>
      )}
      {error ? <p role="alert">{error}</p> : null}
    </section>
  );
}
