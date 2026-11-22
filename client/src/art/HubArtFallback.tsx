import type { ReactElement } from 'react';

/** Neutral branded artwork used only when an active game image cannot load. */
export function HubArtFallback(): ReactElement {
  return (
    <svg
      className="hub-art-fallback"
      viewBox="0 0 320 320"
      aria-hidden="true"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <radialGradient id="fallback-glow" cx="50%" cy="45%" r="58%">
          <stop offset="0" stopColor="#45e6ff" stopOpacity="0.6" />
          <stop offset="0.52" stopColor="#8b5cf6" stopOpacity="0.26" />
          <stop offset="1" stopColor="#12072e" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="fallback-ring" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#42f5c5" />
          <stop offset="0.5" stopColor="#ffe7a1" />
          <stop offset="1" stopColor="#ff63bd" />
        </linearGradient>
      </defs>
      <circle cx="160" cy="160" r="140" fill="url(#fallback-glow)" />
      <circle cx="160" cy="160" r="92" fill="none" stroke="url(#fallback-ring)" strokeWidth="8" opacity="0.82" />
      <circle cx="160" cy="160" r="62" fill="rgba(16,8,48,.78)" stroke="rgba(255,255,255,.25)" strokeWidth="2" />
      <path
        d="m160 112 11 30 32 2-25 20 8 31-26-17-27 17 8-31-24-20 32-2Z"
        fill="#ffe7a1"
        stroke="#fff"
        strokeWidth="3"
      />
      <circle cx="68" cy="92" r="5" fill="#45e6ff" />
      <circle cx="252" cy="108" r="7" fill="#ff63bd" />
      <path d="m232 228 4 10 11 4-11 4-4 11-4-11-11-4 11-4Z" fill="#fff4bb" />
    </svg>
  );
}
