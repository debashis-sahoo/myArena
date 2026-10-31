import {
  BoxGeometry, ConeGeometry, CylinderGeometry, DoubleSide, ExtrudeGeometry, Group, LatheGeometry, Mesh, MeshStandardMaterial, OctahedronGeometry,
  Shape, SphereGeometry, TorusGeometry, Vector2,
} from 'three';
import type { Bag } from './bag';

const standard = (bag: Bag, color: number, options: { roughness?: number; metalness?: number; emissive?: number; emissiveIntensity?: number } = {}) =>
  bag.material(new MeshStandardMaterial({ color, roughness: options.roughness ?? 0.7, metalness: options.metalness ?? 0, emissive: options.emissive ?? 0x000000, emissiveIntensity: options.emissiveIntensity ?? 1 }));

const shadowed = (mesh: Mesh): Mesh => { mesh.castShadow = true; mesh.receiveShadow = true; return mesh; };

/** A pine tree: stacked cones on a trunk. */
export function pineTree(bag: Bag, height = 1.6): Group {
  const group = new Group();
  const leaves = standard(bag, 0x1d5a3a, { roughness: 0.9 });
  const snow = standard(bag, 0xf4f8ff, { roughness: 0.95 });
  const trunk = shadowed(new Mesh(bag.geometry(new CylinderGeometry(0.08, 0.1, 0.35, 8)), standard(bag, 0x5a3b22)));
  trunk.position.y = 0.17;
  group.add(trunk);
  for (let tier = 0; tier < 3; tier += 1) {
    const radius = 0.55 - tier * 0.14;
    const cone = shadowed(new Mesh(bag.geometry(new ConeGeometry(radius, height * 0.42, 10)), tier === 2 ? snow : leaves));
    cone.position.y = 0.55 + tier * height * 0.26;
    group.add(cone);
  }
  return group;
}

/** A pumpkin: a ridged sphere with a stalk. */
export function pumpkin(bag: Bag): Group {
  const group = new Group();
  const skin = standard(bag, 0xe8711a, { roughness: 0.55, emissive: 0x6a2a00, emissiveIntensity: 0.35 });
  for (let rib = 0; rib < 5; rib += 1) {
    const body = shadowed(new Mesh(bag.geometry(new SphereGeometry(0.34, 14, 12)), skin));
    body.scale.set(0.62, 0.86, 0.62);
    body.position.x = (rib - 2) * 0.1;
    body.position.y = 0.3;
    group.add(body);
  }
  const stalk = shadowed(new Mesh(bag.geometry(new CylinderGeometry(0.04, 0.06, 0.16, 6)), standard(bag, 0x3b5a1f)));
  stalk.position.y = 0.68;
  group.add(stalk);
  return group;
}

/** A flat bat silhouette with wings. */
export function bat(bag: Bag): Group {
  const shape = new Shape();
  shape.moveTo(0, 0.1);
  shape.quadraticCurveTo(0.2, 0.32, 0.5, 0.18);
  shape.quadraticCurveTo(0.42, 0.05, 0.5, -0.12);
  shape.quadraticCurveTo(0.28, 0, 0.14, -0.1);
  shape.lineTo(0, -0.04);
  shape.lineTo(-0.14, -0.1);
  shape.quadraticCurveTo(-0.28, 0, -0.5, -0.12);
  shape.quadraticCurveTo(-0.42, 0.05, -0.5, 0.18);
  shape.quadraticCurveTo(-0.2, 0.32, 0, 0.1);
  const geometry = bag.geometry(new ExtrudeGeometry(shape, { depth: 0.03, bevelEnabled: false }));
  const mesh = shadowed(new Mesh(geometry, bag.material(new MeshStandardMaterial({ color: 0x15101c, roughness: 0.8, side: DoubleSide }))));
  mesh.rotation.x = -Math.PI / 2.4;
  const group = new Group();
  group.add(mesh);
  return group;
}

