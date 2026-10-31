/** The camera toggle: a real button with a pressed state, so it works with a keyboard and a screen reader. */
export function ViewToggle({ top, onToggle }: { top: boolean; onToggle: () => void }) {
  return (
    <button type="button" className="btn-quiet ludo-view-toggle" aria-pressed={top} onClick={onToggle}>
      Top-down view
    </button>
  );
}
