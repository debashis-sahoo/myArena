import { buildLook } from './base';
import { lantern, pineTree, snowdrift } from './props';

/** Frosted wood and ice, with snow and pine. */
export const winter = () => buildLook({
  id: 'winter', background: 0x1c2b3c,
  table: { kind: 'speckle', base: '#c9d9e8', fleck: '#ffffff' }, frame: { kind: 'wood', base: '#b8c7d6', grain: '#7d93a8' },
  board: { kind: 'plain', color: '#e3f0fa' }, cell: '#ffffff', yard: '#f0f7fc',
  tray: { kind: 'wood', base: '#b8c7d6', grain: '#7d93a8' }, trayFloor: { kind: 'speckle', base: '#7fa6c4', fleck: '#ffffff' },
  pawn: { metalness: 0.05, roughness: 0.08, clearcoat: 1, topperMetalness: 0.2, topperEmissive: 0.12, sheen: 0.6 },
  die: { ground: '#e8f4ff', pip: '#27506e', clearcoat: 1, roughness: 0.15 },
  lighting: { key: 0xe6f2ff, keyIntensity: 2.6, fill: 0x9cc4ff, fillIntensity: 0.8, environment: 0.9 },
  celebration: { colors: [0xffffff, 0xbfe0ff, 0xffe48a], gravity: 1.2, spread: 8 },
  props: (bag) => {
    const trees = [[-8.8, 6.6], [8.9, -6.8], [-9, -6.4]].map(([x, z], index) => {
      const tree = pineTree(bag, 1.5 + index * 0.2);
      tree.position.set(x!, 0, z!);
      return tree;
    });
    const drift = snowdrift(bag);
    drift.position.set(8.8, 0, 6.8);
    const light = lantern(bag, 0xffd27a);
    light.position.set(-8.8, 0, 0);
    return [...trees, drift, light];
  },
});
