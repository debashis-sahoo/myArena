---

description: "Task list for Responsive Ludo Game Module with Natural Dice & Hopping Pawn Animation"
---

# Tasks: Responsive Ludo Game Module with Natural Dice & Hopping Pawn Animation

**Input**: Design documents from `/specs/002-ludo-game-module/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md),
[contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: No automated unit or integration tests (user policy and constitution Principle III). Each story ends with a **browser-based
verification** task that records scenario, expected, and observed results (screenshots or measurements) in
`specs/002-ludo-game-module/verification.md`. The existing `npm run smoke` is re-run only as a regression check (T013, T068).

**Organization**: Tasks are grouped by user story. The four P1 stories are ordered by dependency (board and layout, then rules and turn flow,
then the die, then the pawn hops) so every phase leaves a working, verifiable game.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: Maps to the user story in [spec.md](spec.md) (US1 to US8)
- All paths are relative to the repository root `G:\Projects\MyArena`

## Path Conventions

Existing npm workspaces (see [plan.md](plan.md) Project Structure): `shared/src/ludo/`, `server/src/games/ludo/`, `client/src/games/ludo/`,
plus small changes to Platform Core files. Constants and board numbers come from [research.md](research.md) R2 and
[data-model.md](data-model.md); do not invent different values.

---

## Phase 1: Setup (Shared Contracts)

**Purpose**: The board geometry, timing constants, and types that the server and client must agree on

- [X] T001 [P] Create `shared/src/ludo/board.ts` exporting: `RING` (52 `[row, col]` squares in clockwise order exactly as the table in research.md R2, index 0 = Yellow start at `[6,1]`), `START_INDEX` (`yellow: 0, green: 13, blue: 26, red: 39`), `SAFE_RING` (`[0, 8, 13, 21, 26, 34, 39, 47]`), `LANES` (five `[row, col]` squares per colour: yellow `[7,1]..[7,5]`, green `[1,7]..[5,7]`, blue `[7,13]..[7,9]`, red `[13,7]..[9,7]`), `BASE_SPOTS` (four `[x, y]` grid-line centres per colour from R2), `HOME_RECT` (rows 6 to 8, cols 6 to 8), `COLOR_ORDER` (`['yellow','green','blue','red']`), and helpers `ringIndexOf(color, progress)` (`(START_INDEX + progress) mod 52` for progress 0 to 50) and `cellOf(color, progress)` returning `{ kind: 'ring'|'lane'|'home', cell }` for progress 0 to 56 (51 to 55 lane squares, 56 HOME)
- [X] T002 [P] Create `shared/src/ludo/timing.ts` exporting the constants from the data-model timing table: `TURN_TIMER_MS` 15000, `ROLL_TUMBLE_MS` 1400, `HOP_MS` 340, `LAND_PAUSE_MS` 250, `CAPTURE_MS` 900, `HOME_CELEBRATE_MS` 600, `NO_MOVE_PAUSE_MS` 1200, `BOT_PAUSE_MS` 1500, `BOT_THINK_MS` 700, `TURN_HANDOFF_MS` 500, `AWAY_WARN_AT` 2, `AWAY_RELEASE_AT` 3, and a helper `moveDurationMs(hops, captured)` returning `hops * HOP_MS + LAND_PAUSE_MS + (captured ? CAPTURE_MS : 0)`
- [X] T003 [P] Create `shared/src/ludo/types.ts` with `LudoColor`, `PlayerState` (`playerId`, `color`, `slot` 1 to 4, `kind`, `pawns` as four progress values where "-1" is the base and "-2" a removed pawn, `home` 0 to 4, `status` `active`|`left`), `LudoState` (`matchRev`, `phase` of `waiting_roll`|`rolling`|`waiting_move`|`moving`|`finished`, `players`, `turn`, `bonus`, `roll`, `eligible`, `remainingMs`, `sixStreak`, `winner`, `standings`, `warning`, `lastPlayer`, `activity` last 100), `LudoAction` (`{type:'roll'}` or `{type:'move', pawn: 0..3}`), `ActivityEntry` (`id`, `ts`, `kind` of `turn`|`roll`|`move`|`capture`|`home`|`bonus`|`skip`|`timeout`|`warning`|`released`|`win`, `playerId?`, `color?`, `text`), and the `LudoEvent` union (`match_started`, `turn`, `rolled`, `choose`, `no_move`, `moved`, `timeout`, `warning`, `released`, `finished`) with fields exactly as in [contracts/ludo-protocol.md](contracts/ludo-protocol.md); every event carries `seq`, `type`, `state`, and optional `entry`
- [X] T004 Update `shared/src/games.ts` (Ludo `seatColors` to `['yellow','green','blue','red']`), `shared/src/protocol.ts` (add `GAME_EVENT: 'game:event'` to `EVENTS`, optional `game?: LudoState` on `JoinedData`, optional `reason?: 'host' | 'inactive'` on `RemovedData`), and `shared/src/index.ts` (export `./ludo/board.js`, `./ludo/timing.js`, `./ludo/types.js`) (depends on T001, T002, T003)

---

## Phase 2: Foundational (Platform Core Extensions and Engine Skeleton)

**Purpose**: Game-agnostic hooks in the platform and a Ludo engine that can start a match, so every story builds on a live match

**CRITICAL**: No user story work can begin until this phase is complete

- [X] T005 Update `server/src/games/registry.ts` per [contracts/platform-extensions.md](contracts/platform-extensions.md): extend `GameEngine` (`assignColors?(seated)`, `createMatch(seats, ctx)`, `getView`, `onAction`, `onSeatReleased`, `onBotTurn`, `dispose`) and add the `GameContext` interface (`schedule(ms, fn): cancel`, `emit(event)`, `say(playerId, text)`, `releaseSeat(playerId, reason)`, `now()`, `log(level, fields, message)`)
- [X] T006 [P] Update `server/src/games/placeholderEngine.ts` to the new signatures (accepts and ignores `ctx`; no `assignColors`), with no behaviour change
- [X] T007 Update `server/src/rooms/room.ts` (depends on T005): build a `GameContext` in `start()` (timers tracked and cleared in `close()` with exceptions caught and logged; `emit` goes to a new `RoomEvents.game(room, event)`; `say` posts a chat message as that participant through `ChatBuffer`, limited to one message per second per participant and sanitised by the existing `sanitizeChatText`; `releaseSeat` releases a human or bot like a leave with a new reason `inactive` announced as "X was removed for inactivity", and tells `RoomEvents` to notify a connected human); call `engine.assignColors` before `createMatch` and recolour participants and seats; make `projection()` use the occupant's current colour for occupied seats; store the match and add `gameView(playerId)` returning `engine.getView(...)` while a match is in progress; route a new `action(socketId, action)` to `engine.onAction` with the sender's `playerId`
- [X] T008 [P] Update `server/src/sockets/schemas.ts` with a strict `gameActionSchema`: `{ type: 'roll' }` or `{ type: 'move', pawn: integer 0 to 3 }`, rejecting unknown fields
- [X] T009 Update `server/src/sockets/registerHandlers.ts`: implement `RoomEvents.game` to emit `game:event` to the room; handle `game:action` (schema validation, per-socket token bucket "burst 10, 5 per second" returning `RATE_LIMITED`, then `room.action`; a non-ok result becomes `INVALID_STATE` with the engine's reason as the message); add `game: room.gameView(playerId)` to the create/join acknowledgements when a match is in progress; implement the `RoomEvents` notification that sends `player:removed { cooldownMs: 0, reason: 'inactive' }` and detaches the socket (depends on T007, T008)
- [X] T010 [P] Create `server/src/games/ludo/rules.ts` with `assignColors(count)` (2 players: yellow and blue; 3: yellow, green, blue; 4: all four in clockwise order) and `createInitialState(seated, colours, turnMs)` building `LudoState` per [data-model.md](data-model.md): players in slot order (host first, then the other players by seat order) as slots 1 to 4, all pawns at progress -1, `phase: 'waiting_roll'`, `turn` the slot 1 player, `remainingMs` `TURN_TIMER_MS`, empty activity plus a first entry "Match started"
- [X] T011 Create `server/src/games/ludo/engine.ts` as a skeleton `GameEngine`: `assignColors` via `rules.ts`; `createMatch` builds the initial state, emits `match_started` (with `seq` 1) through `ctx.emit`; `getView` returns the current state; `onAction` returns `{ ok: false, reason: 'Not available yet' }`; `onSeatReleased` and `onBotTurn` no-ops; `dispose` cancels timers. Register it for `ludo` in `server/src/games/registry.ts` (depends on T005, T006, T010)
- [X] T012 Update `client/src/state/roomStore.ts` (depends on T004): add a `game` slice (`state: LudoState | null`, `queue: LudoEvent[]`, `lastSeq`); seed `state` from the `game` field of create/join/resume acknowledgements; listen for `game:event` and append to `queue`; add `sendGameAction(action)` using `emitWithAck('game:action', ...)`; clear the slice on leave or room end
- [X] T013 Foundational checkpoint: run `npm run build` and `npm run smoke` (Platform Core regression, 14 checks must still pass), then start a Ludo room with two windows, press Start, and confirm both clients receive `match_started` and the join acknowledgement of a refreshed tab contains `game`; fix any regression

**Checkpoint**: Platform hooks and a live (idle) Ludo match exist; user stories can begin

---

## Phase 3: User Story 4 - A Board That Always Fills the Screen (Priority: P1) MVP slice 1

**Goal**: The match screen with the board, header, and layouts: two columns in landscape (board, then dice, player bubbles and a minimizable chat dock), stacked with a peek drawer in portrait, board always square and maximised, no scrolling.

**Independent Test**: Quickstart G1: start a match, resize and rotate, and measure that the board is square, fully visible, and fills its region with no scrolling at every tested size.

- [X] T014 [P] [US4] Create `client/src/games/ludo/Board.tsx`: the 15 x 15 grid built from `RING`, `LANES`, `BASE_SPOTS`, `HOME_RECT`, and `SAFE_RING` (shared board data); four colour bases with white inner squares and four pawn spots each, white track squares with thin dividers, colour start squares with an arrow along the direction of travel, star icons on star safe squares, colour lanes with an arrow toward HOME, centre "HOME" with four colour triangles; takes the board `side` in pixels and sets `--cell = side / 15`
- [X] T015 [P] [US4] Create `client/src/games/ludo/useBoardFit.ts`: a hook using `ResizeObserver` on the board's region that returns `side = floor(min(regionWidth, regionHeight))` (landscape) or `floor(min(containerWidth, 0.85 * viewportHeight, viewportHeight - chromeHeight))` (portrait, where `chromeHeight` is the measured height of the header, dice section, player bubbles, drawer handle, and safe-area insets) and re-fits within 0.5 s of a resize, rotation, or chat dock change
- [X] T016 [P] [US4] Create `client/src/games/ludo/layoutPrefs.ts`: `LayoutPreference` stored in `localStorage` under one key with `chatOpen` (null until chosen; the screen then opens the chat dock, except minimized on short landscape phones) and `activityTab` (`chat`|`activity`), plus a `useLayoutPrefs()` hook (FR-006)
- [X] T017 [P] [US4] Create `client/src/games/ludo/ludo.css` with the board and layout styles from [contracts/match-screen-layout.md](contracts/match-screen-layout.md): quadrant colours (Yellow `#ffcc1a`, Green `#1fcf6a`, Blue `#2f8cff`, Red `#ff3b4f`), `aspect-ratio: 1 / 1` board, the `landscape` two-column grid (`[board | right column]`, `100dvh`, no page scroll), the `portrait` stack, the compact variant (height <= 520 px), the `portrait-compact` tier (portrait and height < 700 px: one-line header, single-row dice console, one row of small bubbles, 56 px drawer handle), safe-area padding, the chat dock (Minimize / Open bar) and the peek-drawer positioning
- [X] T018 [P] [US4] Create `client/src/games/ludo/MatchDialogs.tsx`: a "Lobby" dialog (platform `Modal` containing the platform `Lobby` component: players, invite link, host controls disabled during a match) and a "Quit" confirmation dialog that calls `leaveRoom()` and navigates to the Hub, per FR-007
- [X] T019 [US4] Create `client/src/games/ludo/LudoScreen.tsx`: header (Hub brand, "LUDO ROOM" with the room code, invite link with the platform copy control, small player avatars, "Lobby" and "Quit" buttons); layout mode from `(orientation: landscape)` plus width >= 560 px, compact when landscape height <= 520 px, and portrait-compact when portrait height < 700 px; landscape right column with the dice console, the player bubbles, and the chat dock (platform `ChatPanel` via `SidePanel`) with a Minimize / Open bar persisted via `layoutPrefs.ts`; the board region measured by `useBoardFit`; portrait stack with the platform `ChatDrawer` as a temporary peek drawer; renders `MatchDialogs` (depends on T014, T015, T016, T017, T018)
- [X] T020 [US4] Update `client/src/games/registry.ts` (depends on T019) with `getMatchScreen(gameId)` (Ludo returns `LudoScreen`) and update `client/src/components/room/RoomShell.tsx` to render the game's match screen while `room.state === 'in_progress'` (generic stage and panel layout otherwise)
- [X] T021 [US4] Run quickstart G1 in the browser (host plus guest window): at 320x568, 360x640, 390, 768, 1024, 1366, 1440, 1920 and 2560 px wide in portrait and landscape (portrait at 320x568 and 360x640 must show header, board, dice section, panels, and drawer handle without scrolling), measure the board rectangle (equal width and height, fully visible, page never scrolls, landscape board >= 90% of the smaller side of its region, portrait board >= 90% of min(width, 85% of viewport height) and never taller than 85% of viewport height); minimize and reopen the chat dock and reload to confirm the state is remembered; rotate during a hop-free state; create `specs/002-ludo-game-module/verification.md` and record scenario, expected, observed, and screenshots

