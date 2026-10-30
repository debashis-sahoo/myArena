import { useEffect, useRef, type ReactNode } from 'react';

export function ConfirmDialog({ title, children, confirmLabel, cancelLabel = 'Cancel', onConfirm, onCancel }: {
  title: string; children: ReactNode; confirmLabel: string; cancelLabel?: string; onConfirm: () => void; onCancel: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (dialog.current && !dialog.current.open) dialog.current.showModal(); }, []);
  const finish = (callback: () => void) => { dialog.current?.close(); callback(); };

  return (
    <dialog ref={dialog} aria-labelledby="confirm-heading" className="dialog" onCancel={(event) => { event.preventDefault(); finish(onCancel); }}>
      <h2 id="confirm-heading">{title}</h2>
      {children}
      <div className="cluster">
        <button type="button" onClick={() => finish(onCancel)}>{cancelLabel}</button>
        <button type="button" onClick={() => finish(onConfirm)}>{confirmLabel}</button>
      </div>
    </dialog>
  );
}
