import { useEffect, useRef, type ReactNode } from 'react';
import type { CatalogEntry } from '@myarena/protocol';
import { Swords, Users, X } from 'lucide-react';
import { useAnnouncer } from '../../a11y/announcer';
import { useReducedMotion } from '../../a11y/useReducedMotion';
import { GameArt } from './GameArt';

interface PlayOptionsProps {
  entry: CatalogEntry;
  creating: boolean;
  onCreate: () => void;
  onSolo: () => void;
  onDismiss: () => void;
  /** The create-room controls, shown only while `creating` is true. */
  children?: ReactNode;
}

export function PlayOptions({ entry, creating, onCreate, onSolo, onDismiss, children }: PlayOptionsProps) {
  const heading = useRef<HTMLHeadingElement>(null);
  const panel = useRef<HTMLElement>(null);
  const announce = useAnnouncer();
  const reduced = useReducedMotion();
  const solo = entry.modes.includes('SOLO_AI');
  const online = entry.modes.includes('ONLINE');

  // The panel is mounted fresh for each selected game (keyed by id), so this runs once per selection.
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    panel.current?.scrollIntoView?.({ behavior: reduced ? 'auto' : 'smooth', block: 'nearest' });
    announce(`Play options for ${entry.name} are available.`);
  }, []);

  return (
    <section ref={panel} aria-labelledby="options-heading" className="panel options-panel stack">
      <div className="options-head">
        <GameArt art={entry.art} size={24} mini />
        <div className="options-title">
          <h2 id="options-heading" tabIndex={-1} ref={heading}>{entry.name}: choose how to play</h2>
          <span className="badge badge--playable">Playable</span>
          {entry.test ? <span className="badge badge--test">Test game</span> : null}
        </div>
        <button type="button" className="btn-quiet" onClick={onDismiss}><X size={18} aria-hidden="true" />Choose a different game</button>
      </div>
      <div className="cluster">
        {solo ? <button type="button" className="btn-secondary" onClick={onSolo}><Swords size={18} aria-hidden="true" />Play against AI</button> : null}
        {online ? <button type="button" className="btn-primary" aria-expanded={creating} aria-controls="create-room-panel" onClick={onCreate}><Users size={18} aria-hidden="true" />Create private room</button> : null}
      </div>
      {!solo ? <p className="muted">Playing against the AI is not available for this game.</p> : null}
      {!online ? <p className="muted">Private rooms are not available for this game.</p> : null}
      {creating && online ? <div id="create-room-panel">{children}</div> : null}
    </section>
  );
}
