import type { ReactElement } from 'react';

/** Approved rendered title artwork; rasterized to preserve exact premium lighting and bevel detail. */
export function Logo({ entryMode }: { entryMode: 'host' | 'player' }): ReactElement {
  const role = entryMode === 'host' ? 'Host Arena' : 'Player Hub';

  return (
    <h1 className="logo" aria-label={`myArena Hub — ${role}`}>
      <img
        className="logo-image"
        src="/brand/myarena-title.webp"
        alt=""
        width="1200"
        height="370"
        draggable="false"
        fetchPriority="high"
      />
    </h1>
  );
}
