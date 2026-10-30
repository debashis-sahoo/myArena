import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ErrorSummary, type FormError } from '../a11y/ErrorSummary';
import { validateName } from '../features/entry/entry-errors';
import { saveDisplayName } from '../platform/preferences';

export function NameDialog({ currentName, onClose }: { currentName: string; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState(currentName);
  const [errors, setErrors] = useState<FormError[]>([]);
  useEffect(() => { if (dialog.current && !dialog.current.open) dialog.current.showModal(); }, []);
  const finish = () => { dialog.current?.close(); onClose(); };

  function save(event: FormEvent) {
    event.preventDefault();
    const checked = validateName(name, 'name-dialog-input');
    if ('errors' in checked) { setErrors(checked.errors); return; }
    saveDisplayName(checked.name);
    finish();
  }

  return (
    <dialog ref={dialog} aria-labelledby="name-dialog-heading" className="dialog" onCancel={(event) => { event.preventDefault(); finish(); }}>
      <h2 id="name-dialog-heading">Your display name</h2>
      <form onSubmit={save} noValidate className="stack">
        <p className="muted">Shown to the people in your rooms and kept only on this device.</p>
        <ErrorSummary errors={errors} />
        <div className="field">
          <label htmlFor="name-dialog-input">Display name</label>
          <input id="name-dialog-input" autoComplete="nickname" value={name} onChange={(event) => setName(event.target.value)} />
        </div>
        <div className="cluster">
          <button type="button" onClick={finish}>Cancel</button>
          <button type="submit" className="btn-primary">Save name</button>
        </div>
      </form>
    </dialog>
  );
}
