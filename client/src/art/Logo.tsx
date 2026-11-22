import type { ReactElement } from 'react';

/** Approved rendered title artwork; rasterized to preserve exact premium lighting and bevel detail. */
export function Logo({ entryMode }: { entryMode: 'host' | 'player' }): ReactElement {
  const role = entryMode === 'host' ? 'Host Arena' : 'Player Hub';

  return (
    <h1 className="logo" aria-label={`myArena Hub — ${role}`}>
      <img
        className="logo-image"
        src={`/brand/myarena-title-${entryMode}.png`}
        alt=""
        draggable="false"
        fetchPriority="high"
      />
    </h1>
  );
}
