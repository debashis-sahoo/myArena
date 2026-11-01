import { useState, type ReactElement } from 'react';
import type { GameDefinition } from '@myarena/shared';
import { Confetti } from '../components/common/Confetti';
import { Header } from '../components/hub/Header';
import { GameGrid } from '../components/hub/GameGrid';
import { LaunchModal } from '../components/launch/LaunchModal';

export function HubPage(): ReactElement {
  const [launching, setLaunching] = useState<GameDefinition | null>(null);
  return (
    <div className="hub">
      <Confetti />
      <Header />
      <GameGrid onPlay={setLaunching} />
      <footer className="hub-footer">More games are on the way. Pick one and play with friends.</footer>
      <LaunchModal game={launching} onClose={() => setLaunching(null)} />
    </div>
  );
}
