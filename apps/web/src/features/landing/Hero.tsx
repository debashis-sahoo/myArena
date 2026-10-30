import { DoorOpen, Swords, Users } from 'lucide-react';

interface HeroProps { onCreate: () => void; onJoin: () => void; onSolo: () => void }

export function Hero({ onCreate, onJoin, onSolo }: HeroProps) {
  return (
    <section aria-labelledby="hero-heading" className="hero">
      <p className="hero-eyebrow">myArena Hub</p>
      <h1 id="hero-heading">Your Friends. Your Arena.</h1>
      <p className="hero-lead">Pick a game, open a private room, and play together. No account needed, and rooms work on phones and desktops at the same time.</p>
      <div className="cluster">
        <button type="button" className="btn-primary" onClick={onCreate}><Users size={18} aria-hidden="true" />Create Private Room</button>
        <button type="button" className="btn-secondary" onClick={onJoin}><DoorOpen size={18} aria-hidden="true" />Join with Room Code</button>
        <button type="button" className="btn-secondary" onClick={onSolo}><Swords size={18} aria-hidden="true" />Play Solo vs AI</button>
      </div>
    </section>
  );
}
