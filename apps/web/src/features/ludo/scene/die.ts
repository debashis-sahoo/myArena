import { Group, Mesh, MeshPhysicalMaterial } from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { ThemeLook } from './look';
import { pipFace } from './textures';

// The face on each side of the cube, in three.js material order (+x, -x, +y, -y, +z, -z); opposite faces add up to 7.
const FACE_FOR_SIDE = [3, 4, 1, 6, 2, 5] as const;

export interface DieObject { object: Group; dispose: () => void; }

/** A rounded ivory cube with a clear coat and pips pressed into each face. Edge length 1. */
export function createDie(look: ThemeLook['die'], seed: number): DieObject {
  const geometry = new RoundedBoxGeometry(1, 1, 1, 5, 0.09);
  const textures: { dispose: () => void }[] = [];
  const materials = FACE_FOR_SIDE.map((face) => {
    const { map, bump } = pipFace(face, look.ground, look.pip, seed);
    textures.push(map, bump);
    return new MeshPhysicalMaterial({
      map, bumpMap: bump, bumpScale: 2.2, roughness: look.roughness, metalness: 0, clearcoat: look.clearcoat, clearcoatRoughness: 0.12,
    });
  });
  const mesh = new Mesh(geometry, materials);
  mesh.castShadow = true;
  const object = new Group();
  object.add(mesh);
  return {
    object,
    dispose() {
      geometry.dispose();
      for (const material of materials) material.dispose();
      for (const texture of textures) texture.dispose();
    },
  };
}
