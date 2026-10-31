import { cellOf, type Color, type LudoMatchView } from '@myarena/ludo';

/** Where several pawns that share a square stand, as offsets in square units, and how much smaller they are drawn. */
export const SPREAD: Record<number, { scale: number; offsets: [number, number][] }> = {
  1: { scale: 1, offsets: [[0, 0]] },
  2: { scale: 0.62, offsets: [[-0.25, 0], [0.25, 0]] },
  3: { scale: 0.55, offsets: [[-0.28, -0.2], [0.28, -0.2], [0, 0.28]] },
  4: { scale: 0.5, offsets: [[-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25], [0.25, 0.25]] },
};

export interface PlacedPawn { seat: number; pawn: number; color: Color; cx: number; cy: number; scale: number; movable: boolean; }

/** Every pawn's centre on the 15 by 15 grid (squares are 1 by 1), spread out when they share a square. */
export function placePawns(view: LudoMatchView, movable: ReadonlySet<number>): PlacedPawn[] {
  const groups = new Map<string, { seat: number; pawn: number; color: Color; col: number; row: number }[]>();
  for (const seat of view.seats) {
    seat.pawns.forEach((step, pawn) => {
      const cell = cellOf(seat.color, pawn, step);
      const key = `${cell.col},${cell.row}`;
      const list = groups.get(key) ?? [];
      list.push({ seat: seat.index, pawn, color: seat.color, col: cell.col, row: cell.row });
      groups.set(key, list);
    });
  }
  const placed: PlacedPawn[] = [];
  for (const list of groups.values()) {
    const layout = SPREAD[Math.min(list.length, 4)]!;
    list.forEach((item, index) => {
      const [dx, dy] = layout.offsets[index % layout.offsets.length]!;
      placed.push({
        seat: item.seat, pawn: item.pawn, color: item.color, cx: item.col + 0.5 + dx, cy: item.row + 0.5 + dy,
        scale: layout.scale, movable: item.seat === view.you && movable.has(item.pawn),
      });
    });
  }
  return placed;
}
