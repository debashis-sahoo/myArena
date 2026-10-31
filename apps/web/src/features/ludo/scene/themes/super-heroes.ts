import { buildLook } from './base';
import { shield } from './props';

/** Steel and bold primaries with original shield-and-star ornaments (no names, logos or likenesses). */
export const superHeroes = () => buildLook({
  id: 'super-heroes', background: 0x0b1226,
  table: { kind: 'speckle', base: '#161f3a', fleck: '#5b78c8' }, frame: { kind: 'plain', color: '#8e9bb0' },
  board: { kind: 'plain', color: '#1a2650' }, cell: '#27397a', yard: '#202f66',
  tray: { kind: 'plain', color: '#9aa7b8' }, trayFloor: { kind: 'speckle', base: '#101a3a', fleck: '#3f5bb0' },
  pawn: { metalness: 0.85, roughness: 0.28, clearcoat: 0.6, topperMetalness: 0.95, topperEmissive: 0.18 },
  die: { ground: '#cfd6e2', pip: '#e3242b', clearcoat: 0.7, roughness: 0.28 },
  lighting: { key: 0xdce8ff, keyIntensity: 2.8, fill: 0x6f8cff, fillIntensity: 0.7, environment: 0.85 },
  celebration: { colors: [0xe3242b, 0xffd400, 0x2a5bff, 0xffffff], gravity: 3, spread: 9 },
  props: (bag, palette) => {
    const left = shield(bag, palette.RED);
    left.position.set(-8.9, 0.5, 6.8);
    left.rotation.y = 0.5;
    const right = shield(bag, palette.BLUE);
    right.position.set(8.9, 0.5, -6.8);
    right.rotation.y = -2.6;
    return [left, right];
  },
});
