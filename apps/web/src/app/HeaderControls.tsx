import { useState } from 'react';
import { Check, Sparkles, UserRound, Volume2, VolumeX } from 'lucide-react';
import { saveEffects, saveSound } from '../platform/preferences';
import { NameDialog } from './NameDialog';
import { usePreferences } from './usePreferences';

export function HeaderControls() {
  const preferences = usePreferences();
  const [editing, setEditing] = useState(false);
  return (
    <div className="header-controls">
      <button type="button" className="chip" aria-pressed={preferences.sound} onClick={() => saveSound(!preferences.sound)}>
        {preferences.sound ? <Volume2 size={18} aria-hidden="true" /> : <VolumeX size={18} aria-hidden="true" />}Sound
      </button>
      <button type="button" className="chip" aria-pressed={preferences.effects} onClick={() => saveEffects(!preferences.effects)}>
        <Sparkles size={18} aria-hidden="true" />Effects{preferences.effects ? <Check size={16} aria-hidden="true" /> : null}
      </button>
      <button type="button" className="chip" aria-haspopup="dialog" onClick={() => setEditing(true)}>
        <UserRound size={18} aria-hidden="true" />{preferences.displayName ? preferences.displayName : 'Set your name'}
      </button>
      {editing ? <NameDialog currentName={preferences.displayName} onClose={() => setEditing(false)} /> : null}
    </div>
  );
}