**Checkpoint**: The match screen works as a layout; the board is always square and maximised

---

## Phase 4: User Story 3 - Play a Full Match with Standard Rules (Priority: P1) MVP slice 2

**Goal**: Server-authoritative rules, dice, turn order, timers, and winner, with basic controls on the screen so a complete match is playable.

**Independent Test**: Quickstart G4 and G9: play with controlled dice through 6-to-exit, bonus rolls, capture, safe squares, three sixes, exact finish, and a winner; confirm out-of-turn actions are refused.

- [X] T022 [P] [US3] Create `server/src/games/ludo/dice.ts`: `rollDie()` using `crypto.randomInt(1, 7)`; development-only controls read only when `NODE_ENV !== 'production'` and ignored with a startup warning in production: `LUDO_DEV_DICE` (comma list of 1 to 6 used in order, then random), `LUDO_DEV_SCENARIO=endgame` (each player starts with three pawns on HOME (progress 56) and one at progress 50), `LUDO_TURN_MS` (replaces the 15 s countdown)
- [X] T023 [US3] Extend `server/src/games/ludo/rules.ts` with pure rules: `eligiblePawns(state, playerId, roll)` (base pawn only on 6; `progress + roll <= 56`; exact finish), `applyMove(state, playerId, pawn, roll)` returning `path` (one `{kind, cell}` per square entered, a single hop to the start square when leaving the base), `captured` (landing on a ring square with progress 0 to 50 that is not in `SAFE_RING` captures every pawn of other colours there; passing over never captures), `reachedHome`, and `bonus` (rolled 6, captured, or reached HOME); `nextActivePlayer(state)` in slot order skipping `left` players; `chooseAutoPawn(state, playerId, roll, eligible)` applying the research R5 priority list (finish a pawn; capture; leave the base on a 6; move a pawn in danger, meaning a non-safe ring square with an opponent 1 to 6 squares behind it; land on a safe square; otherwise the pawn with the greatest progress) for countdown auto-play and bots; `winnerOf(state)` (a player's `home` reaches 4) and `standingsOf(state)` (ranked by pawns home)
- [X] T024 [US3] Extend `server/src/games/ludo/engine.ts` with the full turn flow per [data-model.md](data-model.md) and [contracts/ludo-protocol.md](contracts/ludo-protocol.md): `onAction` validates `roll` (only the turn player, phase `waiting_roll`) and `move` (only the turn player, phase `waiting_move`, only a pawn in `eligible`) with friendly reasons ("It is not your turn", "Roll first", "That pawn cannot move"); `roll` decides the value server-side, emits `rolled` with `tumbleMs` `ROLL_TUMBLE_MS`, enters `rolling`, then after the tumble emits `choose` and starts the 15 s countdown (or `no_move` after `NO_MOVE_PAUSE_MS` when nothing is eligible); sixes grant a bonus roll even when no pawn can move, and the third 6 in a row emits `no_move` with reason `three_sixes` and passes the turn; `move` applies the move, emits `moved` with `path` and `captured`, enters `moving` for `moveDurationMs(path.length, captured)`, then continues with a bonus `turn` (rolled 6, captured, or reached HOME) or hands off to the next player after `TURN_HANDOFF_MS`; countdown expiry within 1 s auto-plays the roll or the pawn chosen by `chooseAutoPawn` and emits `timeout`; `getView` and every snapshot report `remainingMs` as the time actually left on the active deadline at that moment (never the full 15000 once the countdown is running); the match ends with `finished` (winner and standings) when a fourth pawn reaches HOME; every event carries a full snapshot, increments `seq` and `matchRev`, and appends an activity entry (depends on T022, T023)
- [X] T025 [P] [US3] Create `client/src/games/ludo/useLudo.ts`: a hook over the room store's `game` slice that plays queued events in `seq` order (ignoring duplicates and older `seq`), exposes the displayed `LudoState`, `isMyTurn`, `canRoll`, `eligible`, `remainingMs` (a local countdown started from the event's `remainingMs`), and the actions `roll()` and `move(pawn)` that call `sendGameAction`; in this phase events are applied without animation
- [X] T026 [P] [US3] Create `client/src/games/ludo/Pawns.tsx` (functional version): an overlay layer on the board positioning each pawn at its square from `cellOf`/`BASE_SPOTS` using percentages of the board, laying out several pawns on one square with offset and reduced scale, marking eligible pawns, and calling `move(pawn)` when an eligible pawn is clicked or tapped
- [X] T027 [P] [US3] Create `client/src/games/ludo/DiceConsole.tsx` (functional version): "DICE ROLL" title, the turn text ("YOUR TURN!" or the other player's name and colour), a countdown starting at 0:15, the last roll value as a number, and a ROLL DICE button enabled only for the roller in `waiting_roll`
- [X] T028 [P] [US3] Create `client/src/games/ludo/ResultsOverlay.tsx`: winner announcement and standings (pawns home per player) with a "Back to Hub" button, shown when `phase === 'finished'`
- [X] T029 [US3] Integrate into `client/src/games/ludo/LudoScreen.tsx`: render `Pawns` on the board, `DiceConsole` in the right column (and the dice section in portrait), and `ResultsOverlay`; keep the layout rules from US4 (depends on T025, T026, T027, T028)
- [X] T030 [US3] Run quickstart G4 and G9 in two browser windows with `LUDO_DEV_DICE=6,6,4,6,3,2,6` (3 players) and `LUDO_DEV_SCENARIO=endgame`: 6 to leave the base, bonus roll after a 6, move counts, a capture by landing on a non-safe square (Yellow at progress 10 with a 6 lands on ring index 16 where Green's pawn stands), no capture on a star or start square, three sixes forfeit, exact finish (larger roll makes the pawn ineligible), winner and standings; try roll and move from the wrong window and confirm refusal; confirm countdown auto-play within 1 s with `LUDO_TURN_MS=3000`; record evidence in verification.md

**Checkpoint**: A full 2 to 4 player match is playable with correct rules and a winner (basic visuals)

---

## Phase 5: User Story 1 - Take a Turn: Roll a Natural-Looking Die (Priority: P1)

**Goal**: The prominent "DICE ROLL" console with the unmistakable active-turn treatment and a large, physically natural 3D-style die.

**Independent Test**: Quickstart G2: confirm the turn highlight, tooltip and countdown; roll by die click, spacebar and ROLL DICE; each tumble is natural and settles on the server's value on every screen.

- [X] T031 [P] [US1] Create `client/src/games/ludo/anim/dice.ts`: a fixed lookup of cube rotations for faces 1 to 6; a function that builds the Web Animations keyframes for the tumble (`ROLL_TUMBLE_MS` 1400 ms: throw and lift, spin mainly about the vertical axis in a random travel direction with decaying speed and a smaller forward tumble, three decaying bounces at about 100%, 45% and 18% of the tray height, travel that slows to a stop, final settle onto the target face), the shadow ellipse keyframes (shrinks and fades while airborne), a motion blur keyframe ("0 to 3 px and back"), and a camera-shake keyframe set for the console wrapper at each landing; `playRoll(parts, value, reducedMotion)` returns a promise; in reduced motion it only fades to the result face with a 200 ms scale pulse (no blur, no shake)
- [X] T032 [P] [US1] Create `client/src/games/ludo/Die.tsx`: a CSS 3D cube (`transform-style: preserve-3d`) with six pip faces, each face made of three stacked rounded slabs (ivory, bevelled edges and corners, dark pips, inner shading), a soft ground shadow element, and a dark felt tray; sized `clamp(96px, 11vmin, 168px)` on desktop, `clamp(80px, 11vw, 112px)` in portrait and 64 to 72 px in the compact tiers; exposes a `ref` for the animation and renders as a `button` (accessible name "Roll the die", disabled unless rolling is allowed)
- [X] T033 [US1] Upgrade `client/src/games/ludo/DiceConsole.tsx` (depends on T031, T032): pulsing active-state border in the roller's colour; countdown overlay "0:15" from `remainingMs`; on the roller's own screen a flashing golden border around the roll target and a bouncy "Your Turn to Roll!" tooltip, and for everyone else a translucent, non-interactive status ("P2's TURN..."); the big "ROLL DICE" button, a click or tap on the die, and the spacebar (ignored when an input, textarea, or modal has focus) all call one `roll()` that ignores further input while a roll is pending and shows a "Rolling..." or "Waiting for the server" state (FR-043); announces the result in a polite live region
- [X] T034 [US1] Update `client/src/games/ludo/useLudo.ts` (depends on T025, T031) to sequence the `rolled` event: run `playRoll` with the event's value, apply the console camera shake, hold the eligible-pawn highlight until the tumble ends, then show the result number; the `choose` event starts the displayed countdown; skip the tumble and show the final face when events are skipped (join, reconnect, backlog)
- [X] T035 [US1] Extend `client/src/games/ludo/ludo.css` with the die, tray, shadow, console, golden border, tooltip bounce, active pulse, translucent inactive state, and the reduced-motion variants
- [X] T036 [US1] Run quickstart G2 in the browser (two windows, then a phone viewport): turn highlight and tooltip, countdown, roll by die click, spacebar and ROLL DICE each tumble (bounces, spin, shadow, blur, shake) and settle flat on the same face on both screens; clicking during the tumble does nothing; rotate or resize during a tumble and confirm it finishes cleanly with state unchanged; die size >= 80 px desktop and >= 64 px phone; countdown expiry rolls automatically; reduced-motion variant; record evidence in verification.md

**Checkpoint**: Rolling feels physical and the turn state is unmistakable

---

## Phase 6: User Story 2 - Move a Pawn with Bouncy Square-by-Square Hops (Priority: P1)

**Goal**: Glossy 3D-style pawns that pulse when eligible and hop square by square with dust puffs, squash-and-stretch, a highlighted route, and an explosive bounce-back on capture.

**Independent Test**: Quickstart G3 (and the capture visuals of G4): count exactly N hops for a roll of N, see the route highlight, puffs and squash, and a dramatic return to base on capture.

- [X] T037 [P] [US2] Create `client/src/games/ludo/Pawn.tsx`: an inline-SVG 3D-style pawn (sphere head and tapered body with a colour gradient, specular highlight, rim light, base ring) with a separate ground-shadow element, a number badge shown on request, `eligible` pulse styling, and an accessible name such as "Yellow pawn 2, 7 squares from home"
- [X] T038 [P] [US2] Create `client/src/games/ludo/anim/hop.ts`: `hopAlong(pawn, shadow, points, cellPx, reducedMotion)` playing one Web Animations chain per square (`HOP_MS` 340 ms): outer linear translation to the next square centre, inner parabolic arc about 0.9 cell high with squash on take-off and landing and stretch at the apex, shadow shrinking while airborne; resolves after the last landing; in reduced motion it steps 120 ms per square with a landing highlight
- [X] T039 [P] [US2] Create `client/src/games/ludo/anim/puff.ts`: creates a dust puff (a ring plus at most 5 particles, 450 ms) at a point on the overlay and removes it from the DOM when finished
- [X] T040 [P] [US2] Create `client/src/games/ludo/anim/capture.ts`: `bounceHome(pawn, from, toSpot, cellPx, reducedMotion)` (the captured pawn lifts, spins, and arcs back to its base spot with a burst, `CAPTURE_MS` 900 ms; a quick fade in reduced motion) and `celebrateHome(point)` (a sparkle at the HOME centre, `HOME_CELEBRATE_MS` 600 ms)
- [X] T041 [US2] Upgrade `client/src/games/ludo/Pawns.tsx` to use `Pawn`: positions from the displayed state, stacking layout (offset and reduced scale), an invisible hit area of at least 40 px (eligible pawns win hit tests; two eligible pawns on one square are equivalent so the first moves), focus only on eligible pawns, and the `hopAlong`, puff, capture, and home animations driven by the `moved` event (depends on T037, T038, T039, T040)
- [X] T042 [US2] Update `client/src/games/ludo/useLudo.ts` to sequence the `moved` event from the currently displayed progress: highlight the route squares, hop square by square (one hop per `path` item, puff and squash on each landing), then play captured pawns' `bounceHome`, then `celebrateHome` when `reachedHome`, then show the event's state; skip animations when more than 3 events are queued or when joining or reconnecting
- [X] T043 [US2] Update `client/src/games/ludo/Board.tsx` and `client/src/games/ludo/ludo.css`: accept a list of highlighted route squares and a landing square, draw the route glow and landing flash, and add the pawn, shadow, eligible pulse, puff, and reduced-motion styles
- [X] T044 [US2] Run quickstart G3 and the capture steps of G4 in the browser: with a roll of 4, select the pulsing pawn and count exactly 4 hops with puff and squash per landing and the route highlighted (no sliding or teleporting); leaving the base hops onto the start square; ineligible pawns do not respond; capture shows the explosive bounce to the owner's base with an announcement; tap pawns reliably on a 390 px wide phone; rotate or resize mid-hop and confirm the hop finishes cleanly with state unchanged; other player's window shows the same hops in the same order; record evidence in verification.md

**Checkpoint**: Movement is the bouncy, physical experience the spec asks for

---

## Phase 7: User Story 5 - See Who Is Here: Circular Player Bubbles (Priority: P2)

**Goal**: Compact circular bubbles with avatar ring, name, host crown, "n/4" badge, and connection state; board corners labelled and unused corners dimmed.

**Independent Test**: Quickstart G6.

- [X] T045 [P] [US5] Create `client/src/games/ludo/PlayerPanels.tsx` (depends on T012): one circular bubble per seated player (avatar in a colour ring, name underneath, host crown, an "n/4" home badge from `PlayerState.home`, connection state taken from the platform `room.seats` occupant: "Reconnecting" while disconnected, "Left" once `status` is `left`), the active player's ring glows and pulses, others calm; a smaller variant for the compact layouts; never overlaps board squares
- [X] T046 [US5] Update `client/src/games/ludo/Board.tsx` to label each home corner with the slot ("P1", "P2", "P3", "P4") in the player's colour plus a "(Host)" tag on whichever player is currently host (it moves on host handover), and to dim corners that have no player (FR-008)
- [X] T047 [US5] Integrate `PlayerPanels` into `client/src/games/ludo/LudoScreen.tsx` (right column below the console in landscape, a row under the dice section in portrait) and add bubble styles to `client/src/games/ludo/ludo.css`
- [X] T048 [US5] Run quickstart G6 in the browser: bubbles show avatar, name, host crown, progress, connection; the active bubble glows; moving a pawn HOME updates the "n/4" badge on both screens; closing a window shows "Reconnecting" then "Left"; with 2 players only the Yellow and Blue corners are lit; record evidence in verification.md

**Checkpoint**: Presence and progress are readable at a glance

---

## Phase 8: User Story 6 - Play Solo Against Believable Bots (Priority: P2)

**Goal**: Bots that pause, roll, choose sensibly, hop like humans, and comment in chat.

**Independent Test**: Quickstart G7.

- [X] T049 [P] [US6] Create `server/src/games/ludo/bot.ts`: `chooseBotPawn(state, playerId, roll, eligible)` delegating to `chooseAutoPawn` from `rules.ts` (T023; the research R5 priority list, shared with countdown auto-play), and commentary phrase pools (at least 6 variants each) for a 6, a capture, a pawn reaching HOME, a win, and a skipped turn
- [X] T050 [US6] Update `server/src/games/ludo/engine.ts` so a bot's turn runs the same internal roll and move functions as humans: wait `BOT_PAUSE_MS`, roll, wait `ROLL_TUMBLE_MS + BOT_THINK_MS`, choose with `chooseBotPawn`, move; bots have no countdown and never count as missed; notable events call `ctx.say(botPlayerId, text)` (at most one message per bot per second); ensure a Play with AI room starts the match (when the host presses Start) with the human as host and slot 1 (depends on T049)
- [X] T051 [US6] Run quickstart G7 in the browser: Play with AI with 1, 2, and 3 opponents; each bot turn shows about a 1.5 s pause, a natural tumble, a legal sensible pawn choice with hops, and a chat comment for 6s, captures, pawns home and wins; bots never act out of turn; the human can win and lose; record evidence in verification.md

**Checkpoint**: A single player can enjoy the whole game

---

## Phase 9: User Story 7 - Chat and Activity From the Match Screen (Priority: P2)

**Goal**: Platform chat plus a game activity log, in a minimizable dock under the dice console in landscape and in a peek drawer in portrait with an unread indicator.

**Independent Test**: Quickstart G5.

- [X] T052 [P] [US7] Create `client/src/games/ludo/ActivityLog.tsx`: the `activity` list from the displayed state in order, each entry showing the actor's name and colour, auto-scrolling, in a polite live region
- [X] T053 [US7] Create `client/src/games/ludo/SidePanel.tsx`: a two-tab container (Chat using the platform `ChatPanel`, Activity using `ActivityLog`) that remembers the selected tab in `layoutPrefs.ts`; unread is not recomputed here: it reuses the platform room store's `drawerOpen` and `unread` by calling `setDrawerOpen(true)` whenever the Chat tab is actually visible (column open or drawer expanded, Chat tab selected) and `setDrawerOpen(false)` otherwise, and the Chat tab and the portrait drawer handle display the store's `unread` count (depends on T052)
- [X] T054 [US7] Update `client/src/games/ludo/LudoScreen.tsx` and `client/src/games/ludo/ludo.css`: use `SidePanel` in the landscape chat dock (right column, under the dice and bubbles, with a Minimize / Open bar and unread badge) and in a Ludo peek drawer for portrait (collapsed handle about 56 px with the unread badge, expanded about 58% of the viewport height, sits above the bottom safe area, keeps half-typed text and scroll position when collapsed), replacing the temporary platform drawer from T019
- [X] T055 [US7] Run quickstart G5 from a portrait phone viewport and a landscape window: join by invite link, state and timer match the host within 1 s, open the drawer, send and receive chat, see the unread badge when collapsed, switch to Activity and see rolls, moves and captures in order; refresh the guest mid-match and confirm it returns to the current state without replaying moves; record evidence in verification.md

**Checkpoint**: Chat and game activity are usable on every layout

---

## Phase 10: User Story 8 - Keep Playing Through Drops, Timeouts and Departures (Priority: P3)

**Goal**: Fair, unblocked play through disconnects, missed turns, and departures.

**Independent Test**: Quickstart G8.

- [X] T056 [US8] Update `server/src/games/ludo/engine.ts` with missed-turn tracking: a turn with any auto-played action increments the player's `missed` count (server-only), any manual action resets it to 0, at `AWAY_WARN_AT` (2) set `warning` to that player and emit `warning` plus an activity entry, at `AWAY_RELEASE_AT` (3) call `ctx.releaseSeat(playerId, 'inactive')`
- [X] T057 [US8] Update `server/src/games/ludo/engine.ts` `onSeatReleased`: mark the player `left`, set their pawns to "-2" (removed), clear them from the board and from `eligible`, skip them in `nextActivePlayer`, cancel timers and pass the turn immediately if it was theirs, emit `released` with a full snapshot and an activity entry, and keep the match running for the rest; when only one human remains, set a `lastPlayer` notice in the state and emit an activity entry "You are the last player", which the client shows as a banner with a Quit hint (they can play on or quit; quitting closes the room)
- [X] T058 [P] [US8] Update `client/src/state/roomStore.ts` and `client/src/components/room/RoomStatusScreen.tsx`: handle `player:removed` with `reason: 'inactive'` (new status kind `inactive`, shown as "You were removed for inactivity" with a Back to Hub button and no rejoin countdown), keeping the existing `host` behaviour
- [X] T059 [P] [US8] Add the warning banner to `client/src/games/ludo/DiceConsole.tsx` (shown on the affected player's screen when `state.warning` is their id: "You missed 2 turns. Miss another and you will be removed") and make the activity log show warnings and removals; show a "You are the last player" banner with a Quit hint on the screen of `state.lastPlayer`
- [X] T060 [US8] Update `client/src/games/ludo/useLudo.ts` and `client/src/games/ludo/LudoScreen.tsx` for resilience: on reconnect or late join the join acknowledgement's `game` replaces the displayed state with no animation replay; when the tab becomes visible again with queued events, jump to the latest state; show the "Waiting for the server" state while a request is pending (FR-043)
- [X] T061 [US8] Run quickstart G8 in the browser with `LUDO_TURN_MS=3000`: do nothing for a turn (auto-played within 1 s), a warning after two missed turns, removal after the third (announcement, pawns gone, others continue, "removed for inactivity" screen, host handover if the host was removed); acting manually resets the count; disconnect a player inside and outside the 60 s window; in a Play with AI match the removal ends the match; record evidence in verification.md

**Checkpoint**: The match stays fair and unblocked in real-world conditions

---

## Phase 11: Polish & Cross-Cutting Concerns

**Purpose**: Accessibility, motion, contrast, performance, documentation, regression, and compliance

- [X] T062 [P] Accessibility pass in `client/src/games/ludo/`: a polite live region announcing turn changes, rolls, "no move", captures, pawns home, warnings and the winner; keyboard flow (spacebar rolls only on the player's turn and never from inputs or dialogs; Tab reaches only eligible pawns and the die; Enter or Space on a pawn moves it); focus handling for the Lobby and Quit dialogs; visible hover, pressed, and focus states using the platform control styles (FR-041)
- [X] T063 [P] Reduced-motion audit of `client/src/games/ludo/ludo.css` and `client/src/games/ludo/anim/`: with `prefers-reduced-motion: reduce` there is no tumble, blur, shake, hop arc, puff, squash or bounce; results and destinations are still clearly highlighted and every control still works (FR-040, SC-013)
- [X] T064 [P] Contrast and visibility audit of the Ludo UI (panel text, console text, tooltip, badges, board labels, tooltips on the quadrant colours): compute ratios for the real colour pairs (4.5:1 for text) and fix any shortfall in `client/src/games/ludo/ludo.css`
- [X] T065 Performance check in the browser with a 4x CPU slowdown during a 4-player match (SC-014): 95% of frames at or under 20 ms in the performance panel, no visible stutter during hops and tumbles, no long tasks caused by particles, animations use transforms and opacity only, `will-change` applied only while animating; fix hot spots in `client/src/games/ludo/anim/` and `Pawns.tsx`
- [X] T066 [P] Update `README.md`: Ludo overview, the development-only variables (`LUDO_DEV_DICE`, `LUDO_DEV_SCENARIO`, `LUDO_TURN_MS`) with a clear note that production ignores them, and links to this feature's quickstart
- [X] T067 Add structured info logs in `server/src/games/ludo/engine.ts` via `ctx.log` for match started, countdown timeouts, warnings, seats released for inactivity, and match finished (room id and player slot only; never guest ids)
- [X] T068 Regression and build: run `npm run build`, `npm run smoke`, and `npm run smoke -- --rooms 50`; all Platform Core checks must still pass; fix any regression introduced by the platform changes; then start the server with `NODE_ENV=production` and `LUDO_DEV_DICE=6,6,6`, `LUDO_DEV_SCENARIO=endgame`, `LUDO_TURN_MS=1000` set and confirm the startup warning appears and that rolls are random, pawns start in the base, and the countdown is 15 s (the development controls have no effect in production)
- [ ] T069 Run the complete [quickstart.md](quickstart.md) pass G1 to G10 on a desktop browser and a phone viewport in both orientations (2, 3 and 4 players, and Play with AI); confirm SC-001 to SC-014, including a 100-roll observation (a bot-only or dev-speed match; compare each shown face with the activity log entry, SC-005), a timed first-turn run by someone new to the game (SC-007), and bot pause timing from the activity timestamps (SC-008); obtain a reviewer sign-off against the reference image (SC-015), and update `specs/002-ludo-game-module/verification.md`
- [ ] T070 Deploy and verify on Render (quickstart G11; run 001's pending Render tasks T088 and T093 first or together, since this relies on the platform keepalive and deployment): with the development variables unset, repeat G1, G2, G3 and G5 over HTTPS, play a 4-player match to the end, and trigger a redeploy during a match (expect the existing "room ended" screen); record results, marking anything not yet possible as pending, in `specs/002-ludo-game-module/verification.md`
- [X] T071 Record a constitution compliance review in `specs/002-ludo-game-module/verification.md` covering Principles I to V, Runtime and Deployment Constraints, and the Development Workflow gates, listing any pending Render verification

---

## Phase 12: Layout, Die and Bubble Revision (2026-11-02)

**Purpose**: Requested adjustments after the first implementation: chat under the dice with a minimize option, a bigger rounded die that rolls
more naturally, and smaller circular player cards that free space for chat. Spec, plan, research, data model, contract and quickstart were
updated to match; evidence is in the "Revision 2026-11-02" section of `verification.md`.

- [X] T072 [US4] Replace the landscape three-column grid with two columns in `client/src/games/ludo/LudoScreen.tsx` and `ludo.css`: the board on the left; on the right the dice console, the player bubbles, and a chat dock (`SidePanel` under a Minimize / Open bar with an unread badge, state in `layoutPrefs.ts`); remove the left chat column, its resize handle, and `chatWidth`; widen the right column to `clamp(336px, 28vw, 430px)`; the dock starts minimized on short landscape phones
- [X] T073 [US1] Rework the die: `Die.tsx` builds each face from three stacked rounded slabs (rounded edges and corners); `ludo.css` enlarges the die (`clamp(96px, 11vmin, 168px)` desktop, `clamp(80px, 11vw, 112px)` portrait, 64 to 72 px compact) and the tray; `anim/dice.ts` makes each tumble travel across the tray from a random side with decaying bounces, a dominant vertical-axis spin and a random forward tumble; the stacked console shows the tooltip below the die
- [X] T074 [US5] Rewrite `PlayerPanels.tsx` as circular bubbles (avatar in a colour ring, name underneath, host crown, "n/4" badge, connection text, pulsing ring for the active player) with a smaller compact variant; remove the panel and avatar-chip styles
- [X] T075 [US4] Use the single-row dice console (die left, turn info right) in portrait and on heights under 700 px so the board keeps at least 90% of its target size; hide the console title in the compact tiers
- [X] T076 Re-measure in the browser at 13 viewports from 320x568 to 1920x1080 (board square and fully visible, no page scroll, right column not overflowing, chat dock open and minimized), update the affected documents, and append the results to `verification.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies; T001 to T003 are parallel, T004 follows them
- **Foundational (Phase 2)**: depends on Setup; **blocks all user stories**
- **User stories (Phases 3 to 10)**: depend on Foundational; follow the order below
- **Polish (Phase 11)**: depends on the stories being verified

### User Story Dependencies

| Story | Priority | Depends on | Notes |
|-------|----------|------------|-------|
| US4 Board and layout | P1 | Foundational | Fully visual; uses the idle match from T011 |
| US3 Rules and turn flow | P1 | Foundational, US4 (screen) | Introduces basic controls, functional pawns and console |
| US1 Dice | P1 | US3 | Upgrades the console and adds the die |
| US2 Pawn hops | P1 | US3 (US1 for sequencing with the die) | Upgrades pawns; sequencing builds on T034 |
| US5 Player bubbles | P2 | US3 | Reads player state and platform connection state |
| US6 Bots | P2 | US3 (US1, US2 for polished bot turns) | Server-side; visuals reuse US1 and US2 |
| US7 Chat and activity | P2 | US4 (layout), US3 (events for the log) | Replaces the temporary drawer |
| US8 Resilience | P3 | US3, US5 (panel states), US7 | Server removal rules plus client resync |

### Within Each User Story

- Shared and server pieces before client sequencing; animation helpers before the component that uses them; the verification task last
- Tasks touching the same file are sequential: `engine.ts` (T011, T024, T050, T056, T057), `rules.ts` (T010, T023), `LudoScreen.tsx` (T019, T029, T047, T054, T060), `useLudo.ts` (T025, T034, T042, T060), `ludo.css` (T017, T035, T043, T047, T054, T063, T064), `Board.tsx` (T014, T043, T046), `DiceConsole.tsx` (T027, T033, T059), `Pawns.tsx` (T026, T041)

### Parallel Opportunities

- Setup: T001, T002, T003
- Foundational: T006, T008, T010 together; T005 to T009 are server platform work, T012 client store
- US4: T014, T015, T016, T017, T018
- US3: T022 with T025, T026, T027, T028 (client pieces can be built while the engine is written)
- US1: T031, T032; US2: T037, T038, T039, T040
- US7: T052; US8: T058, T059
- Polish: T062, T063, T064, T066

---

## Parallel Example: User Story 2

```text
# Once US3 is done, launch together (different files):
T037 client/src/games/ludo/Pawn.tsx
T038 client/src/games/ludo/anim/hop.ts
T039 client/src/games/ludo/anim/puff.ts
T040 client/src/games/ludo/anim/capture.ts
```

---

## Implementation Strategy

### MVP First

1. Complete Phase 1 and Phase 2 (shared contracts, platform hooks, idle Ludo match).
2. Phase 3 (US4): the board and responsive layout, verified by measurement.
3. Phase 4 (US3): rules, dice, turn flow and basic controls. **This is the first playable game** (visuals simple, rules correct).
4. Phase 5 and 6 (US1, US2): the natural die and the hopping pawns, which are the visual heart of the request.

### Incremental Delivery

1. Playable and correct (through US3), then polished (US1, US2).
2. Add presence (US5), bots (US6), and chat and activity (US7).
3. Finish with resilience (US8) and the polish and deployment phase.
4. Deploy to Render early (after US3) to learn real-network behaviour; repeat G1, G2, G3 and G5 on the deployed URL after US2 and US7.

### Notes

- [P] tasks touch different files and have no unmet dependency.
- Every story ends with a recorded browser verification; screenshots or measurements are required for visual checks.
- Per the constitution and your policy, do not add automated unit tests; use the development-only dice, scenario, and timer controls for repeatable checks, and never let them affect production.
- Commit after each task or logical group. Stop at any checkpoint to validate the story independently.
