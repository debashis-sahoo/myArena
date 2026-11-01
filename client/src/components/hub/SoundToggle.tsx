import type { ReactElement } from 'react';
import { sfx } from '../../audio/sfx';
import { updateGuest, useGuest } from '../../state/guest';

export function SoundToggle(): ReactElement {
  const { soundOn } = useGuest();
  return (
    <button
      type="button"
      className="btn ghost icon sound-btn"
      role="switch"
      aria-checked={soundOn}
      aria-label={soundOn ? 'Sound effects on' : 'Sound effects off'}
      title={soundOn ? 'Sound on' : 'Sound off'}
      onClick={() => {
        updateGuest({ soundOn: !soundOn });
        if (!soundOn) setTimeout(() => sfx.tap(), 0);
      }}
    >
      <span aria-hidden="true">{soundOn ? '🔊' : '🔇'}</span>
    </button>
  );
}
