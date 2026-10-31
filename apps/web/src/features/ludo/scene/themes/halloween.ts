import { buildLook } from './base';
import { bat, pumpkin } from './props';

/** Slate and candle light, with pumpkins and bats. */
export const halloween = () => buildLook({
  id: 'halloween', background: 0x120a1a,
  table: { kind: 'speckle', base: '#1b1424', fleck: '#6a4a8a' }, frame: { kind: 'wood', base: '#2b2030', grain: '#120c16' },
  board: { kind: 'plain', color: '#241a30' }, cell: '#3a2850', yard: '#2d2040',
  tray: { kind: 'wood', base: '#2b2030', grain: '#120c16' }, trayFloor: { kind: 'speckle', base: '#1a0f24', fleck: '#6b3fa0' },
  pawn: { metalness: 0.1, roughness: 0.45, clearcoat: 0.7, topperMetalness: 0.2, topperEmissive: 0.35 },
  die: { ground: '#e9dfc9', pip: '#d9381e', clearcoat: 0.6, roughness: 0.45 },
  lighting: { key: 0xffb566, keyIntensity: 2.6, fill: 0x8a5bd0, fillIntensity: 0.9, environment: 0.45 },
  celebration: { colors: [0xf59e0b, 0x7b4bd1, 0xffffff], gravity: 2, spread: 7 },
  props: (bag) => {
    const first = pumpkin(bag);
    first.position.set(-8.7, 0, -6.6);
    const second = pumpkin(bag);
    second.position.set(8.8, 0, 6.9);
    second.scale.setScalar(0.8);
    const flier = bat(bag);
    flier.position.set(-7, 2.2, 7.4);
    const other = bat(bag);
    other.position.set(7.6, 2.8, -7);
    other.rotation.y = 2;
    return [first, second, flier, other];
  },
});
