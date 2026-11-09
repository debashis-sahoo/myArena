# Phase 0 Research: Gameplay Clarity and Audio Polish

Each entry: **Decision**, **Rationale**, **Alternatives considered**. The spec has no open `NEEDS CLARIFICATION` items, so the entries below settle design questions the spec leaves to
planning. Facts about existing code come from the Platform Core (001), Ludo (002), Housie (003), the polish update (004), Bingo (005) and UNO (006) as built.

## R1. Audio architecture: one context, two buses, one limiter

**Decision**: A single shared `AudioContext` (`client/src/audio/context.ts`) with this graph: effects voices connect to a **Sound bus** gain; music voices to a **Music bus** gain; both
feed one **master limiter** (a `DynamicsCompressor` set as a brick-wall: threshold -6 dB, knee 0, ratio 20, attack 3 ms, release 120 ms) and then the destination. The context is created
lazily and only from a user gesture; its `state` is watched so the UI can show "needs a tap" or "unavailable" (R5). The effects API stays `sfx.tap()`, `sfx.success()` and so on, so
the 20-odd existing call sites do not change.

**Rationale**: Today every note connects straight to the destination at a per-note gain of 0.03 to 0.07 ([client/src/audio/sfx.ts](../../client/src/audio/sfx.ts)). There is no place to
apply a master level, no way to give music its own level, and nothing stops overlapping notes from clipping once levels are raised. Two buses plus a limiter give the independent
channels the spec requires (FR-024) and make it safe to raise effect levels (FR-023).

**Alternatives**: HTML audio elements with recorded files (rejected: needs licensed assets, adds weight, cannot share a limiter, and loop points leave audible gaps); raising the per-note
gains only (rejected: clips when cues overlap and gives music no separate control); a third-party audio library (rejected: new dependency for a small graph).

## R2. Why the sound is quiet and how it is recalibrated

**Decision**: Two causes are fixed together.

1. **Level.** Cues peak at -23 to -30 dBFS today. New cues are authored at a reference peak of about 0.5 (-6 dBFS) before the buses. The slider maps to gain with a gentle power
   curve `gain = v^1.5` (0 gives exactly 0, 1 gives 1), so the default Sound level of 80% is gain 0.72 and cue peaks land near -9 dBFS; 100% sits at -6 dBFS and the limiter absorbs
   overlaps.
