import {
  BASE_PROGRESS,
  BASE_SPOTS,
  HOME_CENTER,
  HOME_PROGRESS,
  REMOVED_PROGRESS,
  cellOf,
  type Cell,
  type LudoColor,
  type LudoState,
} from '@myarena/shared';
import type { Point } from './anim/hop';

export interface PawnItem {
  key: string;
  playerId: string;
  color: LudoColor;
  index: number;
  progress: number;
  point: Point;
  scale: number;
}

export const pawnKey = (playerId: string, index: number): string => `${playerId}:${index}`;

/** Centre of a grid square in board pixels. */
export function centerOf(cell: Cell, cellPx: number): Point {
  return { x: (cell[1] + 0.5) * cellPx, y: (cell[0] + 0.5) * cellPx };
}

const HOME_SIDE: Record<LudoColor, Point> = {
  yellow: { x: -0.9, y: 0 },
  green: { x: 0, y: -0.9 },
  blue: { x: 0.9, y: 0 },
  red: { x: 0, y: 0.9 },
};

const SPREAD: Record<number, [number, number][]> = {
  1: [[0, 0]],
  2: [
    [-0.22, 0.02],
    [0.22, -0.02],
  ],
  3: [
    [-0.24, 0.16],
    [0.24, 0.16],
    [0, -0.22],
  ],
  4: [
    [-0.22, -0.2],
    [0.22, -0.2],
    [-0.22, 0.22],
    [0.22, 0.22],
  ],
};

const SCALE: Record<number, number> = { 1: 1, 2: 0.78, 3: 0.68, 4: 0.62 };

/** Where every visible pawn stands: base spots, squares (stacked when shared), and HOME slots. */
export function layoutPawns(state: LudoState, cellPx: number): PawnItem[] {
  const items: PawnItem[] = [];
  const groups = new Map<string, PawnItem[]>();
  const homeCount = new Map<LudoColor, number>();

  for (const p of state.players) {
    p.pawns.forEach((progress, index) => {
      if (progress === REMOVED_PROGRESS) return;
      const base = { key: pawnKey(p.playerId, index), playerId: p.playerId, color: p.color, index, progress, scale: 1 };
      if (progress === BASE_PROGRESS) {
        const [x, y] = BASE_SPOTS[p.color][index] as readonly [number, number];
        items.push({ ...base, point: { x: x * cellPx, y: y * cellPx } });
        return;
      }
      if (progress >= HOME_PROGRESS) {
        const n = homeCount.get(p.color) ?? 0;
        homeCount.set(p.color, n + 1);
        const side = HOME_SIDE[p.color];
        const centre = centerOf(HOME_CENTER, cellPx);
        // Spread along the axis perpendicular to the colour's approach, centred on its triangle.
        const slot = (n - 1.5) * 0.34;
        const along = side.x === 0 ? { x: slot, y: 0 } : { x: 0, y: slot };
        items.push({
          ...base,
          scale: 0.62,
          point: { x: centre.x + (side.x * 0.55 + along.x) * cellPx, y: centre.y + (side.y * 0.55 + along.y) * cellPx },
        });
        return;
      }
      const cell = cellOf(p.color, progress).cell;
      const item: PawnItem = { ...base, point: centerOf(cell, cellPx) };
      const k = `${cell[0]},${cell[1]}`;
      groups.set(k, [...(groups.get(k) ?? []), item]);
    });
  }

  for (const group of groups.values()) {
    const n = Math.min(group.length, 4);
    const offsets = SPREAD[n] as [number, number][];
    group.forEach((item, i) => {
      const [dx, dy] = offsets[i % offsets.length] as [number, number];
      items.push({
        ...item,
        scale: SCALE[n] as number,
        point: { x: item.point.x + dx * cellPx, y: item.point.y + dy * cellPx },
      });
    });
  }
  return items;
}
