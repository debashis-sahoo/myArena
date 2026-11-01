import type { ReactElement } from 'react';

function Ticket({ x, y, rot, hue, nums }: { x: number; y: number; rot: number; hue: string; nums: number[] }): ReactElement {
  const cells: ReactElement[] = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 9; c++) {
      const n = nums[(r * 9 + c) % nums.length] ?? 0;
      const filled = (r * 3 + c * 5) % 4 !== 0;
      cells.push(
        <g key={`${r}-${c}`}>
          <rect x={6 + c * 14} y={8 + r * 18} width="14" height="18" fill={filled ? '#fff8e6' : hue} stroke="#7a5a1f" strokeWidth=".7" />
          {filled && (
            <text x={13 + c * 14} y={21 + r * 18} fontSize="8.5" fontWeight="700" textAnchor="middle" fill="#3a2a08">
              {n}
            </text>
          )}
        </g>,
      );
    }
  }
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      <rect width="138" height="66" rx="6" fill={hue} stroke="#7a5a1f" strokeWidth="1.2" />
      <rect x="3" y="3" width="132" height="60" rx="4" fill="none" stroke="rgba(255,255,255,.7)" strokeDasharray="3 3" />
      {cells}
    </g>
  );
}

export function HousieArt(): ReactElement {
  const chips = [
    { x: 30, y: 196, c: '#ff4d6d' },
    { x: 54, y: 208, c: '#ffd93d' },
    { x: 196, y: 190, c: '#4da3ff' },
    { x: 178, y: 208, c: '#2ee59d' },
    { x: 214, y: 208, c: '#b184ff' },
  ];
  return (
    <svg viewBox="0 0 240 240" role="img" aria-label="Housie tickets and number chips" preserveAspectRatio="xMidYMid meet">
      <defs>
        <filter id="hou-shadow" x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="#000" floodOpacity=".45" />
        </filter>
      </defs>
      <g filter="url(#hou-shadow)">
        <Ticket x={44} y={22} rot={-8} hue="#ffc4d6" nums={[4, 17, 23, 36, 48, 52, 61, 75, 88, 9, 29, 40, 57, 66, 82]} />
        <Ticket x={34} y={80} rot={5} hue="#bfe3ff" nums={[7, 12, 31, 33, 45, 59, 64, 71, 90, 3, 19, 28, 44, 56, 78]} />
        <Ticket x={50} y={138} rot={-4} hue="#c9f5c0" nums={[1, 14, 26, 38, 41, 53, 67, 70, 85, 8, 22, 35, 49, 63, 80]} />
      </g>
      {chips.map((p, i) => (
        <g key={i} filter="url(#hou-shadow)">
          <circle cx={p.x} cy={p.y} r="14" fill={p.c} stroke="#fff" strokeWidth="2.5" />
          <circle cx={p.x} cy={p.y} r="9" fill="none" stroke="rgba(255,255,255,.7)" strokeDasharray="2 3" />
          <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize="11" fontWeight="800" fill="#fff">
            {[7, 42, 90, 15, 63][i]}
          </text>
        </g>
      ))}
    </svg>
  );
}
