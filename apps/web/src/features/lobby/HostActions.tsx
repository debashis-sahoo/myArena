import { useState } from 'react';
import type { ParticipantView } from '@myarena/protocol';
import { CloseRoomDialog } from './CloseRoomDialog';
import { HostTransferDialog } from './HostTransferDialog';
import type { RunIntent } from './useRoom';

export function HostActions({ participants, selfId, run }: { participants: ParticipantView[]; selfId: string; run: RunIntent }) {
  const [dialog, setDialog] = useState<'transfer' | 'close' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const candidates = participants.filter((member) => member.id !== selfId);

  return (
    <section aria-labelledby="host-actions-heading" className="panel stack">
      <h2 id="host-actions-heading">Host actions</h2>
      <div className="cluster">
        <button type="button" disabled={candidates.length === 0} onClick={() => setDialog('transfer')}>Hand off host role</button>
        <button type="button" onClick={() => setDialog('close')}>Close room</button>
      </div>
      {candidates.length === 0 ? <p>Handing off needs another member in the room.</p> : null}
      {error ? <p role="alert">{error}</p> : null}
      {dialog === 'transfer' ? (
        <HostTransferDialog candidates={candidates} onCancel={() => setDialog(null)}
          onConfirm={async (targetParticipantId) => { setDialog(null); setError(await run({ type: 'host.transfer', targetParticipantId })); }} />
      ) : null}
      {dialog === 'close' ? (
        <CloseRoomDialog onCancel={() => setDialog(null)} onConfirm={async () => { setDialog(null); setError(await run({ type: 'room.close' })); }} />
      ) : null}
    </section>
  );
}