2. **Frequency.** Several cues sit where a phone speaker is weak: `stamp` (240 Hz), `ballRoll` (120 to 220 Hz) and `error` (160 to 220 Hz). Each gains a quieter partner one octave up
   (and `ballRoll`'s tail a second one) so the cue is carried by what small speakers reproduce.

All levels live in `client/src/audio/levels.ts` as tunable constants. **Calibration targets** (measured with an offline meter, V10, then confirmed by ear): at the defaults an effect's
peak is between -12 and -6 dBFS; music's short-term loudness is 8 to 12 dB below an effect's; the sum at 100% Sound and 100% Music never exceeds -1 dBFS after the limiter.

**Rationale**: "Very low despite full device volume" is the signature of a signal that is simply quiet at the source plus cues that small speakers barely play. A power curve avoids the
common problem of a linear slider where the bottom half is nearly useless and the top is too touchy. Making the targets measurable keeps SC-007 honest: audibility is judged by
listeners, but the meter prevents "calibrated by the developer's headphones".

**Alternatives**: Decibel-linear mapping (-40 dB to 0 dB; rejected: harder to explain, and 0% needs a special case anyway); raising gain with no limiter (rejected: distortion at
overlap); asking players to raise device volume (rejected: the complaint).

## R3. Preferences: model, defaults, persistence and migration

**Decision**: One record in `localStorage` key `myarena.audio.v1`:

```json
{ "v": 1, "sound": { "on": true, "volume": 0.8, "last": 0.8 }, "music": { "on": false, "volume": 0.3, "last": 0.3 } }
```

- A channel is **audible** only when `on` is true and `volume > 0`.
- Dragging a slider to 0 sets `on` to false and keeps `last`; dragging above 0 sets `on` to true and updates `last`. Turning a channel on restores `last` (or the default when `last`
  is 0). Turning it off keeps `volume` and `last`. This satisfies FR-027 (muting or zero loses nothing).
- First run (no record): read the legacy `soundOn` boolean from the guest profile (`myarena.guest.v1`); when it is false, start with Sound off, otherwise use the defaults.
  Music is off by default (opt-in). The guest field is not written again.
- When storage is unavailable the record lives in memory for the session and controls still work (FR-029).
- Changes apply within one frame to the bus gains (ramped over 30 ms to avoid clicks); they never touch the server or other players (FR-024).

**Rationale**: The existing preference is a single boolean on the guest profile, which cannot hold two volumes. A separate record keeps the profile contract (name, avatar) untouched and
is simple to migrate.

**Alternatives**: Extend the guest profile (rejected: mixes identity with device settings and the profile is sent around); server-side preferences (rejected: no accounts, and the spec
makes preferences local to the device); a separate "muted" flag plus a volume (rejected: three states to keep in sync).

## R4. Music: generated in the browser, one theme per game

**Decision**: Music is synthesized with Web Audio from small pattern tables, not played from files. A step scheduler (`audio/music/engine.ts`) runs on a 25 ms timer with a 100 ms
lookahead, schedules oscillator and filtered-noise voices on the 16th-note grid, wraps at the end of the pattern (so the loop has no gap) and uses at most four simultaneous voices
(bass, harmony, lead, light percussion). Each theme is a table in `audio/music/themes/` giving tempo, scale, an 8-bar progression, per-voice patterns and a variation every fourth bar
so a long match does not feel like a one-bar loop. Starts fade in over 800 ms and stops fade out over 400 ms.

| Game | Character | Tempo | Palette |
|------|-----------|-------|---------|
| Ludo | Bouncy board-game parade | 108 BPM | C major pentatonic, marimba-like plucks over a walking bass, shaker |
| Housie | Warm bingo-hall waltz | 96 BPM in 3/4 | F major, soft organ-like pad, music-box melody, brush on beat one |
| Bingo | Groovy lucky-draw | 118 BPM | G mixolydian, electric-piano stabs, funk bass, closed hat |
| UNO | Cheeky card-table | 124 BPM | A minor pentatonic with a bright lift every fourth bar, staccato plucks, tight clap |

**Rationale**: The project already makes every effect this way, with no assets, so music keeps the zero-asset, zero-dependency, nothing-to-license position the spec's "cleared for
use" assumption needs: the themes are original by construction. Procedural loops are tiny, loop seamlessly and can be quieter by construction (few voices, soft attacks).

**Alternatives**: Licensed or royalty-free tracks (rejected: rights evidence, roughly 0.5 to 1 MB per theme, loop gaps in compressed formats); a music library dependency such as Tone.js
(rejected: new dependency of about 150 KB for a scheduler this size); one generic theme for every game (rejected: FR-026 requires a distinct theme per game).

## R5. Music lifecycle, autoplay and the blocked-audio state

**Decision**: A hook `useRoomMusic(gameId)` is mounted by the universal room wrapper (`RoomShell`), so it covers lobby and match for every game without game code and stops when the room
unmounts. Rules:

- It starts a theme only when music is audible, the page is visible and the context is running; the call is idempotent per `gameId`, so replay, reconnect and re-render never restart
  or stack a theme. Switching games stops the old theme (fade) before the new one starts.
- Hiding the page (`visibilitychange`) stops the theme; showing it resumes when still audible.
- The Hub has no music (a Hub soundtrack is out of scope).
- **Autoplay**: the context is created and resumed only inside a gesture (the audio control, or one global first `pointerdown` or `keydown` listener that does nothing except resume).
  Effects requested while the context is suspended are **dropped, not queued**, so nothing bursts out later (FR-029). Music waits for `running`.
- **Status** (`ready`, `needs-tap`, `unavailable`) feeds a dot on the audio button and a line in its popover: "Tap anywhere to start music" (needs-tap) with a Retry button, or "Audio
  is not available in this browser" (unavailable). The needs-tap line is shown once per page load until a gesture resolves it; it is never repeated as a modal.

**Rationale**: `RoomShell` is the one component every room screen passes through, which keeps the lifecycle in the platform (Principle IV). Dropping early effects avoids the classic
"everything plays at once after the first click".

**Alternatives**: Music only while a match runs (rejected: the lobby is where players wait, and silence there makes the toggle feel broken); per-game hooks (rejected: four copies of the
same lifecycle); queueing effects until unlock (rejected: unexpected deferred playback).

## R6. Audio controls

**Decision**: A platform component `AudioControls` (`components/common/AudioControls.tsx`) replaces `SoundToggle`: a 44 by 44 px icon button (speaker icon whose waves reflect the Sound state,
with a small note mark while music is audible, and a status dot) that opens a popover with two rows, each a labelled switch (`role="switch"`) and a range input (0 to 100, step 5,
`aria-valuetext` "80 percent") plus the status line from R5. It closes on Escape or an outside click and returns focus to the button. It is added to the Hub header, the platform room
header, the Ludo header, the Housie header and lobby header, the Bingo header and lobby header, and the UNO header (replacing the existing `SoundToggle` in Bingo and UNO).

**Rationale**: One component gives every game the same controls and satisfies FR-024 for the games that have no audio control today (Ludo, Housie). A popover keeps the header compact, which
matters in the UNO and Housie headers that are already full on a 320 px screen.

**Alternatives**: Inline sliders in each header (rejected: too wide for phones); a settings page (rejected: leaves the room); a floating button (rejected: overlaps game controls, which the
constitution forbids).

## R7. Ludo: Chat keeps people and humor, Activity keeps everything else

**Decision**: Three changes, all inside existing seams.

1. Ludo becomes a quiet-chat game (`quietChat: true`), exactly as Housie, Bingo and UNO already are, so the platform writes no automatic lines while a match runs.
2. Routine room lines that matter during play (a player disconnected, reconnected, a new host) used to reach Chat through `Room.announce`. A new optional engine hook
   `onRoomNotice(match, code, text)` receives them while a quiet match runs; Ludo records the ones it does not already record as Activity entries of a new kind `room`.
   (Departures, removals and inactivity releases already produce a `released` entry through `onSeatReleased`, so Ludo ignores those codes to avoid duplicates.) Every other game does not
   implement the hook, so nothing changes for them.
3. Bot commentary, which Ludo posts as chat lines from the bot's seat (`ctx.say`), is removed: each of those events already has an Activity entry, and the commentary now lives in
   humor (R8). `bot.ts` keeps only the pawn-choice rule.

The pre-match lobby is untouched (it has no Activity view), so "Alice joined" still appears in Chat there. Urgent feedback stays visible outside Chat: the warned player keeps the
"You missed 2 turns" alert in their dice console, a player who is reconnecting or has left keeps the status on their player bubble, refused actions keep their toast, and connection
loss keeps the existing banner; server-known events (others' connection changes, warnings, releases) are also recorded in Activity.

**Rationale**: `quietChat` plus a notice hook reuses the exact mechanism three games already use, and the hook is the smallest change that gets presence lines into Activity without letting
games write their own chat plumbing (Principle IV).

**Alternatives**: Filtering on the client (rejected: the server would still store and replay the lines to reconnecting clients); a platform-wide Activity feed (rejected: far larger than
this request); keeping bot commentary in Chat (rejected: the user wants only humor there).

## R8. Ludo humor: selection, cadence and safety

**Decision**: A server module `server/src/games/ludo/humor.ts`.

- **Pools**: at least 12 general lines ("The dice are watching. Behave.") and at least 12 addressed templates with a `{name}` slot ("{name}, that thumb is warmed up. Roll it.");
  a few addressed templates are conditional on facts the match state already holds (a player with pawns home, a player still waiting on a first 6, a sole leader), so a line can never
  claim something untrue. Tone rules (data-model section 4): encouraging, no insults, no sensitive traits, nothing that mocks being behind (trailing players get comeback lines).
- **Choice**: pick general or addressed at random (about 50/50); an addressed line picks an active player at random, humans and bots both; never an exact repeat of any of the previous five
  lines (a small per-match memory).
- **Cadence**: the first line comes 45 to 90 s after the match (or a replay) starts; each next line 45 to 90 s after the previous one, random each time. The minimum interval makes "no
  more than one per 45 s" hold by construction.
- **Delivery**: `ctx.notice(text, 'humor')`, a system chat line with the new code `humor`, which the chat panel styles distinctly (a small icon and italic text) so it is clearly the
  game talking. Humor lines do not raise the unread count (only people's messages do).
- **No backlog**: the timer re-arms even when it does not post; it posts only when the match is not finished and at least one human is connected (`ctx.isConnected`), so a reconnecting
  player is not handed a pile of missed lines.
- **Development control**: `LUDO_DEV_HUMOR_MS` fixes the interval (for example 2000) outside production so V6 does not take minutes; it is added to the existing dev-variable warning
  list and ignored in production. It cannot choose text or recipients.

**Rationale**: Server-side choice keeps every client's chat identical (Principle V) and reuses the notice path with its existing rate limit and sanitizing. Conditional templates give the
"specific to a user" feel without invented claims.

**Alternatives**: Client-side humor (rejected: different lines per screen, repeats on reload, not in the shared history); an external language model (rejected: cost, latency, safety and no
dependency policy); purely static timing keyed to game events (rejected: the spec asks for random).

## R9. Ludo "Play again": inside the engine, host-only, the players still seated

**Decision**: Follow UNO's precedent. A new intent `{ type: 'playAgain' }` (the strict action schema already contains it for UNO) is handled by the Ludo engine; the room stays
`in_progress`, there is no lobby, no `assignColors` call and no new invite. The engine checks, in order: the caller is the **current host** (`ctx.hostId()`); the match is **finished**; at
least **two** players are still seated (status `active`); every active **human** is currently **connected** (`ctx.isConnected`). The first failure is returned as a short reason (data-model
section 5). On success the engine stops timers and builds a fresh state from the **active players only**, in their existing order, keeping each one's id, colour and kind (the existing
`createInitialState` takes colours as given and numbers slots from the input order, so the remaining players become P1 to PN consecutively); all pawns are in base, no winner, warnings and
counters cleared, and the normal rule gives the first turn to P1. It recomputes the human count (so the existing "last player" logic still works), keeps the Activity list, appends a
`match` entry that names the players ("Match 2 started: Alice, Bob and Casey"), continues the event `seq` (so no screen mistakes it for a stale event), emits `match_started` with the full
snapshot, and starts the first turn. A second request finds the match no longer finished and is refused, so at most one new match starts. The humor timer restarts with the new match.

Players who left are not replaced, and their corners stay empty, exactly as a corner already does in a 2- or 3-player match and after a mid-match departure. Nobody can join: a room whose
match is running refuses new joiners and released players cannot rejoin (existing rules).

Client side: the results overlay shows **Play again** (host only) and **Back to Hub**; other players see "Waiting for {host} to start the next match". When someone has left, the overlay
also shows **who will play** ("Next match: Alice, Bob and Casey. Dan left.") and the button reads "Play again (3 players)", so the smaller table is never a surprise. The button is
disabled with a visible reason when the checks fail locally (a human disconnected, fewer than two players). The server's refusal text is the authority and is shown if the local view was
out of date.

**Rationale**: It is what the owner asked for and it matches UNO, where "Play again" already continues with the seats still occupied. Keeping each player's existing colour matters more
than the standard colour set for the new player count: the room's chat tags, player list and avatar rings use the colour assigned at match start, and the platform has no way for a game to
recolour participants afterwards, so recolouring would leave the board and the rest of the room disagreeing. The board already draws any subset of the four corners. A temporarily
disconnected player blocks replay only until they return or their seat is released (the existing 60 s reconnect rules), so nobody is silently dropped while they might come back. It stays
inside the engine and needs no platform change beyond one `ctx.isConnected` getter.

**Alternatives**: Reassigning colours by player count (2: Yellow and Blue; 3: Yellow, Green, Blue) for a balanced board (rejected: the room's participant colours would diverge from the
board unless the platform gained a recolour capability, a larger shared change for a cosmetic benefit; it can be added later if the diagonal 2-player layout is wanted); blocking replay
whenever anyone left (rejected: not what was asked, and it strands the remaining players); a platform-level rematch that re-runs `createMatch` (rejected: larger shared change, repeats
lobby validation, and every game's state is different); going back to the lobby (rejected: the request); letting any player trigger replay (rejected: host permissions are existing policy
and the spec forbids a new voting flow); dropping a disconnected player automatically (rejected: silent removal; they may reconnect within the window).

## R10. UNO: a persistent turn indicator derived from the table

**Decision**: No protocol change. A pure function `describeTurn(table, you, wheelOpen)` in `client/src/games/uno/turnLabel.ts` turns the public table the server already sends into one
line of text and a style:

| Situation (inputs) | Text for the player who must act | Text for everyone else |
|--------------------|----------------------------------|------------------------|
| `phase` settling | "Dealing..." or "Next turn..." | same |
| `turn` or `drawn`, the actor is a human who lost connection | n/a | "{Name} is reconnecting..." (the server's countdown keeps running) |
| `turn` and a pending penalty the actor can stack | "Your turn: stack a Draw N or draw N" | "{Name} may stack or draw N" |
| `turn` and a pending penalty with no countdown (taken automatically) | "You draw N..." | "{Name} draws N" |
| `phase` turn, bot thinking | n/a | "{Bot} is thinking..." |
| `phase` turn | "Your turn: play a card or draw" | "{Name}'s turn" |
| `phase` drawn | "Play the card you drew, or keep it" | "{Name} is deciding on a drawn card" |
| local colour wheel open | "Pick a colour" | "{Name}'s turn" |
| `phase` finished | "{Name} wins" | same |

The first matching row in this order wins: finished, local colour wheel, settling, connection waiting, drawn, pending penalty, bot thinking, ordinary turn. The 5-second **catch window** never replaces the
turn text (the table still needs to show who is on turn); it adds a secondary note beside it: "Say UNO!" for the player who forgot, "Catch {Name}!" for everyone else.

The label is shown in a **turn strip** (a persistent text pill with the active player's avatar and a draining countdown) placed in the header on screens at least 760 px wide (provisional, set from measurement in V3: the header holds Leave, brand, room code, invite, audio and chat, about 430 px, and the strip needs about 260 px) and as a
thin row under the header on narrower screens (30 px, 24 px on short screens), so wide screens lose no table height; small landscape phones (568 x 320, 640 x 360, 667 x 375) use the row and are re-measured against the 006 limits. The active seat also gets a text chip ("Turn"), and
on your turn the hand area gets a gold frame and the strip pulses; reduced motion removes the pulse and keeps the frame and text. A polite live region announces the label changes.

**Rationale**: The current cues are a ring glow, a countdown arc and a 900 ms "Your turn" banner. They are colour-only and transient, which is why the owner cannot tell "who must play".
Everything needed (turn, phase, pending total, thinking bot, absent countdown) is already in the table.

**Alternatives**: Only lengthening the banner (rejected: still transient and colour-led); a modal "Your turn" (rejected: obstructs play); adding a server `awaiting` field (rejected: the
table already carries it, and a protocol change would touch bots and the privacy audit for no gain).

## R11. UNO card play: where the delay is and the staged "hold then throw"

**Decision**: The play path today is: press (touch lifts the card) then release, `playCard` request, server acknowledgement, a `play` event queued behind any running animation, then a
450 ms throw. Nothing on screen acknowledges the release until the event is animated, so on a normal mobile round trip the card sits still before moving, which matches the report.
The tap-to-play rule in the code is already one action; the fix is acknowledgement, not a rule change:

1. **Immediate hold (feedback only).** On activation of a card the server listed as playable, a ghost of that card lifts from the hand to a hold pose roughly 40% of the way to the
   Discard Pile (120 ms) with a glow ring, and the hand slot shows it as pending. A Wild first opens the colour wheel (no round trip) and the hold starts after a colour is chosen.
   Nothing in the hand, pile or turn changes at this point.
2. **Finish on confirmation.** When the server's `play` event for that card arrives, the animator continues the throw from the hold pose to the pile in 260 ms (instead of starting a new
   450 ms throw from the hand), then commits the table as today. Opponents' plays keep the 450 ms throw.
3. **Return on refusal or silence.** A refusal flies the ghost back in 220 ms, then plays the existing bounce, shake and reason. If no answer arrives within 4 s the ghost returns, a
   "Connection is slow" message appears and the room resynchronizes, so a card never vanishes.
4. Taps on cards not in `playable` keep today's behavior (sent for the server's reason, then the bounce). The single-flight guard (one `play` request at a time) is unchanged, so repeated
   activation sends one request and at most one play commits.
5. Reduced motion: the card shows a pending ring (no flight), then the existing 150 ms fade on confirmation.

The acceptance measurement (V4) records tap-to-acknowledgement and tap-to-landed times at simulated 150 ms and 400 ms round trips, plus a stable local connection.

**Rationale**: It removes the perceived dead time without letting the client decide anything: legality still comes from the server's `playable` list and acknowledgement, and the held card
is shown as pending, not as discarded (FR-007).

**Alternatives**: Optimistic full throw onto the pile (rejected: shows an unconfirmed card as accepted and needs a visible un-throw when refused); shortening animations only (rejected:
does not touch the round trip); firing on pointer-down (rejected: breaks the touch preview and cancel gesture from 006); changing server settle times (rejected: unrelated to this delay).

## R12. UNO chat minimize and keeping the draft

**Decision**: Chat remains the platform `ChatPanel`; UNO adds presentation only.

- **Preference**: a platform store `state/chatPrefs.ts` keeps a per-game tri-state in `localStorage` (`myarena.chat.uno`: absent = default, `open`, `minimized`). Defaults: docked
  column open, phone drawer closed (today's behavior).
- **Docked layouts**: an explicit **Minimize** control in the chat header collapses the column to a 44 px **rail** (chat icon, unread count, "Open chat" label) and the table re-fits
  into the freed width through a new fit mode `rail` (the same pure function that already sizes the dock). **Restore** reverses it.
- **Drawer layouts (phones)**: the header icon opens the sheet; the sheet gains a **Minimize** button, and closing records `minimized`; the icon keeps the unread badge.
- **Draft and history**: the draft text moves into a platform store `state/chatDraft.ts` keyed by room, so closing the drawer (which unmounts the panel) or switching modes does not
  lose it; history already lives in the room store. While minimized the panel reports itself closed (`setDrawerOpen(false)`), so the unread count rises and clears only when the
  conversation is viewed.
- "Play with AI" keeps no chat at all.

**Rationale**: Today the dock cannot be minimized and the drawer unmounts the panel, losing a half-typed message. A rail frees space without hiding that chat exists. Putting the draft and
the preference in the platform lets other games adopt them later (FR-030).

**Alternatives**: Hiding the dock completely (rejected: no way to see unread messages); keeping the panel mounted but hidden (rejected: a hidden panel still needs the unread semantics and
holds focus traps); adopting Housie's `ChatDock` (rejected: it is Housie-specific and migrating Housie is out of scope).

## R13. Housie ticket: bigger numbers, more character, uses the space

**Decision**: Presentation only; ticket data, marking and claims do not change.

- **Why numbers are unclear**: cell width is at least 32 px but cell height is fixed at 0.62 of the width and the digit size is 55% of the height, about 11 px on a 32 px cell.
- **Type scale**: the planner returns row height and number size, not just cell width. Phones (under 768 px wide): row height at least 30 px and number size at least 18 px; from 768 px
  wide: row height at least 38 px and number size at least 24 px; sizes grow with the available width and height up to a cell of 128 px (was 110). The cell aspect becomes adaptive
  (about 0.72 by default) so extra space makes numbers bigger rather than only wider.
- **Space use**: a single ticket or a stack uses at least 90% of its region's width unless the height limits it; with several tickets the existing stack, grid or tabs choice stays but
  every candidate is evaluated against the new minimums. As a last resort on very short screens the ticket region scrolls vertically inside itself (the page never scrolls, nothing
  scrolls horizontally).
- **More interesting, without hurting reading**: a ribbon header with the ticket name and a scalloped edge; nine soft column tints following Housie's number ranges (1-9, 10-19, ... 80-90)
  chosen so dark ink on every tint stays at least 4.5:1; an embossed paper look and a gold frame for the selected ticket; empty cells keep a hatched pattern. All of it is gradients and
  SVG (no images).
- **States without colour alone**: marked cells keep the hand-inked cross and gain a filled inset plus a small corner tick; unmarked cells are plain; empty cells are hatched. Contrast is
  checked by a script during verification (V8).

**Rationale**: The reading problem is geometric, so the planner must reserve more height and size the digits from it; decoration is added in the ribbon, tints and frame where it cannot
compete with the digits.

**Alternatives**: Raising only the font size (rejected: cells are too short, digits would touch the edges, and it does not make the card more interesting); a single wider layout
with horizontal scrolling on phones (rejected: spec forbids horizontal scrolling); five columns instead of nine on phones (rejected: changes the ticket structure).

## R14. Cross-cutting: ownership, deployment, verification, tuning

- **Ownership**: platform = audio engine, preferences, controls, music lifecycle, chat draft and minimize preference, `GameContext.isConnected`, the `notice` code, the
  `onRoomNotice` hook. Games = Ludo replay, humor, Activity kinds; UNO turn strip, staged play, rail; Housie ticket. This keeps Principle IV and lets other games adopt the platform
  pieces ([contracts/platform-extensions.md](contracts/platform-extensions.md)).
- **Render and restart**: no new services, variables or assets. Replay and humor state are in the in-memory match and end with the room on restart (existing reconnect then "room ended"
  flow); audio and chat preferences are on the device and survive a restart. `render.yaml` is unchanged.
- **Bundle**: audio and themes add code only (an estimated 20 to 30 KB uncompressed, loaded with the room route); no assets.
- **Verification** ([quickstart.md](quickstart.md)): browser checks at phone, tablet and desktop sizes in both orientations; scripted Socket.IO clients (kept outside the repository) for
  replay eligibility, chat routing and reconnect; an `OfflineAudioContext` meter that renders each cue and theme and reports peak and loudness (kept outside the repository); a Playwright
  or manual timing run for UNO acknowledgement with a throttled connection; a contrast script for the ticket; recorded listener checks for SC-007 and SC-008. No new automated suites.
- **Hosted verification** is recorded separately and marked pending until run on Render (constitution workflow).

## Spec alignment notes (found while planning)

Three statements in the first draft of the spec disagreed with how the product works or with the owner's intent, and were corrected in [spec.md](spec.md) before this plan relied on them:

1. Housie never marks numbers for the player (003 FR-013), so the spec's "latest-call" ticket state and "automatic marking" were removed; ticket states are blank, unmarked and the
   player's own marks.
2. Ludo replay and players who left: an earlier plan draft made replay unavailable once anyone left. The owner chose UNO's behavior instead, so replay now continues with the players still
   seated (at least two), keeping their seats and colours, with the smaller table shown before the host starts it (R9; spec Story 4, FR-014 to FR-016, SC-004).
3. The pre-match lobby keeps presence lines in Chat because it has no Activity view; the Chat and Activity separation applies once a match is running (R7).
