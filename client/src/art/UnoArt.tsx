import type { ReactElement, ReactNode } from 'react';

const BURST = Array.from({ length: 24 }, (_, i) => {
  const a = (Math.PI * i) / 12 - Math.PI / 2;
  const r = i % 2 === 0 ? 40 : 31;
  return `${(Math.cos(a) * r).toFixed(1)},${(Math.sin(a) * r).toFixed(1)}`;
}).join(' ');

const SPARKS: [number, number, number][] = [
  [26, 52, 7],
  [18, 196, 5],
  [222, 176, 6],
];

/** A card centred on the origin: white rim, coloured face, glossy top. */
function Card({ face, children }: { face: string; children: ReactNode }): ReactElement {
  return (
    <g>
      <rect x="-42" y="-61" width="84" height="122" rx="11" fill="#fff" />
      <rect x="-37" y="-56" width="74" height="112" rx="7" fill={face} />
      <rect x="-37" y="-56" width="74" height="36" rx="7" fill="rgba(255,255,255,.1)" />
      {children}
    </g>
  );
}

function Oval({ children }: { children?: ReactNode }): ReactElement {
  return (
    <g>
      <ellipse rx="29" ry="46" transform="rotate(32)" fill="#fff" />
      {children}
    </g>
  );
}

function Ban({ r, w, c }: { r: number; w: number; c: string }): ReactElement {
  const d = r * 0.7;
  return (
    <g fill="none" stroke={c} strokeWidth={w} strokeLinecap="round">
      <circle r={r} />
      <line x1={-d} y1={-d} x2={d} y2={d} />
    </g>
  );
}

export function UnoArt(): ReactElement {
  return (
    <svg viewBox="0 0 240 240" role="img" aria-label="UNO cards: red 7, wild and yellow skip" preserveAspectRatio="xMidYMid meet">
      <defs>
        <radialGradient id="uno-glow" cx="50%" cy="52%" r="50%">
          <stop offset="0" stopColor="#c79bff" stopOpacity=".85" />
          <stop offset=".55" stopColor="#8a4dff" stopOpacity=".4" />
          <stop offset="1" stopColor="#6a2fe0" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="uno-red" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ff5a73" />
          <stop offset="1" stopColor="#d3173e" />
        </linearGradient>
        <linearGradient id="uno-yellow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe063" />
          <stop offset="1" stopColor="#f5ac00" />
        </linearGradient>
        <linearGradient id="uno-wild" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2c1b57" />
          <stop offset="1" stopColor="#120a2e" />
        </linearGradient>
        <linearGradient id="uno-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff08a" />
          <stop offset="1" stopColor="#ffb300" />
        </linearGradient>
        <clipPath id="uno-wild-clip">
          <ellipse rx="29" ry="46" transform="rotate(32)" />
        </clipPath>
        <filter id="uno-shadow" x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="#000" floodOpacity=".45" />
        </filter>
      </defs>

      <circle cx="120" cy="122" r="116" fill="url(#uno-glow)" />
      {SPARKS.map(([x, y, s]) => (
        <path
          key={`${x}-${y}`}
          transform={`translate(${x} ${y}) scale(${s})`}
          d="M0 -1 Q.15 -.15 1 0 Q.15 .15 0 1 Q-.15 .15 -1 0 Q-.15 -.15 0 -1Z"
          fill="#fff6c2"
        />
      ))}

      <g filter="url(#uno-shadow)">
        <g transform="translate(66 134) rotate(-22)">
          <Card face="url(#uno-red)">
            <Oval>
              <text y="20" textAnchor="middle" fontSize="58" fontWeight="900" fill="#d3173e">
                7
              </text>
            </Oval>
            <text x="-26" y="-33" textAnchor="middle" fontSize="17" fontWeight="900" fill="#fff">
              7
            </text>
            <g transform="rotate(180)">
              <text x="-26" y="-33" textAnchor="middle" fontSize="17" fontWeight="900" fill="#fff">
                7
              </text>
            </g>
          </Card>
        </g>
        <g transform="translate(174 134) rotate(22)">
          <Card face="url(#uno-yellow)">
            <Oval>
              <Ban r={19} w={7.5} c="#e39a00" />
            </Oval>
            <g transform="translate(-26 -40)">
              <Ban r={6} w={2.6} c="#fff" />
            </g>
            <g transform="translate(26 40)">
              <Ban r={6} w={2.6} c="#fff" />
            </g>
          </Card>
        </g>
        <g transform="translate(120 124)">
          <Card face="url(#uno-wild)">
            <Oval />
            <g clipPath="url(#uno-wild-clip)">
              <path d="M0 0 L0 -60 A60 60 0 0 1 60 0 Z" fill="#ff3d5a" />
              <path d="M0 0 L60 0 A60 60 0 0 1 0 60 Z" fill="#3d8bff" />
              <path d="M0 0 L0 60 A60 60 0 0 1 -60 0 Z" fill="#1fd67a" />
              <path d="M0 0 L-60 0 A60 60 0 0 1 0 -60 Z" fill="#ffc928" />
              <g stroke="#fff" strokeWidth="3">
                <line x1="0" y1="-60" x2="0" y2="60" />
                <line x1="-60" y1="0" x2="60" y2="0" />
              </g>
            </g>
            <circle r="6" fill="#fff" />
          </Card>
        </g>
      </g>

      <g transform="translate(197 44) rotate(10)" filter="url(#uno-shadow)">
        <polygon points={BURST} fill="url(#uno-gold)" stroke="#fff" strokeWidth="2.5" strokeLinejoin="round" />
        <text
          y="7"
          textAnchor="middle"
          fontSize="19"
          fontWeight="900"
          fill="#e3173f"
          stroke="#fff"
          strokeWidth="3.5"
          strokeLinejoin="round"
          paintOrder="stroke"
        >
          UNO!
        </text>
      </g>
    </svg>
  );
}
