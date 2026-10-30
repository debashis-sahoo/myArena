import { useState } from 'react';
import type { RunIntent } from './useRoom';

export function ReadyToggle({ ready, run }: { ready: boolean; run: RunIntent }) {
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="stack">
      <button type="button" aria-pressed={ready} onClick={async () => setError(await run({ type: 'ready.set', ready: !ready }))}>
        I am ready
      </button>
      {error ? <p role="alert">{error}</p> : null}
    </div>
  );
}
