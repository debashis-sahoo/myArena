# Data Model: Gameplay Clarity and Audio Polish

All server state stays in memory for the life of a room (no database). Client preferences are in `localStorage` with an in-memory fallback. `shared/` holds only the wire types and constants
that server and client must agree on. Messages and guarantees are in [contracts/](contracts/); decisions are in [research.md](research.md).

**Naming**: Ludo exports are unprefixed (`TURN_TIMER_MS`, `ActivityKind`) and UNO exports are prefixed (`UNO_THROW_MS`); new Ludo constants use a `LUDO_` prefix and new UNO ones a `UNO_`
prefix, because `shared/src/index.ts` re-exports every module with `export *`.

## 1. Audio preferences (client, `audio/prefs.ts`)

```ts
interface ChannelPref {
  on: boolean;      // the switch
  volume: number;   // 0..1, what the slider shows
  last: number;     // 0..1, last volume above 0; restored when the switch turns on
}
interface AudioPrefs {
  v: 1;
  sound: ChannelPref;   // effects
  music: ChannelPref;   // background theme
}
```

Storage key `myarena.audio.v1`. Defaults: `sound { on: true, volume: 0.8, last: 0.8 }`, `music { on: false, volume: 0.3, last: 0.3 }`. A saved record is validated field by field on load;
any invalid field falls back to its default (a corrupt record never blocks the app).

| Event | Result |
|-------|--------|
| Switch off | `on = false`; `volume` and `last` kept |
| Switch on | `on = true`; `volume = last > 0 ? last : default` |
| Slider moved to `x > 0` | `on = true`; `volume = last = x` |
| Slider moved to 0 | `on = false`; `volume = 0`; `last` kept |
| First run, legacy guest `soundOn === false` | `sound.on = false`, other fields default |
| Storage unavailable | state kept in memory for the session |

A channel is **audible** when `on && volume > 0`. Gains applied to the buses: `gain = volume ** 1.5`, ramped over 30 ms.

### Audio status (client, in memory)

| Value | Meaning | UI |
|-------|---------|----|
| `ready` | Context running (or not needed yet and creatable by a gesture) | none |
| `needs-tap` | Music is audible and the browser has not yet allowed the context to run (no gesture since load); sound effects need no notice, the first gesture unlocks audio silently | dot on the button, popover line "Tap anywhere to start music" with Retry; shown once per page load |
| `unavailable` | No Web Audio or creation failed | dot, popover line "Audio is not available in this browser"; the game runs unchanged |

## 2. Levels and music constants (client, `audio/levels.ts`, `audio/music/`)

| Constant | Value | Purpose |
|----------|-------|---------|
| `SOUND_DEFAULT`, `MUSIC_DEFAULT` | 0.8, 0.3 | first-run volumes |
| `VOLUME_CURVE_POWER` | 1.5 | slider to gain |
| `SFX_REF_PEAK` | 0.5 | authored peak of an effect before the buses |
| `MUSIC_REF_PEAK`, `MUSIC_TRIM` | 0.5, 0.7 | authored music mix peak and a fixed trim (tunable by the meter) |
| `LIMITER` | threshold -6 dB, knee 0, ratio 20, attack 3 ms, release 120 ms | master limiter |
| `RAMP_MS` | 30 | click-free gain changes |
| `MUSIC_FADE_IN_MS`, `MUSIC_FADE_OUT_MS` | 800, 400 | theme start and stop |
| `MUSIC_LOOKAHEAD_MS`, `MUSIC_TICK_MS` | 100, 25 | scheduler |
| `MUSIC_MAX_VOICES` | 4 | simultaneous voices |

Calibration targets (V10): effect peak -12 to -6 dBFS at the default; music loudness 8 to 12 dB below an effect's at the defaults; sum at 100/100 never above -1 dBFS.

### Theme table (`audio/music/themes/*.ts`)

```ts
interface Theme {
  id: 'ludo' | 'housie' | 'bingo' | 'uno';
  bpm: number;
  beatsPerBar: 3 | 4;
  stepsPerBeat: 2 | 4;          // grid resolution
  scale: number[];              // semitone offsets from root
  root: number;                 // MIDI note
  bars: number;                 // 8
  chords: number[][];           // per bar, scale degrees
  voices: Voice[];              // at most MUSIC_MAX_VOICES
  variationEvery: 4;            // bars: swap an alternate pattern
}
```

Rows of the table in [research.md](research.md) R4 give each game's tempo, key and palette. Themes are original and generated; there is no third-party material.

## 3. Shared wire changes (`shared/`)

```ts
// protocol.ts
type SystemCode = ... | 'game_notice' | 'humor';

// ludo/types.ts
type LudoAction = { type: 'roll' } | { type: 'move'; pawn: number } | { type: 'playAgain' };
type ActivityKind = ... | 'win' | 'room' | 'match';
// LudoEvent gains: { type: 'notice' } & EventBase   (carries `entry`, state unchanged)
```

