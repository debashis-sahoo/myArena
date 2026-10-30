import { useEffect, useRef } from 'react';
import type { ParticipantView } from '@myarena/protocol';

export function RemoveMemberDialog({ member, onConfirm, onCancel }: {
  member: ParticipantView; onConfirm: () => void; onCancel: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (dialog.current && !dialog.current.open) dialog.current.showModal(); }, []);
  const finish = (callback: () => void) => { dialog.current?.close(); callback(); };

  return (
    <dialog ref={dialog} aria-labelledby="remove-heading" className="dialog" onCancel={(event) => { event.preventDefault(); finish(onCancel); }}>
      <h2 id="remove-heading">Remove {member.displayLabel}?</h2>
      <p>They lose their seat now. They can only come back as a new member with a valid invitation.</p>
      <div className="cluster">
        <button type="button" onClick={() => finish(onCancel)}>Cancel</button>
        <button type="button" onClick={() => finish(onConfirm)}>Remove member</button>
      </div>
    </dialog>
  );
}
