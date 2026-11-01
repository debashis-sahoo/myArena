import { useEffect, useRef, useState, type ReactElement } from 'react';
import { DISPLAY_NAME_MAX } from '@myarena/shared';
import { Avatar, AVATARS } from '../../art/Avatars';
import { sfx } from '../../audio/sfx';
import { cleanName, updateGuest, useGuest } from '../../state/guest';

/** Avatar badge picker and editable display name; both persist on this device (FR-005, FR-006). */
export function GuestProfile(): ReactElement {
  const guest = useGuest();
  const [draft, setDraft] = useState(guest.displayName);
  const [menuOpen, setMenuOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => setDraft(guest.displayName), [guest.displayName]);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: PointerEvent): void => {
      if (!wrapRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const commit = (): void => {
    const next = cleanName(draft);
    setDraft(next);
    updateGuest({ displayName: next });
  };

  return (
    <div className="profile-wrap" ref={wrapRef}>
      <div className="profile">
        <button
          type="button"
          className="avatar-btn"
          aria-label="Change avatar"
          aria-expanded={menuOpen}
          aria-haspopup="true"
          onClick={() => {
            sfx.tap();
            setMenuOpen((v) => !v);
          }}
        >
          <Avatar k={guest.avatar} size={40} />
        </button>
        <label className="sr-only" htmlFor="display-name">
          Display name
        </label>
        <input
          id="display-name"
          className="name-input"
          value={draft}
          maxLength={DISPLAY_NAME_MAX}
          autoComplete="nickname"
          spellCheck={false}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
          }}
        />
      </div>
      {menuOpen && (
        <div className="avatar-menu" role="group" aria-label="Choose an avatar">
          {AVATARS.map((k) => (
            <button
              key={k}
              type="button"
              aria-label={k}
              aria-pressed={guest.avatar === k}
              onClick={() => {
                updateGuest({ avatar: k });
                setMenuOpen(false);
              }}
            >
              <Avatar k={k} size={44} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
