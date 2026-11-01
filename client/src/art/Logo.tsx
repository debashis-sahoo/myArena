import type { ReactElement } from 'react';

/** "myArena Hub" arcade wordmark: gradient lettering, drop shadow, glowing crown. */
export function Logo(): ReactElement {
  return (
    <h1 className="logo" aria-label="myArena Hub">
      <svg className="logo-crown" viewBox="0 0 64 40" aria-hidden="true">
        <defs>
          <linearGradient id="crown-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff3a8" />
            <stop offset="1" stopColor="#ffb300" />
          </linearGradient>
        </defs>
        <path d="M4 34 L8 10 L22 22 L32 4 L42 22 L56 10 L60 34 Z" fill="url(#crown-grad)" stroke="#a86400" strokeWidth="2" strokeLinejoin="round" />
        <circle cx="8" cy="9" r="3.5" fill="#ff3dac" />
        <circle cx="32" cy="4" r="3.8" fill="#27e0ff" />
        <circle cx="56" cy="9" r="3.5" fill="#b6ff3b" />
        <rect x="4" y="32" width="56" height="6" rx="3" fill="#ffd84a" stroke="#a86400" strokeWidth="1.5" />
      </svg>
      <span className="logo-text" aria-hidden="true">
        <span className="logo-my">my</span>
        <span className="logo-arena">Arena</span>
        <span className="logo-hub">Hub</span>
      </span>
    </h1>
  );
}
