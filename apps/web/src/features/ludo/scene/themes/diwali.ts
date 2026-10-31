import { buildLook } from './base';
import { diya, garland, rangoli } from './props';

/** Brass, diyas, rangoli patterns and warm lamp light. */
export const diwali = () => buildLook({
  id: 'diwali', background: 0x24100a,
  table: { kind: 'wood', base: '#3a1a0e', grain: '#1c0b05' }, frame: { kind: 'plain', color: '#c98f24' },
  board: { kind: 'plain', color: '#f8e1b0' }, cell: '#fff0d2', yard: '#fbe8c0',
  tray: { kind: 'plain', color: '#c98f24' }, trayFloor: { kind: 'speckle', base: '#6a1a2a', fleck: '#e0a030' },
  pawn: { metalness: 0.7, roughness: 0.25, clearcoat: 0.8, topperMetalness: 0.95, topperEmissive: 0.3 },
  die: { ground: '#f4e2b8', pip: '#7a1226', clearcoat: 1, roughness: 0.3 },
  lighting: { key: 0xffc27a, keyIntensity: 2.7, fill: 0xff9a4a, fillIntensity: 0.7, environment: 0.6 },
  celebration: { colors: [0xffc24a, 0xff7a1a, 0xff3a6a, 0xffffff], gravity: 3, spread: 8 },
  props: (bag, palette) => {
    const lamps = [[-8.8, 6.9], [8.8, 6.9], [-8.8, -6.9], [8.8, -6.9]].map(([x, z]) => {
      const lamp = diya(bag);
      lamp.position.set(x!, 0, z!);
      return lamp;
    });
    const art = [rangoli(bag, palette.YELLOW), rangoli(bag, palette.RED)];
    art[0]!.position.set(-9, 0, 0);
    art[1]!.position.set(9, 0, 0);
    const ring = garland(bag, 9.6, 0xffa000, 40);
    ring.position.y = -0.02;
    return [...lamps, ...art, ring];
  },
});
