import { CircleDot, Crown, Dices, FlaskConical, Palette, Target, Ticket, Worm, type LucideIcon } from 'lucide-react';
import type { CatalogEntry } from '@myarena/protocol';

type Art = CatalogEntry['art'];

const icons: Record<Art['icon'], LucideIcon> = {
  TARGET: Target, SNAKE: Worm, TICKET: Ticket, PALETTE: Palette, CROWN: Crown, DICE: Dices, DISCS: CircleDot, FLASK: FlaskConical,
};

// Decorative only: everything the art shows is also stated in text.
export function GameArt({ art, size = 40, mini = false }: { art: Art; size?: number; mini?: boolean }) {
  const Icon = icons[art.icon];
  return <span className={`art art--${art.palette.toLowerCase()}${mini ? ' art--mini' : ''}`} aria-hidden="true"><Icon size={size} strokeWidth={1.75} /></span>;
}
