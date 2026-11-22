import type { ReactElement } from 'react';
import { Logo } from '../../art/Logo';
import { GuestProfile } from './GuestProfile';
import { AudioControls } from '../common/AudioControls';
import type { HubEntryMode } from '../../routes/HubPage';

export function Header({ entryMode }: { entryMode: HubEntryMode }): ReactElement {
  return (
    <header className="hub-top">
      <GuestProfile />
      <div className="logo-wrap">
        <Logo entryMode={entryMode} />
      </div>
      <div className="sound">
        <AudioControls />
      </div>
    </header>
  );
}
