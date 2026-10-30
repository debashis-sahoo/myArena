import { useState } from 'react';
import type { ParticipantView } from '@myarena/protocol';
import { RemoveMemberDialog } from './RemoveMemberDialog';
import type { RunIntent } from './useRoom';

export function MemberList({ participants, selfId, isHost, run }: {
  participants: ParticipantView[]; selfId: string; isHost: boolean; run: RunIntent;
}) {
  const [target, setTarget] = useState<ParticipantView | null>(null);
  const [error, setError] = useState<string | null>(null);
  return (
    <section aria-labelledby="members-heading" className="panel stack">
      <h2 id="members-heading">Members ({participants.length})</h2>
      <ul aria-label="Members" className="member-list">
        {participants.map((member) => (
          <li key={member.id}>
            <span className="member-name">{member.displayLabel}{member.id === selfId ? ' (you)' : ''}</span>
            <span className="badge">{member.role === 'HOST' ? 'Host' : 'Player'}</span>
            <span className="badge">{member.connection === 'CONNECTED' ? 'Connected' : 'Disconnected'}</span>
            <span className="badge">{member.ready ? 'Ready' : 'Not ready'}</span>
            {isHost && member.id !== selfId ? (
              <button type="button" onClick={() => setTarget(member)}>Remove<span className="sr-only"> {member.displayLabel}</span></button>
            ) : null}
          </li>
        ))}
      </ul>
      {error ? <p role="alert">{error}</p> : null}
      {target ? (
        <RemoveMemberDialog member={target} onCancel={() => setTarget(null)}
          onConfirm={async () => { setTarget(null); setError(await run({ type: 'member.remove', targetParticipantId: target.id })); }} />
      ) : null}
    </section>
  );
}
