import { useState, type FormEvent } from 'react';
import type { Difficulty } from '@myarena/ludo';
import { RadioGroup } from '../view/RadioGroup';
import { ThemePicker } from '../themes/ThemePicker';
import { loadSetup, saveSetup, type SoloSettings } from './soloStorage';

interface SoloSetupProps { onStart: (settings: SoloSettings) => void; onBack: () => void; }

const opponentOptions = [
  { value: 1, label: '1 computer' }, { value: 2, label: '2 computers' }, { value: 3, label: '3 computers' },
] as const;
const difficultyOptions: { value: Difficulty; label: string }[] = [
  { value: 'easy', label: 'Easy' }, { value: 'normal', label: 'Normal' }, { value: 'hard', label: 'Hard' },
];

export function SoloSetup({ onStart, onBack }: SoloSetupProps) {
  const [settings, setSettings] = useState<SoloSettings>(loadSetup);
  const submit = (event: FormEvent): void => {
    event.preventDefault();
    saveSetup(settings);
    onStart(settings);
  };
  return (
    <section aria-labelledby="ludo-solo-heading" className="panel stack ludo-solo-setup">
      <h1 id="ludo-solo-heading">Ludo: play against the computer</h1>
      <p className="muted">You play Red on this device. Nothing is sent to a server and no room is created.</p>
      <form className="stack" onSubmit={submit}>
        <RadioGroup legend="Opponents" value={settings.opponents} options={opponentOptions} onChange={(opponents) => setSettings({ ...settings, opponents })} />
        <RadioGroup legend="Difficulty" value={settings.difficulty} options={difficultyOptions} onChange={(difficulty) => setSettings({ ...settings, difficulty })} />
        <ThemePicker value={settings.theme} onChange={(theme) => setSettings({ ...settings, theme })} />
        <div className="cluster">
          <button type="submit" className="btn-primary">Start game</button>
          <button type="button" className="btn-quiet" onClick={onBack}>Back to games</button>
        </div>
      </form>
    </section>
  );
}
