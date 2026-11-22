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
        <span className={`hub-role hub-role-${entryMode}`}>
          <span aria-hidden="true">✦</span>
          {entryMode === 'host' ? 'HOST ARENA' : 'PLAYER HUB'}
          <span aria-hidden="true">✦</span>
        </span>
      </div>
      <div className="sound">
        <AudioControls />
      </div>
    </header>
  );
}
