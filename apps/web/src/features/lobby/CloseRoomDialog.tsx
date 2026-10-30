import { ConfirmDialog } from './ConfirmDialog';

export function CloseRoomDialog({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <ConfirmDialog title="Close this room for everyone?" confirmLabel="Close room" cancelLabel="Keep room open" onConfirm={onConfirm} onCancel={onCancel}>
      <p>Everyone is disconnected and the chat, members, and invitation are deleted. This cannot be undone.</p>
    </ConfirmDialog>
  );
}
