import type { ReactElement } from 'react';

const C = { red: '#ff3d5a', green: '#1fd67a', yellow: '#ffc928', blue: '#3d8bff' };

function Pawn({ x, y, color, id }: { x: number; y: number; color: string; id: string }): ReactElement {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx="0" cy="11" rx="10" ry="3.5" fill="rgba(0,0,0,.3)" />
      <path d="M-9 10 Q-9 -2 -4 -4 L4 -4 Q9 -2 9 10 Z" fill={`url(#pawn-${id})`} />
      <circle cx="0" cy="-10" r="7.5" fill={`url(#pawn-${id})`} />
      <ellipse cx="-2.6" cy="-12.5" rx="2.6" ry="2" fill="rgba(255,255,255,.7)" />
      <defs>
        <radialGradient id={`pawn-${id}`} cx="35%" cy="30%" r="80%">
          <stop offset="0" stopColor="#fff" stopOpacity=".85" />
          <stop offset=".25" stopColor={color} />
          <stop offset="1" stopColor={color} stopOpacity=".72" />
        </radialGradient>
      </defs>
    </g>
  );
}

function Die({ x, y, rot, pips }: { x: number; y: number; rot: number; pips: number }): ReactElement {
  const spots: Record<number, [number, number][]> = {
    5: [[-8, -8], [8, -8], [0, 0], [-8, 8], [8, 8]],
    6: [[-8, -8], [8, -8], [-8, 0], [8, 0], [-8, 8], [8, 8]],
  };
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      <rect x="-17" y="-14" width="34" height="34" rx="8" fill="rgba(0,0,0,.28)" />
      <rect x="-17" y="-17" width="34" height="34" rx="8" fill="#fff" stroke="#d9d4f5" strokeWidth="1.5" />
      <rect x="-14" y="-14" width="28" height="12" rx="6" fill="rgba(255,255,255,.9)" />
      {(spots[pips] ?? []).map(([dx, dy], i) => (
        <circle key={i} cx={dx} cy={dy} r="3.2" fill="#2b1b66" />
      ))}
    </g>
  );
}

export function LudoArt(): ReactElement {
  return (
    <svg viewBox="0 0 240 240" role="img" aria-label="Ludo board with colored pawns and dice" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="ludo-board" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#e3dcff" />
        </linearGradient>
        <filter id="ludo-shadow" x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="10" stdDeviation="8" floodColor="#000" floodOpacity=".45" />
        </filter>
      </defs>
      <g transform="translate(20 14) skewX(0)" filter="url(#ludo-shadow)">
        <rect width="200" height="200" rx="20" fill="url(#ludo-board)" />
        {/* home corners */}
        {[
          { x: 0, y: 0, c: C.red },
          { x: 120, y: 0, c: C.green },
          { x: 120, y: 120, c: C.yellow },
          { x: 0, y: 120, c: C.blue },
        ].map(({ x, y, c }) => (
          <g key={c}>
            <rect x={x} y={y} width="80" height="80" rx="16" fill={c} />
            <rect x={x + 12} y={y + 12} width="56" height="56" rx="14" fill="rgba(255,255,255,.92)" />
            {[[26, 26], [54, 26], [26, 54], [54, 54]].map(([dx, dy], i) => (
              <circle key={i} cx={x + (dx ?? 0)} cy={y + (dy ?? 0)} r="7.5" fill={c} opacity=".9" />
            ))}
          </g>
        ))}
        {/* track cross */}
        <g stroke="#c9c1ee" strokeWidth="1">
          {Array.from({ length: 6 }, (_, i) => (
            <g key={i}>
              <rect x={80} y={i * 13.3} width="13.3" height="13.3" fill={i === 1 ? C.green : '#fff'} />
              <rect x={93.3} y={i * 13.3} width="13.3" height="13.3" fill={i > 0 ? C.green : '#fff'} />
              <rect x={106.6} y={i * 13.3} width="13.4" height="13.3" fill="#fff" />
              <rect x={80} y={120 + i * 13.3} width="13.3" height="13.4" fill="#fff" />
              <rect x={93.3} y={120 + i * 13.3} width="13.3" height="13.4" fill={i < 5 ? C.blue : '#fff'} />
              <rect x={106.6} y={120 + i * 13.3} width="13.4" height="13.4" fill={i === 4 ? C.yellow : '#fff'} />
              <rect x={i * 13.3} y={80} width="13.3" height="13.3" fill={i === 1 ? C.red : '#fff'} />
              <rect x={i * 13.3} y={93.3} width="13.3" height="13.3" fill={i > 0 ? C.red : '#fff'} />
              <rect x={i * 13.3} y={106.6} width="13.3" height="13.4" fill="#fff" />
              <rect x={120 + i * 13.3} y={80} width="13.4" height="13.3" fill="#fff" />
              <rect x={120 + i * 13.3} y={93.3} width="13.4" height="13.3" fill={i < 5 ? C.yellow : '#fff'} />
              <rect x={120 + i * 13.3} y={106.6} width="13.4" height="13.4" fill={i === 4 ? C.blue : '#fff'} />
            </g>
          ))}
        </g>
        {/* center star */}
        <polygon points="80,80 100,100 80,120" fill={C.red} />
        <polygon points="80,80 100,100 120,80" fill={C.green} />
        <polygon points="120,80 100,100 120,120" fill={C.yellow} />
        <polygon points="80,120 100,100 120,120" fill={C.blue} />
        <Pawn x={40} y={40} color={C.red} id="r" />
        <Pawn x={160} y={40} color={C.green} id="g" />
        <Pawn x={160} y={160} color={C.yellow} id="y" />
        <Pawn x={40} y={160} color={C.blue} id="b" />
        <Pawn x={106} y={66} color={C.green} id="g2" />
      </g>
      <Die x={34} y={34} rot={-14} pips={5} />
      <Die x={208} y={212} rot={12} pips={6} />
    </svg>
  );
}
