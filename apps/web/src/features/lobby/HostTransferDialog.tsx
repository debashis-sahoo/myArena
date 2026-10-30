import { useState } from 'react';
import type { ParticipantView } from '@myarena/protocol';
import { ConfirmDialog } from './ConfirmDialog';

export function HostTransferDialog({ candidates, onConfirm, onCancel }: {
  candidates: ParticipantView[]; onConfirm: (participantId: string) => void; onCancel: () => void;
}) {
  const [target, setTarget] = useState(candidates[0]?.id ?? '');
  return (
    <ConfirmDialog title="Hand off the host role" confirmLabel="Hand off" onConfirm={() => onConfirm(target)} onCancel={onCancel}>
      <p>The new host controls the room. You become a player.</p>
      <div className="field">
        <label htmlFor="host-target">New host</label>
        <select id="host-target" value={target} onChange={(event) => setTarget(event.target.value)}>
          {candidates.map((member) => <option key={member.id} value={member.id}>{member.displayLabel}</option>)}
        </select>
      </div>
    </ConfirmDialog>
  );
}
