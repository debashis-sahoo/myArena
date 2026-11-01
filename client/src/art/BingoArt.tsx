import type { ReactElement } from 'react';

const HEADER = [
  { l: 'B', c: '#ff4d6d' },
  { l: 'I', c: '#ffb347' },
  { l: 'N', c: '#2ee59d' },
  { l: 'G', c: '#4da3ff' },
  { l: 'O', c: '#b184ff' },
];
const GRID = [
  [12, 24, 41, 59, 64],
  [5, 18, 0, 52, 73],
  [9, 31, 38, 47, 68],
  [14, 26, 44, 56, 71],
];

function Ball({ x, y, n, c }: { x: number; y: number; n: string; c: string }): ReactElement {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r="17" fill={c} stroke="#fff" strokeWidth="2.5" />
      <circle r="9.5" fill="#fff" />
      <ellipse cx="-6" cy="-9" rx="5" ry="3" fill="rgba(255,255,255,.65)" />
      <text y="4" textAnchor="middle" fontSize="11" fontWeight="800" fill="#2b1b66">
        {n}
      </text>
    </g>
  );
}

export function BingoArt(): ReactElement {
  return (
    <svg viewBox="0 0 240 240" role="img" aria-label="Bingo card with number balls" preserveAspectRatio="xMidYMid meet">
      <defs>
        <filter id="bin-shadow" x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="#000" floodOpacity=".45" />
        </filter>
        <linearGradient id="bin-card" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8a5cff" />
          <stop offset="1" stopColor="#5a2fd8" />
        </linearGradient>
      </defs>
      <g transform="translate(40 18) rotate(-4 80 100)" filter="url(#bin-shadow)">
        <rect width="160" height="190" rx="14" fill="url(#bin-card)" stroke="#fff" strokeWidth="2" />
        {HEADER.map((h, i) => (
          <g key={h.l}>
            <rect x={10 + i * 28} y={10} width="26" height="26" rx="6" fill={h.c} />
            <text x={23 + i * 28} y={29} textAnchor="middle" fontSize="17" fontWeight="900" fill="#fff">
              {h.l}
            </text>
          </g>
        ))}
        {GRID.map((row, r) =>
          row.map((n, c) => {
            const marked = (r === 1 && c === 1) || (r === 2 && c === 3);
            const free = n === 0;
            return (
              <g key={`${r}-${c}`}>
                <rect x={10 + c * 28} y={42 + r * 34} width="26" height="30" rx="5" fill={free ? '#ffd93d' : '#fff'} />
                <text x={23 + c * 28} y={62 + r * 34} textAnchor="middle" fontSize={free ? 8 : 12} fontWeight="800" fill="#2b1b66">
                  {free ? 'FREE' : n}
                </text>
                {marked && <circle cx={23 + c * 28} cy={57 + r * 34} r="12" fill="#ff3d5a" opacity=".85" />}
                {marked && (
                  <text x={23 + c * 28} y={62 + r * 34} textAnchor="middle" fontSize="12" fontWeight="800" fill="#fff">
                    {n}
                  </text>
                )}
              </g>
            );
          }),
        )}
      </g>
      <Ball x={34} y={190} n="B12" c="#ff4d6d" />
      <Ball x={204} y={46} n="G52" c="#4da3ff" />
      <Ball x={208} y={196} n="O71" c="#ffb347" />
    </svg>
  );
}
