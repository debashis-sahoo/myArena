import type { ReactElement } from 'react';
import { Logo } from '../../art/Logo';
import { GuestProfile } from './GuestProfile';
import { AudioControls } from '../common/AudioControls';

export function Header(): ReactElement {
  return (
    <header className="hub-top">
      <GuestProfile />
      <div className="logo-wrap">
        <Logo />
      </div>
      <div className="sound">
        <AudioControls />
      </div>
    </header>
  );
}
