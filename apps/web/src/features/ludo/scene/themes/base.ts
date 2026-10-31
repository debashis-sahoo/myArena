import { Color as ThreeColor, MeshPhysicalMaterial, MeshStandardMaterial, type Material, type Object3D } from 'three';
import type { Color } from '@myarena/ludo';
import { themes } from '../../themes/themes';
import type { ThemeLook } from '../look';
import { speckleTexture, woodTexture } from '../textures';
import { Bag } from './bag';

const hex = (value: string): number => Number.parseInt(value.slice(1), 16);

type Surface = { kind: 'wood'; base: string; grain: string } | { kind: 'speckle'; base: string; fleck: string } | { kind: 'plain'; color: string };

export interface LookSpec {
  id: ThemeLook['id'];
  background: number;
  table: Surface;
  frame: Surface;
  board: Surface;
  cell: string;
  yard: string;
  tray: Surface;
  trayFloor: Surface;
  /** How the pawns are finished. */
  pawn: { metalness: number; roughness: number; clearcoat: number; topperMetalness: number; topperEmissive: number; sheen?: number };
  die: ThemeLook['die'];
  lighting: ThemeLook['lighting'];
  celebration: ThemeLook['celebration'];
  props: (bag: Bag, palette: Record<Color, number>) => Object3D[];
}

/** Builds a theme's look from its recipe; the seat colours always come from the shared theme data. */
export function buildLook(spec: LookSpec): ThemeLook {
  const bag = new Bag();
  const surface = (value: Surface, seed: number, repeat: number, roughness: number, metalness = 0): Material => {
    if (value.kind === 'plain') return bag.material(new MeshStandardMaterial({ color: new ThreeColor(value.color), roughness, metalness }));
    const texture = bag.texture(value.kind === 'wood' ? woodTexture(value.base, value.grain, seed) : speckleTexture(value.base, value.fleck, seed));
    texture.repeat.set(repeat, repeat);
    return bag.material(new MeshStandardMaterial({ map: texture, roughness, metalness }));
  };

  const palette = Object.fromEntries((Object.keys(themes[spec.id].palette) as Color[]).map((color) => [color, hex(themes[spec.id].palette[color])])) as Record<Color, number>;
  const pawns = new Map<Color, { body: Material; topper: Material }>();
  const pawn = (color: Color) => {
    let made = pawns.get(color);
    if (!made) {
      const tint = palette[color];
      made = {
        body: bag.material(new MeshPhysicalMaterial({ color: tint, roughness: spec.pawn.roughness, metalness: spec.pawn.metalness, clearcoat: spec.pawn.clearcoat, clearcoatRoughness: 0.18, sheen: spec.pawn.sheen ?? 0 })),
        topper: bag.material(new MeshPhysicalMaterial({
          color: tint, roughness: Math.max(0.12, spec.pawn.roughness - 0.15), metalness: spec.pawn.topperMetalness, clearcoat: 1, clearcoatRoughness: 0.08,
          emissive: tint, emissiveIntensity: spec.pawn.topperEmissive,
        })),
      };
      pawns.set(color, made);
    }
    return made;
  };

  return {
    id: spec.id,
    background: spec.background,
    table: surface(spec.table, 11, 3, 0.9),
    frame: surface(spec.frame, 23, 2, 0.5, spec.frame.kind === 'plain' ? 0.5 : 0),
    board: surface(spec.board, 37, 1, 0.6),
    cell: bag.material(new MeshStandardMaterial({ color: new ThreeColor(spec.cell), roughness: 0.45 })),
    yard: bag.material(new MeshStandardMaterial({ color: new ThreeColor(spec.yard), roughness: 0.55 })),
    tray: surface(spec.tray, 41, 1, 0.45),
    trayFloor: surface(spec.trayFloor, 53, 2, 0.95),
    palette,
    pawn,
    die: spec.die,
    lighting: spec.lighting,
    props: () => spec.props(bag, palette),
    celebration: spec.celebration,
    dispose: () => bag.dispose(),
  };
}
