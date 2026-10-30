import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import type { CatalogEntry } from '@myarena/protocol';
import { useAnnouncer } from '../../a11y/announcer';
import { getPreferences } from '../../platform/preferences';
import { usePreferences } from '../../app/usePreferences';
import { GameGrid } from './GameGrid';
import { CreateRoomPanel } from './CreateRoomPanel';
import { Hero } from './Hero';
import { JoinWithCode } from './JoinWithCode';
import { PlayOptions } from './PlayOptions';
import { ReturnToRoom } from './ReturnToRoom';
import { useCatalog } from './useCatalog';
import { useSelection } from './selection';

const noEntries: CatalogEntry[] = [];

function focusById(id: string): void {
  const element = document.getElementById(id);
  element?.focus();
  element?.scrollIntoView?.({ block: 'nearest' });
}

export function LandingPage() {
  const { state, reload } = useCatalog();
  const entries = state.status === 'ready' ? state.entries : noEntries;
  const { selected, select, dismiss } = useSelection(entries);
  const navigate = useNavigate();
  const announce = useAnnouncer();
  const [notice, setNotice] = useState('');
  const [creating, setCreating] = useState(false);
  const [displayName, setDisplayName] = useState(() => getPreferences().displayName);
  const savedName = usePreferences().displayName;
  const selectedId = selected?.id ?? null;

  useEffect(() => { setCreating(false); }, [selectedId]);
  // A name saved from the header fills the create form.
  useEffect(() => { if (savedName) setDisplayName(savedName); }, [savedName]);

  const say = (text: string) => { setNotice(text); announce(text); };
  const guide = () => { say('Choose a game first.'); focusById('games-heading'); };
  const startSolo = (entry: CatalogEntry) => navigate(`/play/${entry.id}/solo`);

  function heroCreate() {
    if (!selected) return guide();
    if (selected.modes.includes('ONLINE')) { setNotice(''); setCreating(true); } else say('Private rooms are not available for this game.');
  }
  function heroSolo() {
    if (!selected) return guide();
    if (selected.modes.includes('SOLO_AI')) startSolo(selected); else say('Playing against the AI is not available for this game.');
  }
  function dismissSelection() {
    const id = selectedId;
    dismiss();
    if (id) focusById(`tile-${id}`);
  }

  return (
    <div className="landing stack">
      <Hero onCreate={heroCreate} onJoin={() => focusById('join-section')} onSolo={heroSolo} />
      <ReturnToRoom />
      <p role="status" className={notice ? 'notice' : 'sr-only'}>{notice}</p>
      <GameGrid
        state={state} selectedId={selectedId} onRetry={reload}
        onSelect={(entry) => { setNotice(''); select(entry); }}
        onUnavailable={(entry) => say(`${entry.name} is not available yet.`)}
        afterPlayable={selected ? (
          <PlayOptions key={selected.id} entry={selected} creating={creating} onCreate={() => setCreating(true)} onSolo={() => startSolo(selected)} onDismiss={dismissSelection}>
            <CreateRoomPanel
              entry={selected} displayName={displayName} onNameChange={setDisplayName}
              onGameUnavailable={() => { dismiss(); reload(); say(`${selected.name} is not available right now. Choose another game.`); }}
            />
          </PlayOptions>
        ) : null}
      />
      <JoinWithCode />
    </div>
  );
}
