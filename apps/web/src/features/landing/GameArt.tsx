import { useState } from 'react';
import { CircleDot, Crown, Dices, FlaskConical, Palette, Target, Ticket, Worm, type LucideIcon } from 'lucide-react';
import type { CatalogEntry } from '@myarena/protocol';
import { artImageUrls } from './art-images';

type Art = CatalogEntry['art'];

const icons: Record<Art['icon'], LucideIcon> = {
  TARGET: Target, SNAKE: Worm, TICKET: Ticket, PALETTE: Palette, CROWN: Crown, DICE: Dices, DISCS: CircleDot, FLASK: FlaskConical,
};

// Decorative only: everything the art shows is also stated in text. A game with a picture shows it; if the picture
// cannot be shown, the icon art is used instead so the tile is never broken.
export function GameArt({ art, size = 40, mini = false }: { art: Art; size?: number; mini?: boolean }) {
  const [failed, setFailed] = useState<string | null>(null);
  const imageUrl = art.image ? artImageUrls[art.image] : undefined;
  if (imageUrl && failed !== imageUrl) {
    return (
      <span className={`art art--picture${mini ? ' art--mini' : ''}`} aria-hidden="true">
        <img src={imageUrl} alt="" width={640} height={360} decoding="async" draggable={false} onError={() => setFailed(imageUrl)} />
      </span>
    );
  }
  const Icon = icons[art.icon];
  return <span className={`art art--${art.palette.toLowerCase()}${mini ? ' art--mini' : ''}`} aria-hidden="true"><Icon size={size} strokeWidth={1.75} /></span>;
}
