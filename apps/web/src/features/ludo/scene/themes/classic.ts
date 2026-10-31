import { CylinderGeometry, Mesh, MeshStandardMaterial } from 'three';
import { buildLook } from './base';

/** Polished wood, glass and brass: the traditional look, with brass studs at the frame corners. */
export const classic = () => buildLook({
  id: 'classic', background: 0x2a1c12,
  table: { kind: 'wood', base: '#4a3020', grain: '#2a180c' }, frame: { kind: 'wood', base: '#6b4426', grain: '#38200f' },
  board: { kind: 'plain', color: '#f1e4c8' }, cell: '#fffaf0', yard: '#fbf2de',
  tray: { kind: 'wood', base: '#5a3a20', grain: '#2d1a0b' }, trayFloor: { kind: 'speckle', base: '#1f5a3a', fleck: '#0c2a1a' },
  pawn: { metalness: 0.05, roughness: 0.12, clearcoat: 1, topperMetalness: 0.85, topperEmissive: 0.05 },
  die: { ground: '#f6efde', pip: '#15131a', clearcoat: 1, roughness: 0.3 },
  lighting: { key: 0xfff0d8, keyIntensity: 2.4, fill: 0xbcd4ff, fillIntensity: 0.5, environment: 0.7 },
  celebration: { colors: [0xffd27a, 0xffffff, 0xd63a2f], gravity: 5, spread: 6 },
  props: (bag) => {
    const brass = bag.material(new MeshStandardMaterial({ color: 0xc9a14a, metalness: 0.95, roughness: 0.25 }));
    const stud = bag.geometry(new CylinderGeometry(0.22, 0.26, 0.2, 18));
    return [[-8.05, 8.05], [8.05, 8.05], [-8.05, -8.05], [8.05, -8.05]].map(([x, z]) => {
      const mesh = new Mesh(stud, brass);
      mesh.position.set(x!, 0.22, z!);
      mesh.castShadow = true;
      return mesh;
    });
  },
});