`LudoState` is unchanged: a replay is a `match_started` event whose `state` is a fresh match. The `match` entry text carries the match number and the players ("Match 2 started: Alice, Bob and Casey").

`games.ts`: the `ludo` definition gains `quietChat: true`.

`uno/timing.ts` additions: see section 6.

## 4. Ludo humor (server, `games/ludo/humor.ts`)

```ts
interface HumorContext {
  name: string;          // public display name of the addressee
  home: number;          // pawns home for that player (0..4)
  allInBase: boolean;    // every pawn still in base
  soleLeader: boolean;   // strictly most pawns home, at least one
}
interface HumorLine { text: string; needs?: (c: HumorContext) => boolean; }
```

| Item | Rule |
|------|------|
| General pool | at least 12 lines, no names |
| Addressed pool | at least 12 templates with `{name}`; some with a `needs` guard (`home >= 1`, `allInBase`, `soleLeader`) |
| Selection | choose general or addressed at random; addressed picks a random active player (human or bot) whose guard passes |
| Memory | the last 5 chosen lines are not chosen again (exact text) |
| Interval | uniform random `LUDO_HUMOR_MIN_MS = 45_000` to `LUDO_HUMOR_MAX_MS = 90_000`; `LUDO_DEV_HUMOR_MS` overrides outside production |
| When it posts | match not finished, at least one human connected; otherwise the timer re-arms without posting (no backlog) |
| Length | each rendered line is at most 120 characters (well inside the 500-character chat limit) |
| Tone | encouraging or playful about the game; no insults, no sensitive traits, no mocking of being behind, no invented facts (guards use state only) |

## 5. Ludo replay (server, `games/ludo/engine.ts`)

Additions to the engine's internal `Match`: `matchNo: number` (starts at 1), `humorCancel: (() => void) | null`, `recent: number[]` (indexes of the last 5 humor lines). `seq` and `activity`
are kept across matches.

### Eligibility and results of `playAgain`

| Check (in order) | Fails when | Result | Reason text |
|------------------|------------|--------|-------------|
| Host | caller is not `ctx.hostId()` | refused | "Only the host can do that." |
| Finished | `state.phase !== 'finished'` (not over, or a replay already started) | refused | "The match is not over." |
| Enough players | fewer than 2 players have `status === 'active'` | refused | "At least two players are needed to play again." |
| Connected | any **active** human is not `ctx.isConnected` | refused | "Waiting for {Name} to reconnect." |
| (all pass) | | accepted | n/a |

Players with `status === 'left'` are not checked for connection and are not part of the next match. A disconnected human is still `active` until the platform releases their seat, so they
block replay until they return or are released, after which the checks are re-run.

### State transition on accept

| Field | Value after |
|-------|-------------|
| `players` | the `active` players only, in their existing order; same ids, colours and kinds; `slot` renumbered 1 to N in that order; `pawns` all in base; `home` 0; `status` active |
| `turn` | the first player (P1), via the existing initial-state rule |
| `phase` | `waiting_roll` (then `startTurn('start')`) |
| `roll`, `eligible`, `winner`, `standings`, `warning`, `lastPlayer`, `sixStreak`, `bonus` | cleared |
| `remainingMs`, timers, `missed`, `autoThisTurn`, `releasing` | reset |
| engine `humanCount` | recomputed as the number of active humans (so the "last player" rule keeps working) |
| `activity` | kept; one `match` entry appended that names the players |
| `matchRev` and event `seq` | continue increasing |
| humor timer | re-armed from now; recent memory cleared |

Colours are never reassigned: a player keeps the colour given at the first match start, so the room's chat tags, player list and avatar rings stay consistent with the board. Corners of
players who left are empty (no pawns, no label), as in a 2- or 3-player match.

### Replay preview (client, derived)

```ts
interface ReplayPreview {
  players: { playerId: string; name: string; color: LudoColor }[];   // active players, existing order
  left: string[];                                                    // names of players who left
  disconnected: string[];                                            // names of active humans not connected
  canStart: boolean;                                                 // players.length >= 2 && disconnected.length === 0
}
```

Built from `LudoState.players` and the room's participant connection states; used only to show the next table and to disable the button. The server's checks decide.

### Activity kinds added

| Kind | Source | Example text |
|------|--------|--------------|
| `room` | `onRoomNotice` for `disconnected`, `reconnected`, `host_changed` | "Alice lost connection", "Alice is back", "Bob is now the host" |
| `match` | replay | "Match 2 started: Alice, Bob and Casey" |

## 6. UNO (client, `games/uno/`)

### Turn presentation (derived, not stored)

```ts
interface TurnLabel {
  text: string;                       // the line in the strip
  note: string | null;                // secondary note: "Say UNO!" or "Catch {Name}!" while a catch window is open
  actorId: string | null;             // seat that must act, or null (dealing, finished)
  mine: boolean;                      // the local player must act
  kind: 'play' | 'drawn' | 'penalty' | 'auto' | 'thinking' | 'wheel' | 'wait' | 'done';
  countdownMs: number | null;         // table.remainingMs while a human must act
}
function describeTurn(table: UnoTable, you: UnoYou | null, wheelOpen: boolean, actorConnection: 'connected' | 'disconnected' | 'gone'): TurnLabel;
```

