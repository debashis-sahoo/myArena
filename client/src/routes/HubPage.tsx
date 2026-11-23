import { useState, type ReactElement } from 'react';
import type { GameDefinition } from '@myarena/shared';
import { Confetti } from '../components/common/Confetti';
import { Header } from '../components/hub/Header';
import { GameGrid } from '../components/hub/GameGrid';
import { JoinRoomPanel } from '../components/hub/JoinRoomPanel';
import { LaunchModal } from '../components/launch/LaunchModal';

export type HubEntryMode = 'host' | 'player';

export function HubPage({ entryMode }: { entryMode: HubEntryMode }): ReactElement {
  const [launching, setLaunching] = useState<GameDefinition | null>(null);
  return (
    <div className={`hub entry-${entryMode}`}>
      <Confetti count={40} />
      <Header entryMode={entryMode} />
      {entryMode === 'player' && <JoinRoomPanel />}
      <GameGrid onPlay={entryMode === 'host' ? setLaunching : undefined} entryMode={entryMode} />
      {entryMode === 'host' && (
        <LaunchModal entryMode={entryMode} game={launching} onClose={() => setLaunching(null)} />
      )}
    </div>
  );
}
