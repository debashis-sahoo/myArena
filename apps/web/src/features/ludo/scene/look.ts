import type { Color, ThemeId } from '@myarena/ludo';
import type { BufferGeometry, Material, Object3D } from 'three';

/** Everything a board theme decides about how the 3D scene looks. One generator per theme builds one of these. */
export interface ThemeLook {
  id: ThemeId;
  /** Scene background and table colours. */
  background: number;
  table: Material;
  frame: Material;
  board: Material;
  /** Ordinary ring squares and the yard inside each base. */
  cell: Material;
  yard: Material;
  tray: Material;
  trayFloor: Material;
  /** Colour of each seat's squares, base and pawns (matches the flat board and the previews). */
  palette: Record<Color, number>;
  /** Body and topper materials for a seat's pawns. */
  pawn: (color: Color) => { body: Material; topper: Material };
  die: { ground: string; pip: string; clearcoat: number; roughness: number };
  lighting: { key: number; keyIntensity: number; fill: number; fillIntensity: number; environment: number };
  /** Decorations on the table around the board. */
  props: () => Object3D[];
  celebration: { colors: readonly number[]; gravity: number; spread: number };
  /** Everything created for this theme, released together. */
  dispose: () => void;
}

export type Disposables = { materials: Material[]; geometries: BufferGeometry[]; };