Precedence of the text: finished, local colour wheel, settling, connection waiting (the turn seat is a human other than the viewer whose connection is lost; the countdown keeps running), drawn, pending penalty, bot thinking, ordinary turn; the catch window only sets `note`.

The inputs and outputs are the table in [research.md](research.md) R10. It is a pure function of the shown view, so the label, the seat chip, the strip and the live region always agree
with what is on screen, including after a reconnect snapshot.

### Play attempt (client store)

```ts
type AttemptPhase = 'held' | 'confirming' | 'returning';
interface PlayAttempt {
  card: number;
  color?: UnoColor;
  phase: AttemptPhase;
  startedAt: number;     // performance.now()
}
```

| From | Event | To |
|------|-------|----|
| none | activation of a playable card (after a colour for a Wild) | `held` (ghost lifts, request sent) |
| `held` | server `play` event for this card by me | `confirming` (finish throw, then commit) |
| `held` | server refusal ack | `returning` (ghost flies back, then bounce, shake, reason) |
| `held` | 4 s without either | `returning`, "Connection is slow" notice, resync |
| `confirming` or `returning` | animation done | none |

At most one attempt exists (the existing single-flight key `play`). While an attempt exists, further activations are ignored.

### Chat presentation

| Layout | Collapsed form | Expanded form | Default |
|--------|----------------|---------------|---------|
| Docked (at least 700 by 540) | 44 px rail: icon, unread count, "Open chat" | column of `clamp(240, 0.22 W, 340)` | expanded |
| Drawer (phones) | header icon with unread count | sheet under the header with a Minimize button | closed |
| AI room | none | none | none |

Preference key `myarena.chat.uno`: absent (use the default), `open`, or `minimized`. A user choice persists on the device.

### New constants (`shared/src/uno/timing.ts`)

| Constant | Value | Purpose |
|----------|-------|---------|
| `UNO_HOLD_LIFT_MS` | 120 | ghost lifts to the hold pose |
| `UNO_HOLD_FRACTION` | 0.4 | share of the distance to the pile covered by the hold pose |
| `UNO_FINISH_THROW_MS` | 260 | finish a held throw once confirmed |
| `UNO_RETURN_MS` | 220 | return flight after a refusal |
| `UNO_HOLD_TIMEOUT_MS` | 4 000 | give up waiting for an answer |

`UNO_THROW_MS` stays 450 (opponents' plays) because the server's settle times depend on it.

## 7. Platform stores (client)

| Store | Shape | Persistence | Cleared |
|-------|-------|-------------|---------|
| `state/chatDraft.ts` | `Map<roomId, string>` with `getDraft`, `setDraft`, `clearDraft` | memory | on a successful send, and when the room is left |
| `state/chatPrefs.ts` | per game id: `'open' \| 'minimized' \| null` | `localStorage` key per game (`myarena.chat.<gameId>`), memory fallback | never (a user choice) |

`ChatPanel` reads and writes the draft store, so any game's chat keeps a half-typed message across unmounts.

## 8. Housie ticket plan (client, `games/housie/useFit.ts`)

```ts
interface TicketPlan {
  mode: 'stack' | 'grid' | 'tabs';
  cell: number;        // cell width px
  rowH: number;        // cell height px
  fontPx: number;      // number size
  scrollY: boolean;    // last resort: the ticket region scrolls vertically inside itself
}
```

| Rule | Phones (width under 768) | From 768 wide |
|------|--------------------------|---------------|
| Minimum number size | 18 px | 24 px |
| Minimum row height | 30 px | 38 px |
| Cell width | at least 29 px (9 columns fit a 320 px screen with compact padding) | up to 128 px |
| Default row ratio | 0.72 of cell width, raised to the minimum row height | same |
| Number size | `min(0.62 x rowH, 0.60 x cell)`, never below the minimum | same |

Ribbon height 18 px (14 px compact) is added to the planner's per-ticket overhead. Column tints, state treatments and the ribbon are specified in
[contracts/housie-ticket-layout.md](contracts/housie-ticket-layout.md).

## 9. Constants summary

| Constant | Value | Where |
|----------|-------|-------|
| Humor interval | 45 to 90 s | server |
| Humor memory | 5 lines | server |
| Replay checks | host, finished, at least two players, active humans connected | server |
| UNO hold lift, finish, return, timeout | 120, 260, 220, 4 000 ms | shared, client |
| UNO rail width | 44 px | client |
| UNO strip height | 30 px (24 px on screens up to 600 px high), only under `STRIP_MIN_W` (provisional 760 px) wide | client |
| Housie number size | 18 px phones, 24 px from 768 px | client |
| Audio defaults | Sound 80% on, Music 30% off | client |