/** A diya: a brass bowl with a small glowing flame. */
export function diya(bag: Bag): Group {
  const group = new Group();
  const profile = [new Vector2(0, 0), new Vector2(0.18, 0.02), new Vector2(0.3, 0.12), new Vector2(0.32, 0.2), new Vector2(0.26, 0.18), new Vector2(0, 0.1)];
  const bowl = shadowed(new Mesh(bag.geometry(new LatheGeometry(profile, 20)), standard(bag, 0xd49a2a, { metalness: 0.85, roughness: 0.3 })));
  group.add(bowl);
  const flame = new Mesh(bag.geometry(new SphereGeometry(0.07, 10, 8)), standard(bag, 0xffc24a, { emissive: 0xff9a1a, emissiveIntensity: 2.4, roughness: 0.4 }));
  flame.scale.set(0.7, 1.7, 0.7);
  flame.position.set(0, 0.28, 0);
  group.add(flame);
  return group;
}

/** An original shield: a pointed outline with a raised star, in steel and a primary colour. */
export function shield(bag: Bag, color: number): Group {
  const outline = new Shape();
  outline.moveTo(-0.32, 0.4);
  outline.lineTo(0.32, 0.4);
  outline.lineTo(0.32, 0.02);
  outline.quadraticCurveTo(0.3, -0.26, 0, -0.46);
  outline.quadraticCurveTo(-0.3, -0.26, -0.32, 0.02);
  outline.closePath();
  const plate = shadowed(new Mesh(bag.geometry(new ExtrudeGeometry(outline, { depth: 0.07, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 2 })), standard(bag, 0x9aa7b8, { metalness: 0.9, roughness: 0.28 })));
  const star = new Shape();
  for (let point = 0; point < 10; point += 1) {
    const radius = point % 2 === 0 ? 0.2 : 0.085;
    const angle = (Math.PI / 5) * point - Math.PI / 2;
    if (point === 0) star.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
    else star.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
  }
  star.closePath();
  const emblem = shadowed(new Mesh(bag.geometry(new ExtrudeGeometry(star, { depth: 0.04, bevelEnabled: false })), standard(bag, color, { metalness: 0.3, roughness: 0.35 })));
  emblem.position.set(0, 0.04, 0.09);
  const group = new Group();
  group.add(plate, emblem);
  group.rotation.x = -0.35;
  return group;
}

/** A lantern: a small box frame with a warm glow. */
export function lantern(bag: Bag, glow: number): Group {
  const group = new Group();
  const frame = standard(bag, 0x3a3f4a, { metalness: 0.6, roughness: 0.4 });
  const base = shadowed(new Mesh(bag.geometry(new BoxGeometry(0.34, 0.05, 0.34)), frame));
  const top = shadowed(new Mesh(bag.geometry(new ConeGeometry(0.26, 0.16, 4)), frame));
  top.position.y = 0.52;
  top.rotation.y = Math.PI / 4;
  const light = new Mesh(bag.geometry(new BoxGeometry(0.22, 0.4, 0.22)), standard(bag, glow, { emissive: glow, emissiveIntensity: 1.6, roughness: 0.5 }));
  light.position.y = 0.26;
  group.add(base, light, top);
  return group;
}

/** A garland ring of small spheres, as marigolds or baubles. */
export function garland(bag: Bag, radius: number, color: number, count = 24): Group {
  const group = new Group();
  const material = standard(bag, color, { roughness: 0.6 });
  const bead = bag.geometry(new SphereGeometry(0.09, 8, 6));
  for (let index = 0; index < count; index += 1) {
    const angle = (index / count) * Math.PI * 2;
    const mesh = shadowed(new Mesh(bead, material));
    mesh.position.set(Math.cos(angle) * radius, 0.1, Math.sin(angle) * radius);
    group.add(mesh);
  }
  return group;
}

/** A rangoli-like ring: a flat torus pattern with a faceted jewel. */
export function rangoli(bag: Bag, color: number): Group {
  const group = new Group();
  const material = standard(bag, color, { roughness: 0.5, emissive: color, emissiveIntensity: 0.25 });
  const ring = new Mesh(bag.geometry(new TorusGeometry(0.34, 0.03, 6, 24)), material);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.03;
  const jewel = new Mesh(bag.geometry(new OctahedronGeometry(0.12)), material);
  jewel.position.y = 0.14;
  group.add(ring, jewel);
  return group;
}

/** A low drift of snow: a squashed sphere. */
export function snowdrift(bag: Bag): Group {
  const group = new Group();
  const mesh = shadowed(new Mesh(bag.geometry(new SphereGeometry(0.5, 14, 10)), standard(bag, 0xf6faff, { roughness: 0.95 })));
  mesh.scale.set(1, 0.32, 0.8);
  group.add(mesh);
  return group;
}
