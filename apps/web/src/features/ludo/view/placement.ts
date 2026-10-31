import { BASE, cellOf, type Color, type LudoMatchView } from '@myarena/ludo';
import { centreOf, slotCentres } from './geometry';

/** Where several pawns that share a square stand, as offsets in square units, and how much smaller they are drawn. */
export const SPREAD: Record<number, { scale: number; offsets: [number, number][] }> = {
  1: { scale: 1, offsets: [[0, 0]] },
  2: { scale: 0.62, offsets: [[-0.25, 0], [0.25, 0]] },
  3: { scale: 0.55, offsets: [[-0.28, -0.2], [0.28, -0.2], [0, 0.28]] },
  4: { scale: 0.5, offsets: [[-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25], [0.25, 0.25]] },
};

export interface PlacedPawn { seat: number; pawn: number; color: Color; cx: number; cy: number; scale: number; movable: boolean; highlighted: boolean; }

export const pawnKey = (seat: number, pawn: number): string => `${seat}:${pawn}`;

/** Every pawn's centre on the 15 by 15 grid (squares are 1 by 1), spread out when they share a square. `highlight` is the viewer's pawn whose move button is pointed at. */
export function placePawns(view: LudoMatchView, movable: ReadonlySet<number>, highlight: number | null = null): PlacedPawn[] {
  const groups = new Map<string, { seat: number; pawn: number; color: Color; x: number; y: number }[]>();
  for (const seat of view.seats) {
    seat.pawns.forEach((step, pawn) => {
      const point = step === BASE ? slotCentres(seat.color)[pawn]! : centreOf(cellOf(seat.color, pawn, step));
      const key = `${point.x},${point.y}`;
      const list = groups.get(key) ?? [];
      list.push({ seat: seat.index, pawn, color: seat.color, x: point.x, y: point.y });
      groups.set(key, list);
    });
  }
  const placed: PlacedPawn[] = [];
  for (const list of groups.values()) {
    const layout = SPREAD[Math.min(list.length, 4)]!;
    list.forEach((item, index) => {
      const [dx, dy] = layout.offsets[index % layout.offsets.length]!;
      placed.push({
        seat: item.seat, pawn: item.pawn, color: item.color, cx: item.x + dx, cy: item.y + dy,
        scale: layout.scale, movable: item.seat === view.you && movable.has(item.pawn),
        highlighted: item.seat === view.you && highlight === item.pawn,
      });
    });
  }
  return placed;
}
