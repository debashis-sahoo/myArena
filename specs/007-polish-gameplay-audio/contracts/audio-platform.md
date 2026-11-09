# Contract: Platform Audio

The shared audio path, the controls, the music lifecycle and the levels (spec FR-023 to FR-029). Client-only; there is no server or protocol change.

## 1. Signal graph

```text
 effect voices ──► Sound bus (gain = soundVolume^1.5, 30 ms ramp) ──┐
                                                                    ├──► master limiter ──► destination
 music voices  ──► Music bus (gain = musicVolume^1.5 x trim, ramp) ─┘
```

One `AudioContext` for the page, created only inside a user gesture and resumed only inside one. The limiter is a `DynamicsCompressor`: threshold -6 dB, knee 0, ratio 20, attack 3 ms,
release 120 ms.

## 2. Modules and API

| Module | Exports | Notes |
|--------|---------|-------|
| `audio/levels.ts` | constants from data-model section 2 | tunable; the only place levels are written |
| `audio/prefs.ts` | `getAudioPrefs()`, `useAudioPrefs()`, `setSoundOn(on)`, `setSoundVolume(v)`, `setMusicOn(on)`, `setMusicVolume(v)` | state machine in data-model section 1; subscribes listeners with `useSyncExternalStore`; applies bus gains on every change |
| `audio/context.ts` | `getAudio()` (context, buses or `null`), `resumeAudio()` (gesture only), `useAudioStatus()` | status `ready`, `needs-tap`, `unavailable`; installs one first-gesture listener that only calls resume; `statechange` updates status |
| `audio/sfx.ts` | `sfx.tap`, `join`, `message`, `error`, `success`, `stamp`, `ballRoll`, `winChime` | same names and call sites; plays only when Sound is audible and the context is running; **drops** (never queues) calls made while suspended |
| `audio/music/index.ts` | `startMusic(gameId)`, `stopMusic()`, `useMusicStatus()` | one theme at a time; `startMusic` of the playing game is a no-op; a different game fades the old theme out before the new one in |
| `audio/useRoomMusic.ts` | `useRoomMusic(gameId \| null)` | called by `RoomShell`; see section 4 |

## 3. Effects cues

Authored at `SFX_REF_PEAK` (0.5) before the buses. Cues whose fundamental is below about 300 Hz gain a quieter partner an octave up so small speakers carry them.

| Cue | Today (Hz, wave, peak) | New (fundamental, partner, relative level) |
|-----|------------------------|--------------------------------------------|
| `tap` | 520, 700 triangle 0.06 | same notes, 1.0 |
| `join` | 440, 660, 880 sine 0.06 | same notes, 1.0 |
| `message` | 880 sine 0.04 | same note, 0.7 |
| `error` | 220, 160 sawtooth 0.04 | same notes plus 440, 320 at 0.4 (sawtooth softened by a low-pass), 0.9 |
| `success` | 523, 659, 784, 1046 triangle 0.06 | same notes, 1.0 |
| `stamp` | 240 triangle 0.035 | 240 plus 480 at 0.5, 0.9 |
| `ballRoll` | 10 notes 120 to 220 triangle 0.05, then 420 square 0.03 | notes plus an octave partner at 0.45, tail 420 at 0.6, 1.0 |
| `winChime` | 784, 988, 1175, 1568 sine 0.07 | same notes, 1.0 |

No new cues are added; each game's existing meaningful cues stay (FR-023).

## 4. Music lifecycle (`useRoomMusic`)

| Condition | Action |
|-----------|--------|
| `gameId` present, music audible, page visible, context running | `startMusic(gameId)` (idempotent) |
| `gameId` changes | old theme fades out, new one fades in; never two at once |
| Music becomes inaudible (switch off, volume 0) | `stopMusic()` (fade out) |
| Page hidden | `stopMusic()`; on visible, restart if still audible |
| Context suspended (autoplay) | status `needs-tap`; start when a gesture resumes it |
| Room unmounts (leave, Hub, navigation) | `stopMusic()` |
| Replay, reconnect, room state refresh | no effect (same `gameId`) |

The Hub never starts music. Themes and their voices are specified in [research.md](../research.md) R4 and data-model section 2.

## 5. Controls (`components/common/AudioControls.tsx`)

```text
 [ 🔊 ]  button, 44 x 44 px, aria-label "Audio settings", aria-haspopup="dialog", aria-expanded
   └─ popover (role="dialog", labelled "Audio")
        Sound   [ switch ]  [──────●──] 80 %
        Music   [ switch ]  [──●──────] 30 %
        status line (only when `needs-tap` or `unavailable`)   [ Retry ]
```

- Switches are `role="switch"` with `aria-checked`; sliders are `input type="range"` 0 to 100, step 5, with a visible label and `aria-valuetext` such as "80 percent".
- Targets are at least 44 px high; the popover is at most `min(320px, 100vw - 16px)` wide and opens below (or above on short screens) without covering the header it came from.
- Escape or an outside click closes it and returns focus to the button; Tab moves through Sound switch, Sound slider, Music switch, Music slider, Retry.
- The button icon shows the Sound state (waves, one wave, muted), a small note mark while music is audible, and a dot while the status is not `ready`.
- Changing a control applies within one frame; turning Sound on plays `sfx.tap()` once as confirmation.

### Placement

| Screen | Header |
|--------|--------|
| Hub | `components/hub/Header.tsx` |
| Platform room (lobby, placeholders) | `RoomShell` `room-head` |
| Ludo match | `ludo-head` actions |
| Housie lobby and match | `hz-lobby-head`, `hz-head` |
| Bingo lobby and match | `bz-lobby-head`, the match header (replaces `SoundToggle`) |
| UNO match | `un-head` (replaces `SoundToggle`); icon only below 360 px wide |

`SoundToggle.tsx` is removed once every use is replaced.

## 6. Guarantees

- Muting or setting a channel to 0 silences it immediately and without a click; the other channel and every other player are unaffected.
- Nothing plays on a page that has not received a gesture; nothing plays later because it was requested earlier.
- When Web Audio is unavailable every call is a no-op and no game behavior depends on audio.
- Preferences survive reload and game changes on the same device; when storage is unavailable they last for the session.
