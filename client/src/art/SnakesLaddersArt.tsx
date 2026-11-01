import type { ReactElement } from 'react';

const PALETTE = ['#ff5d73', '#ffb347', '#ffe066', '#5be584', '#4db8ff', '#b184ff'];

export function SnakesLaddersArt(): ReactElement {
  const cells: ReactElement[] = [];
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 7; c++) {
      cells.push(
        <rect
          key={`${r}-${c}`}
          x={c * 26}
          y={r * 26}
          width="26"
          height="26"
          fill={PALETTE[(r + c) % PALETTE.length]}
          stroke="rgba(255,255,255,.55)"
          strokeWidth="1"
        />,
      );
    }
  }
  return (
    <svg viewBox="0 0 240 240" role="img" aria-label="Snakes and ladders board" preserveAspectRatio="xMidYMid meet">
      <defs>
        <filter id="snl-shadow" x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="10" stdDeviation="8" floodColor="#000" floodOpacity=".45" />
        </filter>
        <linearGradient id="snake" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7dff6b" />
          <stop offset="1" stopColor="#0aa84a" />
        </linearGradient>
      </defs>
      <g transform="translate(29 24)" filter="url(#snl-shadow)">
        <g>{cells}</g>
        <rect width="182" height="182" fill="none" stroke="#fff" strokeWidth="4" rx="4" />
        {/* ladder */}
        <g transform="rotate(14 60 140)">
          <rect x="28" y="40" width="6" height="130" rx="3" fill="#8a4b12" />
          <rect x="52" y="40" width="6" height="130" rx="3" fill="#8a4b12" />
          {[56, 78, 100, 122, 144].map((y) => (
            <rect key={y} x="28" y={y} width="30" height="5" rx="2.5" fill="#c77a2b" />
          ))}
        </g>
        {/* snake */}
        <path
          d="M150 20 C 190 40, 110 70, 140 100 C 170 130, 100 140, 118 172"
          fill="none"
          stroke="url(#snake)"
          strokeWidth="14"
          strokeLinecap="round"
        />
        <path
          d="M150 20 C 190 40, 110 70, 140 100 C 170 130, 100 140, 118 172"
          fill="none"
          stroke="#145d2c"
          strokeWidth="3"
          strokeDasharray="2 10"
          strokeLinecap="round"
        />
        <circle cx="152" cy="14" r="10" fill="url(#snake)" />
        <circle cx="148" cy="11" r="2.6" fill="#fff" />
        <circle cx="156" cy="11" r="2.6" fill="#fff" />
        <circle cx="148" cy="11" r="1.2" fill="#111" />
        <circle cx="156" cy="11" r="1.2" fill="#111" />
        <path d="M152 24 l0 7 m0 0 l-3 3 m3 -3 l3 3" stroke="#ff3d5a" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      </g>
    </svg>
  );
}
