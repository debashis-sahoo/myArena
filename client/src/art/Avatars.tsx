import type { ReactElement } from 'react';
import { AVATAR_KEYS } from '@myarena/shared';

const FACES: Record<string, { emoji: string; from: string; to: string }> = {
  fox: { emoji: '🦊', from: '#ff9a3d', to: '#ff4d6d' },
  panda: { emoji: '🐼', from: '#8be9ff', to: '#4da3ff' },
  tiger: { emoji: '🐯', from: '#ffd93d', to: '#ff7a3d' },
  frog: { emoji: '🐸', from: '#b6ff3b', to: '#2ee59d' },
  owl: { emoji: '🦉', from: '#c9a5ff', to: '#7a4dff' },
  koala: { emoji: '🐨', from: '#9fb3ff', to: '#6d7bff' },
  lion: { emoji: '🦁', from: '#ffcf5c', to: '#ff8a3d' },
  robot: { emoji: '🤖', from: '#7df9ff', to: '#8a5cff' },
};

export const AVATARS = AVATAR_KEYS;

export function Avatar({ k, size = 36, ring }: { k: string; size?: number; ring?: string }): ReactElement {
  const face = FACES[k] ?? FACES.fox!;
  return (
    <span
      className="avatar"
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.58,
        background: `linear-gradient(145deg, ${face.from}, ${face.to})`,
        boxShadow: ring ? `0 0 0 2px ${ring}` : undefined,
      }}
    >
      {face.emoji}
    </span>
  );
}
