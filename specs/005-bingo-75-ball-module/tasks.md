---

description: "Task list for Bingo (75-Ball) Visual-First Game Module"
---

# Tasks: Bingo (75-Ball) Visual-First Game Module

**Input**: Design documents from `/specs/005-bingo-75-ball-module/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md),
[contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: No automated unit or integration tests (user policy and constitution Principle III). Each story ends with a **browser-based
verification** task that records scenario, expected and observed results (screenshots or measurements) in
`specs/005-bingo-75-ball-module/verification.md`. The existing `npm run smoke` is re-run only as a regression check (T015, T074).

**Organization**: Tasks are grouped by user story. The five P1 stories are ordered by dependency (setup, cards, daubing, caller, claims) so every
phase leaves a working, verifiable game; the three P2 stories (chat, layout, host dashboard) follow.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: Maps to the user story in [spec.md](spec.md) (US1 to US8)
- All paths are relative to the repository root `G:\Projects\MyArena`

## Path Conventions

Existing npm workspaces (see [plan.md](plan.md) Project Structure): `shared/src/bingo/`, `server/src/games/bingo/`, `client/src/games/bingo/`, plus
configuration and registration changes in Platform Core files. Constants, rules and wire shapes come from [data-model.md](data-model.md),
[contracts/bingo-protocol.md](contracts/bingo-protocol.md) and [research.md](research.md); do not invent different values. Bingo adds **no new platform
hook** ([contracts/platform-integration.md](contracts/platform-integration.md)); every shared change must leave Ludo and Housie behaving exactly as before.
Bingo-owned shared names are prefixed (`BINGO_*`, `Bingo*`, `getBingoPattern`, `evaluateBingoPattern`) because `shared/src/index.ts` re-exports with
`export *`; reuse the existing neutral `PlayerRef`, `CallerState`, `AUTO_INTERVALS_MS`, `CLAIM_PACE_MS`, `BOGUS_STREAK_LIMIT`, `CLAIM_LOCK_MS`,
`BALL_ROLL_MS`, `MARK_FLUSH_MS` and `MARK_BATCH_MAX` from `@myarena/shared` instead of redefining them. Bingo never calls `ctx.notice` (no system chat line).

---

## Phase 1: Setup (Shared Contracts)

**Purpose**: The letters, card rules, pattern catalogue, claim evaluator, constants and wire types that the server and client must agree on

- [X] T001 [P] Create `shared/src/bingo/letters.ts` exporting `BINGO_BALLS` 75, `BINGO_LETTERS` (`'B'`, `'I'`, `'N'`, `'G'`, `'O'`), `BINGO_COLUMN_RANGES` (B 1 to 15, I 16 to 30, N 31 to 45, G 46 to 60, O 61 to 75), `columnOfNumber(n)` (0 to 4) and `ballLetter(n)` (so 54 is `'G'`)
- [X] T002 [P] Create `shared/src/bingo/card.ts` exporting `BingoCard` (25 numbers in row-major order, index `row * 5 + col`; the centre cell, index 12, is `0` meaning FREE), `BINGO_FREE_INDEX` 12, `cellIndex(row, col)`, `rowOf(index)`, `colOf(index)`, `cardKey(card)` (the 24 numbers joined as text) and `validateBingoCard(card): string | null` enforcing exactly: "column B holds five different numbers from 1-15, I from 16-30, N four different numbers from 31-45, G from 46-60 and O from 61-75"; "the centre cell (index 12, third row of N) is `0`, meaning FREE; every other cell is a number"; "no number appears twice on the card"
- [X] T003 [P] Create `shared/src/bingo/patterns.ts` with `BingoPatternDef` (`id`, `name`, `group` of `standard` | `custom`, `description` one line, `illustration` cell indexes for the picture, `variants`: a list of alternative cell-index lists) and the nine-pattern `BINGO_PATTERNS` catalogue in this order with these exact variants (index = `row * 5 + col`, N3 = 12): `single-line` "Single Line" (12 variants: rows `[0..4]`, `[5..9]`, `[10..14]`, `[15..19]`, `[20..24]`; columns `[0,5,10,15,20]`, `[1,6,11,16,21]`, `[2,7,12,17,22]`, `[3,8,13,18,23]`, `[4,9,14,19,24]`; diagonals `[0,6,12,18,24]`, `[4,8,12,16,20]`), `four-corners` "Four Corners" (`[0,4,20,24]`), `letter-x` "Letter X" (`[0,4,6,8,12,16,18,20,24]`), `letter-l` "Letter L" (`[0,5,10,15,20,21,22,23,24]`), `blackout` "Blackout" (all 25 cells, description mentions Full House), `postage-stamp` "Postage Stamp" (4 variants `[0,1,5,6]`, `[3,4,8,9]`, `[15,16,20,21]`, `[18,19,23,24]`), `diamond` "Diamond" (`[2,6,8,10,14,16,18,22]`), `kite` "Kite" (`[3,4,8,9,12,16,20]`), `inner-square` "Inner Square" (`[6,7,8,11,12,13,16,17,18]`); `illustration` is the first variant, with a caption "any line" for Single Line and "any corner" for Postage Stamp. Also export `BINGO_PATTERN_GROUPS` (Standard: single-line, four-corners, letter-x, letter-l, blackout; Custom/Thematic: postage-stamp, diamond, kite, inner-square) and `getBingoPattern(id)`
- [X] T004 [P] Create `shared/src/bingo/timing.ts` exporting `BINGO_CARD_CEILING_MAX` 3, `BINGO_DEFAULT_CARD_CEILING` 1 and `BINGO_DEFAULT_PATTERN_IDS` (`single-line`, `four-corners`, `blackout`); do not redefine any timing constant that already exists in `shared/src/housie/timing.ts`
- [X] T005 [P] Create `shared/src/bingo/types.ts` with `BingoLobby` (`ceiling`, `hostPlays`, `patterns`, `caller { mode, intervalMs? }`, `choices` map of playerId to 1..ceiling), `BingoPatternState` (`id`, `status: 'open' | 'claimed'`, `claimedBy?: PlayerRef`, `claimedAtCall?`), `BingoResultEntry` (`pattern`, `winner?: PlayerRef`), `BingoView`, `BingoEvent` (public events with `seq`: `ball`, `caller`, `claimed` carrying `patterns: string[]`, `finished`, `playerLeft`; private events with `priv: true`: `snapshot`, `bogus`, `tooLate`, `claimsPaused`) and `BingoAction` (`setCeiling`, `setHostPlays`, `setPatterns`, `setCaller`, `setCards`, `draw`, `auto`, `manual`, `pause`, `resume`, `daubs` with `changes: { card, cell, on }[]`, `bingo` with `card`), with fields exactly as in [contracts/bingo-protocol.md](contracts/bingo-protocol.md), including `you: { playing, cards, daubs, freeTapped, claimsLockedMs? }`
- [X] T006 Create `shared/src/bingo/evaluate.ts` with the pure `evaluateBingoPattern(pattern, card, daubs, called): boolean` and `completedBingoPatterns(patterns, card, daubs, called): string[]` per research R3 and data-model "Claim": a cell is satisfied only if its bit (`1 << index`) is set in `daubs` AND (it is `BINGO_FREE_INDEX` or its number is in the `called` set); a pattern is completed when at least one variant has every cell satisfied; crosses on other cells do not matter (depends on T002, T003)
- [X] T007 Update `shared/src/index.ts` to export `./bingo/letters.js`, `./bingo/card.js`, `./bingo/patterns.js`, `./bingo/timing.js`, `./bingo/types.js` and `./bingo/evaluate.js`, then build `shared` and fix any export-name collision with the Housie modules by prefixing the Bingo name (depends on T001 to T006)

---

## Phase 2: Foundational (Configuration, Registration and Engine Skeleton)

**Purpose**: The small shared changes every story builds on: a per-game player ceiling, the new action intents, a registered Bingo engine skeleton, and the moved layout hook

**CRITICAL**: No user story work can begin until this phase is complete. Ludo and Housie must be unaffected.

- [X] T008 [P] Update `server/src/config.ts`: add `bingoMaxPlayers` (env `BINGO_MAX_PLAYERS`, default 200, clamped 2 to 500, optional) and a `rosterMaxPlayers` lookup `{ housie: housieMaxPlayers, bingo: bingoMaxPlayers }`; leave `housieMaxPlayers` and `HOUSIE_MAX_PLAYERS` unchanged
- [X] T009 Update `server/src/rooms/roomStore.ts` so roster games take their player ceiling from `config.rosterMaxPlayers[game.id] ?? game.maxPlayers` instead of `config.housieMaxPlayers`, and fix the comment; Housie's ceiling and variable behave exactly as before (depends on T008)
- [X] T010 [P] Update `server/src/sockets/schemas.ts`: add strict members to `gameActionSchema` for `setCards` (`count` integer 1 to 3), `daubs` (`changes` array of 1 to 30 items `{ card: integer 0..2, cell: integer 0..24, on: boolean }`) and `bingo` (`card` integer 0..2); keep every existing member as it is (the reused host intents `setCeiling` 1..4, `setHostPlays`, `setPatterns` up to 40 ids, `setCaller`, `draw`, `auto`, `manual`, `pause`, `resume` already exist) and update the doc comment. No field may carry a ball, card contents, a pattern result or a winner
- [X] T011 Create `server/src/games/bingo/engine.ts` as a skeleton `GameEngine` (id `bingo`): `createLobby` returns the default lobby, `lobbyView` returns it, `onLobbyAction` returns `{ ok: false, reason: 'Not available yet' }`, `createMatch` returns an empty match, `getView` returns null, `onAction` not available, `onSeatReleased` and `onBotTurn` no-ops, `dispose` no-op; register it for `bingo` in `server/src/games/registry.ts` (depends on T005, T007)
- [X] T012 [P] Update `client/src/state/viewport.ts` to add `useRegionSize` moved verbatim from `client/src/games/housie/useFit.ts` (same signature and behavior), and change `client/src/games/housie/useFit.ts` to import it from `../../state/viewport` and re-export it so every existing Housie import keeps working
- [X] T013 [P] Update `server/scripts/smoke.ts`: in the "invalid requests" scenario change the unavailable-game assertion from `gameId: 'bingo'` to `gameId: 'snakes-and-ladders'` (still expects `GAME_UNAVAILABLE`); add no new assertions
- [X] T014 Run `npm run build` from the repository root (workspaces `shared/src`, `server/src`, `client/src`) and fix every type error introduced by T001 to T013 (depends on T007, T009 to T013)
- [X] T015 Foundational checkpoint: run `npm run smoke` (`server/scripts/smoke.ts`; must pass unchanged apart from T013), then play one Ludo match and open a Housie lobby and draw a few balls with two windows; confirm colors, chat system lines, ceilings and behavior are exactly as before; fix any regression before continuing

**Checkpoint**: Configuration and registration are in place, Ludo and Housie are unchanged, and a Bingo engine skeleton is registered; user stories can begin

---

## Phase 3: User Story 1 - Host Sets Up the Room (Priority: P1) MVP slice 1

**Goal**: One calm setup screen where the host sets the player limit (2 to 200), the card ceiling (1 to 3), whether the host plays, the calling mode and the patterns, with defaults preselected, and starts the match.

**Independent Test**: Quickstart V1: create a Bingo room, change every setting, join a second window, confirm the lobby shows the settings and the Start rules.

- [X] T016 [US1] Create `server/src/games/bingo/lobby.ts`: the lobby model per data-model "Lobby" (`ceiling` "1 to 3, default 1", `hostPlays` default `true`, `patterns` default `single-line`, `four-corners`, `blackout` in catalogue order, `caller` default `{ mode: 'manual' }`, `choices` map playerId to "1..ceiling (default 1)", the host's entry existing only when `hostPlays`), `applyLobbyAction(lobby, who, action)` for `setCeiling` (host only; accepts 1 to 3 and refuses 4 with "Choose 1 to 3 cards."; clamps every choice to the new ceiling), `setHostPlays` (host only; adds or removes the host's choice), `setPatterns` (host only; only the nine catalogue ids, no duplicates, an empty list allowed, kept in catalogue order), `setCaller` (host only; `manual` or `auto` at 5000, 8000 or 10000) and `setCards` (anyone seated, the host only when `hostPlays`, refused above the ceiling with "Choose 1 to N cards."), anything else returns "The match has not started."; `onLobbyLeave(lobby, playerId)` dropping the choice; `validateLobbyStart(lobby, seated)` returning "Pick at least one pattern." when no pattern is chosen and "Wait for at least one more person." when fewer than two people are seated; and `lobbyView(lobby)` as plain JSON with nothing private
- [X] T017 [US1] Update `server/src/games/bingo/engine.ts` to wire the lobby (depends on T011, T016): `createLobby`, `lobbyView`, `onLobbyAction`, `onLobbyLeave` and `validateStart` delegating to `lobby.ts`
- [X] T018 [US1] Update `shared/src/games.ts`: set the `bingo` entry to `status: 'active'`, `minPlayers: 2`, `maxPlayers: 200`, `defaultCapacity: 10`, `supportsAi: false`, `roster: true`, `quietChat: true`, keeping its name, tagline and theme; confirm the Hub card for Bingo now launches like Housie (the card follows `status`, the launch modal follows `supportsAi`)
- [X] T019 [P] [US1] Create `client/src/games/bingo/PatternPicture.tsx`: inline SVG mini 5 by 5 grid drawn from a pattern's `illustration` (empty cells dark, the center cell marked, highlighted cells in the neon gold), a `size` prop (`sm` for the chooser, `md` for tiles) and an accessible name from the pattern name and description; show the "any line" or "any corner" caption where the catalogue gives one
- [X] T020 [P] [US1] Create `client/src/games/bingo/bingo.css` with the royal arcade base scoped under `.bz`: CSS variables for the palette (deep midnight and royal-blue gradient, gold accents, text on dark at least 4.5:1), one vivid color token per letter column (B, I, N, G, O) used by headers, ball and board, tactile button states (hover, pressed, visible keyboard focus), panel, chip and segmented-control styles, the setup column and chooser styles, and a `prefers-reduced-motion` block; import it from the lobby and match screens
- [X] T021 [US1] Create `client/src/games/bingo/BingoLobby.tsx` per [contracts/match-screen-layout.md](contracts/match-screen-layout.md) "Lobby screen" (depends on T018, T019, T020): setup column (Players number field with presets 10, 25, 50, 100, 200 using the room's `maxPlayers`, Max cards each 1 to 3 segmented, I also play toggle, Calling Manual/5s/8s/10s segmented, a pattern chooser of nine `PatternPicture` tiles in two groups with group header toggles, an "n of 9" counter and Reset to defaults), a read-only summary for non-hosts, My cards 1..ceiling segmented control (hidden for the host when `hostPlays` is off), the people column (platform `InviteBar`, `PlayerList` with a card-count badge, Start disabled with its reason) and the platform `ChatPanel`; send settings through `sendGameAction`, show the one-line notice when the player's own count was reduced
- [X] T022 [US1] Create `client/src/games/bingo/bingoStore.ts` (feed skeleton: `reset`, `onSnapshot`, `onEvent`, a `useSyncExternalStore` hook, lobby selectors reading `room.gameLobby`) and update `client/src/games/registry.ts` to import it, call `registerLobbyScreen('bingo', BingoLobby)` and register the `bingo` feed via `registerGameFeed('bingo', ...)` (depends on T021)
- [X] T023 [US1] Verification (quickstart V1): run the setup scenarios (Hub card playable, defaults, every setting, Start refusals, limit below seated refused, ceiling clamp notice, 200 preset, `BINGO_MAX_PLAYERS=50` with `HOUSIE_MAX_PLAYERS` unaffected) and time SC-001 (under 10 s with defaults, under 60 s changing everything); record scenario, expected, observed and screenshots in `specs/005-bingo-75-ball-module/verification.md`

**Checkpoint**: A host can configure and start a Bingo room; the match screen is still empty (next story)

---

## Phase 4: User Story 2 - Players Choose Cards and See Them Clearly (Priority: P1)

**Goal**: Each person picks 1 up to the ceiling; on start the server issues valid unique cards that appear large and legible on the left under bold B-I-N-G-O headers, stacked, side by side or in tabs.

**Independent Test**: Quickstart V2 steps 1, 2 and 6: change the card count, start, inspect cards against every rule, compare cards across players.

- [X] T024 [P] [US2] Create `server/src/games/bingo/cards.ts` implementing research R2: for each column pick distinct numbers from its range with `crypto.randomInt` and a partial Fisher-Yates shuffle (5 numbers for B, I, G and O, 4 for N), place them in random order down the column with the centre cell (index 12) as `0` (FREE), keep a per-match `Set` of `cardKey` so no two cards in the room are identical (regenerate on a collision) and a player's own cards differ, run `validateBingoCard` on every card (log and regenerate on failure), and add the development-only audit `BINGO_DEV_CARD_AUDIT=N` logging "N of N valid and unique" at start-up, ignored when `NODE_ENV=production`
- [X] T025 [P] [US2] Create `server/src/games/bingo/model.ts` with the server types per data-model: `PlayerEntry` (`playerId`, `name`, `color`, `cards`, `daubs` one 25-bit mask per card, `freeTapped` one boolean per card, `lastClaimAt`, `bogusStreak`, `lockedUntil`, `status` `playing` | `left`), `PatternState` (`id`, `claimedBy?`, `claimedAtCall?`) and `Match` (`ctx`, `settings { patterns, ceiling }`, `deck`, `called`, `caller { mode, intervalMs, paused }`, `nextDrawAt`, `cancelAuto`, `players`, `patterns`, `phase`, `seq`, `results?`, `lobby`)
- [X] T026 [US2] Create `server/src/games/bingo/matchOps.ts` with `publish(match, event)` (increments `seq`, emits to the room), `playingCount(match)`, `nextInMs(match)`, `callerView(match)`, `patternViews(match)` and `viewFor(match, playerId, hostId)` returning the receiver's own `BingoView` (cards, daubs and `freeTapped` only for a playing receiver, empty for a non-playing host, `claimsLockedMs` while locked, never the deck or others' data) (depends on T005, T025)
- [X] T027 [US2] Update `server/src/games/bingo/engine.ts` `createMatch` and `getView` (depends on T017, T024, T026): freeze `settings` from the lobby, build `patterns` from `settings.patterns` (all open), start with an empty `deck` (T042 fills it) and the `caller` chosen in the lobby, build a `PlayerEntry` for every seated card holder (the host only when `hostPlays`; a leftover choice for a non-playing host is ignored), issue each their chosen number of unique cards (`min(max(choice, 1), ceiling)`) with empty daub masks and `freeTapped` all false, send each person a private `snapshot` event through `ctx.emitTo` with their own view (a non-playing host gets an empty `you`), and make `getView` return that person's view so create, join and resume acknowledgements restore state
- [X] T028 [P] [US2] Create `client/src/games/bingo/CardGrid.tsx`: a read-only card with bold, vibrant B-I-N-G-O header cells in the letter colors and a 5 by 5 grid of number cells (buttons with the number as text; the center cell reads "FREE"), `aria-label` per cell ("B 7", "FREE"), number text sized from the cell and never below 14 px
- [X] T029 [P] [US2] Create `client/src/games/bingo/useFit.ts` with the pure `planCards(width, height, count)` per [contracts/match-screen-layout.md](contracts/match-screen-layout.md) "Card fit" (a card is 5 columns by 6 rows including the header; try `stack`, `row` for two cards on wide regions and `tabs`; choose the largest cell that is at least 40 px, tabs as the fallback, no strip for a single card) returning `{ mode: 'stack' | 'row' | 'tabs', cellW, cellH }` (cells rectangular when height-limited, width at least 40 px, height at least about 28 px); import `useRegionSize` from `../../state/viewport`
- [X] T030 [US2] Create `client/src/games/bingo/CardArea.tsx` (depends on T028, T029): lays out the player's cards per `planCards`, selection (the selected card gets a gold outline and gold tab, labeled "Card n of N"), keyboard-reachable tabs, and the selected index persisted in `localStorage` key `myarena.bingo.card`
- [X] T031 [US2] Update `client/src/games/bingo/bingoStore.ts` (depends on T022): apply the private `snapshot` and the join-ack `game` view (cards, daubs, `freeTapped`, `seq`), expose selectors for cards, selected card and `playing`, keep a snapshot that arrives before `room:state` flips to `in_progress`, and reset on leave
- [X] T032 [US2] Create `client/src/games/bingo/BingoScreen.tsx` (depends on T030, T031): the match screen shell with the compact header (BINGO, room code, "n / limit" count, Quit with confirmation, the room Lobby dialog `LobbyDialog` imported from `client/src/games/ludo/MatchDialogs.tsx` as Housie does (the one accepted cross-game import), sound toggle) and the left top region showing the `CardArea` (or a short "You are the caller" panel for a non-playing host), `100dvh` with safe-area padding and no page scroll; register it for `getMatchScreen` in `client/src/games/registry.ts`
- [X] T033 [US2] Verification (quickstart V2 steps 1, 2 and 6): card counts 1 to 3 visible to the host within 1 s, SC-002 audit (`BINGO_DEV_CARD_AUDIT=500` logs 500 of 500; inspect 40 cards in the DOM for every rule and uniqueness), stack, row and tabs at 1280 x 720 and 390 x 844 with every cell measured at least 40 px; record in `verification.md`

**Checkpoint**: A started match shows each person's valid cards

---

## Phase 5: User Story 3 - Daub Numbers by Hand, Including the FREE Space (Priority: P1)

**Goal**: Cells (including FREE) are never auto-marked; tapping toggles a translucent neon dauber with a stamp; the FREE tooltip pulses until FREE is first tapped; daubs and the tooltip state survive reloads and are held by the server.

**Independent Test**: Quickstart V2 steps 3 to 5: a called number stays unmarked until tapped; tap and untap; FREE tooltip behavior; reload keeps daubs; keyboard works.

- [X] T034 [US3] Update `server/src/games/bingo/engine.ts` (depends on T027): handle `daubs` (only a playing person; each change `{ card, cell, on }` is applied only when `card` is one of their cards and `cell` is 0 to 24 (the FREE cell, 12, is accepted); changes naming a card they do not own are dropped; never infer or add daubs); set `freeTapped[card] = true` the first time cell 12 of that card receives any toggle and never clear it; `getView` already carries the masks and flags so a reload restores them
- [X] T035 [P] [US3] Create `client/src/games/bingo/anim/stamp.ts`: the dauber stamp via the Web Animations API (140 ms, scale 1.7 to 1 with a small rotation and a brief ring); under reduced motion the dauber appears instantly; removing it fades out in 80 ms
- [X] T036 [US3] Update `client/src/games/bingo/CardGrid.tsx` (depends on T028, T035): make every cell including FREE toggle on click, tap, Enter and Space with `aria-pressed`, render the translucent neon dauber in the cell's letter color (about 55 percent opacity, `mix-blend-mode: screen`, number still readable), never auto-mark called numbers or FREE, allow daubing a number that is not called with no message, play `sfx.stamp`, and add arrow-key movement between cells (Tab enters the card)
- [X] T037 [US3] Add the FREE tooltip in `client/src/games/bingo/CardGrid.tsx` and `client/src/games/bingo/bingo.css` (depends on T036): while `freeTapped[card]` is false, a glowing pulsing callout "Tap to claim your FREE space!" is centered over the FREE cell and may extend over neighboring cells; it uses `pointer-events: none` so every cell, including FREE, stays tappable through it; static (no pulse) under reduced motion; it disappears on the first tap of FREE and does not return for that card even if the dauber is lifted
- [X] T038 [US3] Update `client/src/games/bingo/bingoStore.ts` (depends on T031): optimistic daub toggles; coalesce toggles for `MARK_FLUSH_MS` into one `daubs` action of at most `MARK_BATCH_MAX` changes; expose `flushDaubs()` which `bingo` claims call first; set the local `freeTapped` flag on the first FREE toggle; on a failed send keep local state and retry with the next flush; adopt the server's daubs and `freeTapped` from snapshots
- [X] T039 [US3] Verification (quickstart V2 steps 3 to 5): a called ball leaves its cell unmarked, tap and untap, an uncalled number can be daubed with no message, the tooltip pulses on a new card and never blocks a tap, FREE tap removes it for good (also after lifting the dauber and reloading), reload restores daubs, keyboard operation, SC-004 over 20 draws; record in `verification.md`

**Checkpoint**: Daubing works and the server holds each player's daubs and tooltip state

---

## Phase 6: User Story 4 - The Host Calls Balls and Everyone Sees Them Beautifully (Priority: P1)

**Goal**: A server-authoritative caller (manual, or auto every 5, 8 or 10 s, pausable), a glossy 3D letter-number ball for everyone, the history grid of previous balls, and the host's master board of five B-I-N-G-O columns.

**Independent Test**: Quickstart V3: draw manually and in each auto mode; balls appear within 1 s on every screen with the right letter, the history grid and master board match, no repeats, calling ends at 75.

- [X] T040 [P] [US4] Create `server/src/games/bingo/deck.ts`: Fisher-Yates shuffle of 1 to 75 using `crypto.randomInt`, kept server-side only, plus the development-only controls ignored in production: `BINGO_DEV_BALLS` (fixed start of the call order, numbers 1 to 75 only, no duplicates) and `BINGO_DEV_DECK=first-card` (the first seated card holder's first card numbers row by row skipping FREE, then the rest shuffled)
- [X] T041 [US4] Extend `server/src/games/bingo/matchOps.ts` (depends on T026, T040): `cancelAuto`, `scheduleAuto` (a `ctx.schedule` chain at the chosen interval that keeps running if the host disconnects), `drawBall` (draws the next deck entry, refuses after the 75th, restarts the auto timer, publishes the public `ball` event with `n`, `index` and `nextInMs`, and calls `finishMatch` after the 75th), and a `finishMatch` that stops auto calling, sets `phase: 'finished'` and publishes `finished` with `results` (each pattern and its winner or none) and `calledCount`
- [X] T042 [US4] Update `server/src/games/bingo/engine.ts` (depends on T034, T041): build the deck at match start (replacing T027's empty deck) and start auto calling when the lobby chose it; handle `draw` (host only via `ctx.hostId()`, refused after the 75th with "All balls have been called."), `auto` (host only, 5000, 8000 or 10000), `manual`, `pause`, `resume` (each publishing a `caller` event); keep `called` in the view; never expose the deck; `dispose` cancels the timer; any intent not handled during the match (including the lobby settings) returns "Not available during the match." and changes nothing
- [X] T043 [P] [US4] Create `client/src/games/bingo/Ball.tsx`: CSS glossy 3D sphere (layered radial gradients, specular highlight, blurred ground shadow, soft glow) showing the letter above a bold number ("G-54"), tinted by the letter's color token, sized by prop, with the accessible name "Ball G 54"
- [X] T044 [P] [US4] Create `client/src/games/bingo/anim/ballRoll.ts`: Web Animations API roll-in (from the right with rotation and settle, `BALL_ROLL_MS`) then a glow pulse; a newer ball interrupts an older reveal; reduced motion uses a 150 ms fade
- [X] T045 [P] [US4] Create `client/src/games/bingo/MasterBoard.tsx`: all 75 numbers as five B-I-N-G-O columns of 15 numbers each, called numbers lit in their letter color, the current ball gold; when the measured row height would drop below 18 px and the width allows, draw the same board rotated (five rows of 15 columns) so numbers stay at least 11 px; also used as the on-demand "View all" overlay for players
- [X] T046 [US4] Create `client/src/games/bingo/BallConsole.tsx` (depends on T043, T044, T045): the ball, "Called n of 75", and the history grid of previously called balls newest first as small letter-number chips (as many as fit) plus a "View all" chip opening the `MasterBoard` overlay; plays `ballRoll` and `sfx.ballRoll` on each new ball
- [X] T047 [US4] Create `client/src/games/bingo/CallerConsole.tsx` (depends on T043, T045): host-only DRAW NEXT BALL, Auto segmented Off/5s/8s/10s, Pause/Resume, recent ball chips, a thin countdown ring to the next automatic draw from `nextInMs`, and disabled states with the reason after the 75th ball
- [X] T048 [US4] Update `client/src/games/bingo/bingoStore.ts` (depends on T038): apply public `ball` and `caller` events in `seq` order (ignore `seq <= view.seq`, apply only `seq === view.seq + 1`, call `resyncRoom()` on a gap), update the called list, current ball and caller state immediately, and queue only the large-ball reveal animation
- [X] T049 [US4] Update `client/src/games/bingo/BingoScreen.tsx` (depends on T032, T046, T047, T048): add the right column's top region (ball console for players; caller console for the host) at about one third of the right column's height
- [X] T050 [US4] Verification (quickstart V3): manual draws with the right letter for one ball from each range, auto at 5, 8 and 10 s with ten measured intervals each (within 0.5 s, SC-006), pause, resume, interval change, host tab closed (draws continue), 75 draws with no repeats and a refused 76th (scripted host client), history grid and master board newest first under the right letters with the correct "Called n of 75" (SC-007), View all, reduced motion; record in `verification.md`

**Checkpoint**: A match can be called end to end

---

## Phase 7: User Story 5 - Claim BINGO! and See It Everywhere (Priority: P1)

**Goal**: A pattern dashboard shows only the host-chosen patterns with Available or Claimed badges and a glowing BINGO! button; the server evaluates the selected card against every pattern in play; valid claims show Claimed everywhere, bogus claims show only to the claimant.

**Independent Test**: Quickstart V4: valid claim, each bogus variant, too late, multi-pattern award, a race, pace and lock, multiple cards.

- [X] T051 [US5] Create `server/src/games/bingo/claims.ts`: `handleClaim(match, playerId, action)` in the data-model "Claim" order: (1) match running, playing sender, `card` owned (otherwise an error ack "You do not have that card.", never counted as bogus); (2) lock (`now >= lockedUntil`, else private `claimsPaused { untilMs }` and error "Claims paused."); (3) pace `CLAIM_PACE_MS` (error "Wait a moment.", nothing evaluated, no penalty; passing sets `lastClaimAt`); (4) `completedBingoPatterns` over every pattern in play with the sender's daubs for that card and the called set as of now; (5) accepted when at least one open pattern is completed: award every such pattern (`claimedBy`, `claimedAtCall = called.length`), reset `bogusStreak` to 0, publish one public `claimed` event with all awarded ids and `calledCount`, and call `finishMatch` when no pattern is open; (6) otherwise, if only already-claimed patterns are completed, a private `tooLate` with no penalty and `bogusStreak` unchanged; (7) otherwise a private `bogus`, `bogusStreak++`, and at `BOGUS_STREAK_LIMIT` set `lockedUntil = now + CLAIM_LOCK_MS`, reset the streak and send `claimsPaused { untilMs: CLAIM_LOCK_MS }`; honor the development-only `BINGO_CLAIM_PACE_MS` override, ignored when `NODE_ENV=production`; never call `ctx.notice`
- [X] T052 [US5] Update `server/src/games/bingo/engine.ts` (depends on T042, T051): handle the `bingo` action through `handleClaim` (a claim is decided in server arrival order, so the first of two racing claims wins and the other gets `tooLate`), and add `claimsLockedMs` to the view while a lock is in force
- [X] T053 [P] [US5] Create `client/src/games/bingo/anim/celebrate.ts`: gold burst and sparks on every awarded tile and the BINGO! area for about 1.2 s with `sfx.winChime`; reduced motion shows a 1 s gold outline
- [X] T054 [US5] Create `client/src/games/bingo/PatternDashboard.tsx` (depends on T019, T053): tiles for the chosen patterns only, each with `PatternPicture`, the name and a badge "Available" or "Claimed" with the winner's name in the winner's color; the prominent glowing BINGO! button (label "BINGO! - Card n" when the player holds more than one card; disabled with "Claims paused m:ss" while claims are paused; absent for a non-playing host); local "Bogus Bingo" alert for about 2 s and a brief "Too late - already claimed" notice; the click calls `flushDaubs()` and then sends `bingo` for the selected card
- [X] T055 [US5] Update `client/src/games/bingo/bingoStore.ts` (depends on T048): apply `claimed` for everyone (mark each listed pattern claimed, run the celebration), private `bogus`, `tooLate` and `claimsPaused` (store the lock end time), and expose `claimBingo()` which flushes daubs first and sends `{ type: 'bingo', card: selected }`
- [X] T056 [US5] Update `client/src/games/bingo/BingoScreen.tsx` (depends on T049, T054, T055): add the left-bottom pattern dashboard under the cards
- [X] T057 [US5] Verification (quickstart V4): a valid claim with the dev deck (Single Line only; Four Corners and Blackout stay Available), bogus variants (not called, called but not daubed, daubed but not called, a centre-including pattern without FREE tapped), too late with no penalty, a multi-pattern claim awarding Four Corners and Blackout together, a scripted race (exactly one `claimed` includes each pattern), pace and the 1-minute lock after 3 bogus claims in a row (reset by a valid claim), multiple cards (only the selected card is checked), no claim deadline, a claim sent just before a ball is drawn does not count that ball, privacy (no other client sees a bogus or too-late result), SC-008 and SC-009; record in `verification.md`

**Checkpoint**: The core game loop is complete (MVP: US1 to US5)

---

## Phase 8: User Story 6 - Pure Player Chat (Priority: P2)

**Goal**: Chat below the ball console with only typed player messages during the match and no system line of any kind; a collapsible drawer with an unread count on narrow screens.

**Independent Test**: Quickstart V6.

- [X] T058 [US6] Create `client/src/games/bingo/BingoChat.tsx`: wraps the platform `ChatPanel`; in landscape it is a fixed panel with no minimize control; on narrow screens it is a drawer (a slim bar with a chat icon, "Chat" and an unread pill while closed, opening upward, Escape closes) using the room store's `unread` and `setDrawerOpen`; the panel stays mounted (hidden with CSS) while the drawer is closed so half-typed text is kept; the drawer opens closed on every visit and stores nothing
- [X] T059 [US6] Update `client/src/games/bingo/BingoScreen.tsx` (depends on T049, T058): place the chat in the right column's lower two thirds (landscape) and as the drawer (narrow); add a visually hidden live region announcing each new ball ("Ball G 54") and each accepted claim; confirm by search that no file under `server/src/games/bingo/` calls `ctx.notice` and that the platform writes no automatic line while the match is in progress (`quietChat`)
- [X] T060 [US6] Verification (quickstart V6): only typed messages during the match (balls, bogus and valid claims, joins, leaves and host actions never appear), the lobby still shows the usual join and leave lines and they stop at match start, the narrow drawer's unread count within 1 s and cleared on open, draft text survives closing the drawer, `<b>hi</b>` and a 600-character message appear as plain text within the length limit, rapid sends hit the platform rate limit; record SC-010 in `verification.md`

---

## Phase 9: User Story 7 - A Calm, Beautiful, Uncluttered Screen on Every Device (Priority: P2)

**Goal**: A measured, space-filling layout with no page scroll from 320 to 2560 px, a compact pattern dashboard, royal arcade styling, restrained effects and reduced-motion paths.

**Independent Test**: Quickstart V7.

- [X] T061 [US7] Update `client/src/games/bingo/useFit.ts` (depends on T029): add `planPatterns(width, height, count)` (columns from the measured width, tiles at least 118 px wide on wide screens and 92 px on narrow ones; rows balanced so 5 tiles on a wide area become 3 + 2; tile height at most 78 px and at least the 40 px tap size; only the tile grid scrolls if it cannot fit) and `planBall(width, height)` (ball diameter from the region height leaving room for the count and one row of history chips)
- [X] T062 [US7] Update `client/src/games/bingo/PatternDashboard.tsx` and `client/src/games/bingo/BallConsole.tsx` to use `planPatterns` and `planBall`; place the BINGO! button at the end of the dashboard header on wide screens and as a full-width bar on narrow ones (depends on T061)
- [X] T063 [US7] Update `client/src/games/bingo/bingo.css` and `client/src/games/bingo/BingoScreen.tsx` for the full responsive layout per [contracts/match-screen-layout.md](contracts/match-screen-layout.md): landscape (`min-width: 720px` and aspect ratio at least 5:4) two columns (left about 58 percent: cards over the dashboard; right: ball console one third over chat two thirds) using grid `fr` units with `min-height: 0` and `min-width: 0`; narrow one column (compact ball row, cards, dashboard, chat drawer); short landscape phones (`max-height: 520px`, aspect ratio at least 5:4) two columns with the chat drawer; `100dvh`, safe-area insets, re-fit within 0.5 s on resize or rotation without changing state (depends on T062)
- [X] T064 [US7] Update `client/src/games/bingo/bingo.css` (depends on T063) for the quiet-moment rule (only the ambient background, the ball glow, the BINGO! glow and the unrevealed FREE tooltip animate), the full reduced-motion block (ball fade, instant dauber, outline celebration, static tooltip), contrast (4.5:1 for normal text, 3:1 for large numbers) and visible hover, pressed and focus states on every control
- [X] T065 [US7] Polish proportions, spacing, tile, card and ball sizes in `client/src/games/bingo/bingo.css` and `client/src/games/bingo/BingoScreen.tsx` on the player and host screens so the playing area uses at least 90 percent of the viewport apart from the header and gaps, text is never below 11 px and no area is left empty or filled with decoration (FR-036, SC-011); no mockups were supplied, so review against the spec and [contracts/match-screen-layout.md](contracts/match-screen-layout.md)
- [X] T066 [US7] Verification (quickstart V7): measure at 320 x 568, 390 x 844, 844 x 390, 768 x 1024, 1024 x 768, 1366 x 768, 1920 x 1080 and 2560 x 1440 for the player and host with 1 and 3 cards (page never scrolls, cells at least 40 px, playing area at least 90 percent), reduced motion, contrast, hover, pressed and focus states, that nothing animates in a quiet moment, keyboard and screen-reader names; save screenshots and measurements in `verification.md`

---

## Phase 10: User Story 8 - The Host's Dashboard During the Match (Priority: P2)

**Goal**: The host screen (master board over the pattern dashboard, caller console over chat, and a Board | My Cards switch when the host plays), match end conditions, results screen and New round.

**Independent Test**: Quickstart V4 step 9, V5 and V8.

- [X] T067 [US8] Update `server/src/games/bingo/engine.ts` and `server/src/games/bingo/matchOps.ts` (depends on T052): finish the match when every chosen pattern is claimed, the 75th ball has been called, or no card holder remains; on finish stop auto calling and cancel timers, publish the public `finished` event with `results` in catalogue order and `calledCount`, set `phase: 'finished'`, and refuse further draws and claims with "The match is over."
- [X] T068 [US8] Update `server/src/games/bingo/engine.ts` (depends on T067): implement `onSeatReleased` (the entry becomes `left`, its cards stop playing, daubs are discarded, patterns already won stay claimed, publish `playerLeft`, finish if no card holder remains); keep caller permissions on `ctx.hostId()` at action time so host handover gives the new host the controls and auto calling continues; make `dispose` and a new round (the platform's `resetToLobby`) clear all match state
- [X] T069 [US8] Update `client/src/games/bingo/BingoScreen.tsx` (depends on T056, T059): the host variant: left top the master board, left bottom the pattern dashboard (BINGO! only when the host plays), right top the caller console, right bottom the chat; for a playing host a segmented `Board | My Cards` control that swaps the master board for the card area (BINGO! then uses the selected host card) while the caller console stays visible in both states; after a host handover the new host's screen shows the caller controls and a non-playing host never sees cards or BINGO!
- [X] T070 [P] [US8] Create `client/src/games/bingo/ResultsOverlay.tsx`: the results list (each pattern with its winner's name and color, or "No winner"), "Called n of 75", Leave for everyone and New round for the host only (calls `resetRoom()` from `client/src/state/roomStore.ts` and shows its error as a toast); celebratory but quiet styling, reduced motion respected
- [X] T071 [US8] Update `client/src/games/bingo/bingoStore.ts` (depends on T055): handle `finished` and `playerLeft`, clear match state when the room returns to the lobby (via `room:state` and `feed.reset()`), and keep the host's caller state consistent across reconnects; mount `ResultsOverlay` from `BingoScreen.tsx` when `view.phase === 'finished'`
- [X] T072 [US8] Verification (quickstart V4 step 9, V5, V8): a playing host claims from My Cards, a non-playing host sees status only, host handover (caller controls move, the old host's cards stop playing, auto calling continues), every pattern claimed ends the match, 75 balls with an unclaimed pattern shows "No winner", all card holders leaving ends the match at once, New round resets ceiling 1, default patterns, manual calling, host plays on and every card count 1 with the player limit kept, reload restores cards, daubs, tooltip state, history and tile states, a claim lock still counts down after a reload, a seat released after the 60 s window cannot return, server restart shows the existing reconnect then "room ended" flow; record in `verification.md`

---

## Phase 11: Polish & Cross-Cutting Concerns

**Purpose**: Large-room checks, regression, documentation and sign-off

- [X] T073 [P] Verification (quickstart V9): with a scripted guest tool (Node Socket.IO clients in a temp folder, not committed) join 50 then 200 guests with 3 cards each, record `room:state` sizes and burst rates (about 4 per second), start the match and run 20 draws at 5 s, measure ball delivery on three real clients (within 1 s in 95 percent of draws, SC-015) and server memory (well under 512 MB), confirm a 201st join is refused and `BINGO_MAX_PLAYERS=50` caps Bingo rooms while Housie rooms stay governed by `HOUSIE_MAX_PLAYERS`; record in `verification.md`
- [X] T074 [P] Verification (quickstart V10 regression): re-run `npm run smoke`, play one Ludo match and a Housie lobby with a few draws and a claim, confirm the Housie `useFit.ts` re-export and the roster ceiling lookup changed nothing, and confirm every Bingo development variable is ignored with `NODE_ENV=production`; record in `verification.md`
- [X] T075 [P] Update `README.md` with a Bingo section: how to play (daub by hand, tap FREE, BINGO!), the host setup options, the 2 to 200 player limit and `BINGO_MAX_PLAYERS`, the nine patterns, and the development-only variables (`BINGO_DEV_DECK`, `BINGO_DEV_BALLS`, `BINGO_DEV_CARD_AUDIT`, `BINGO_CLAIM_PACE_MS`) flagged as ignored in production; change the "coming soon" line so Bingo is listed as live
- [X] T076 Review `specs/005-bingo-75-ball-module/` against the finished code: update `spec.md` Assumptions, `data-model.md`, the contracts and `quickstart.md` wherever the implementation differs, and remove "pending" notes that no longer apply
- [X] T077 Run `npm run build` from the repository root (type-check and build of `shared/src`, `server/src` and `client/src`) and fix every error and warning introduced by this feature; confirm the editor diagnostics are clean for the touched files under `shared/src/bingo/`, `server/src/games/bingo/` and `client/src/games/bingo/`
- [ ] T078 Sign-off SC-013 and SC-014 on real devices (a mid-range phone and a laptop: smooth animation during a full match, a first-time player can find a called number, daub it, tap FREE and claim in under 2 minutes, stakeholder rating of at least 4 out of 5 for the card look, ball console, pattern dashboard and calm feel); record in `verification.md`, or mark pending if devices are unavailable
- [ ] T079 Deploy to Render and repeat quickstart V1, V3 and V4 on the live URL with two devices, plus startup, readiness, WebSocket connectivity and reconnect after replacement (depends on the Platform Core deployment tasks in `specs/001-platform-hub-rooms/tasks.md`); record results in `verification.md`, or mark as **pending** if not yet deployed (local checks are never presented as deployment verification)

---

## Dependencies & Execution Order

### Phase dependencies

- **Phase 1 (Setup)**: no dependencies; T001 to T005 run in parallel, T006 needs T002 and T003, T007 needs T001 to T006.
- **Phase 2 (Foundational)**: T008, T010, T012 and T013 run in parallel; T009 needs T008; T011 needs T005 and T007; T014 needs T007 and T009 to T013; T015 is the gate. It blocks every user story.
- **User stories** (all need Phase 2):
  - **US1** (T016 to T023) first: nothing else can be configured or started without it.
  - **US2** needs US1 (a started match); **US3** needs US2 (cards on screen and an engine that issues them).
  - **US4** needs US2 (a started match and the screen shell) and, for shared files, US3's T038 (`bingoStore.ts`): start its server tasks (T040 to T042) in parallel with US3's client work, and its client tasks after T038.
  - **US5** needs US3 (daubs held by the server) and US4 (called numbers).
  - **US6** needs the match screen (T032); `BingoChat.tsx` (T058) can be built any time after Phase 2, but its integration (T059) needs T049 (the right column).
  - **US7** needs US2 to US5 (the regions it lays out); **US8** needs US4 and US5.
- **Polish (Phase 11)**: needs all stories; T073, T074 and T075 run in parallel.

### Within a story

Server logic before client wiring; shared types first; the store after its events exist; verification last. Tasks on the same file run in the listed order, never in parallel: `engine.ts` (T011, T017, T027, T034, T042, T052, T067, T068), `matchOps.ts` (T026, T041, T067), `bingoStore.ts` (T022, T031, T038, T048, T055, T071), `BingoScreen.tsx` (T032, T049, T056, T059, T063, T069, T071), `CardGrid.tsx` (T028, T036, T037), `useFit.ts` (T029, T061), `PatternDashboard.tsx` (T054, T062), `BallConsole.tsx` (T046, T062) and `bingo.css` (T020, T037, T063, T064).

### Parallel opportunities

- Phase 1: T001, T002, T003, T004, T005.
- Phase 2: T008, T010, T012, T013.
- US1: T019 and T020; US2: T024, T025, T028, T029; US3: T035; US4: T040, T043, T044, T045; US5: T053; US8: T070.
- Server work (`cards.ts`, `deck.ts`, `claims.ts`) and client components can be built at the same time once the shared types exist.

## Implementation Strategy

1. **MVP**: Phases 1 to 7 (US1 to US5): a configured room, cards, daubing with the FREE tooltip, a caller, and claims. Stop here and run quickstart V1 to V4 before the P2 stories.
2. **Incremental delivery**: add US6 (pure chat), US7 (measured layout; do a first pass early if screens look cramped), then US8 (host dashboard, results, New round).
3. **Risk control**: the shared changes (T008 to T013) touch code Housie and Ludo use; T015 and T074 must prove both are unchanged before and after.
4. **Evidence**: each verification task appends a dated section to `verification.md` with scenario, expected, observed and screenshots; local checks are never presented as Render deployment verification.
5. **Reuse, do not couple**: Bingo copies Housie's structure but imports nothing from `client/src/games/housie/` or `server/src/games/housie/`; neutral code comes from `@myarena/shared` or `client/src/state/viewport.ts`. The one exception is `LobbyDialog` from `client/src/games/ludo/MatchDialogs.tsx` (T032), which Housie already uses; moving it to a platform folder is a later clean-up.

---

## Phase 12: Convergence

**Purpose**: Remaining work found by `/speckit-converge` on 2026-11-05. The implementation satisfies the functional scope; what remains is one unrequested pair of files, a card-layout choice that wastes space on tablets, and verification the earlier tasks recorded as done without running. T078 and T079 above stay open and are not repeated here.

- [X] T080 Remove or justify the unrequested dev harness `client/bz-harness.html` and `client/src/bz-harness.tsx` (mock-data page used for visual checks; not in the plan, not in the production bundle) per plan: project structure (unrequested)
- [X] T081 Change `planCards` in `client/src/games/bingo/useFit.ts` to choose tabs over stack or row when the tabs card has cells at least 1.5 times taller than the best multi-card layout (768x1024 with 3 cards gives 42 x 28 cells today, tabs would give about 97 x 97), keep cells at least 40 across, and re-measure 320x568, 390x844, 768x1024, 1024x768 and 1366x768 for 2 and 3 cards per US7/AC7 and FR-036 (partial)
- [X] T082 Measure the share of the viewport used by the cards or board, the pattern dashboard and the ball or caller console (panel area divided by viewport area below the header, gaps excluded) at 320x568, 390x844, 667x375, 844x390, 768x1024, 1024x768, 1366x768, 1920x1080 and 2560x1440 for player and host, fix any size under 90 percent in `client/src/games/bingo/bingo.css` and `client/src/games/bingo/BingoScreen.tsx`, and record the numbers in `specs/005-bingo-75-ball-module/verification.md` per SC-011 (partial)
- [X] T083 Run a Housie match with two clients after the shared changes (create, set 2 tickets, start, draw balls, cross numbers, claim a combination, finish) and record it in `specs/005-bingo-75-ball-module/verification.md`; the check covers the `useRegionSize` move in `client/src/state/viewport.ts` and `client/src/games/housie/useFit.ts` per T015 and T074 (partial)
- [X] T084 Give a playing host more card height on the My Cards tab at 320x568 and 667x375 by compacting the caller console and the Board | My Cards switch in `client/src/games/bingo/BingoScreen.tsx` and `client/src/games/bingo/CallerConsole.tsx` until cells reach at least 40 x 28 px, or document the limit as accepted in `specs/005-bingo-75-ball-module/verification.md`, per FR-035, FR-036 and plan: R9 (partial)
- [X] T085 Observe the "Claims paused m:ss" button in a browser after three bogus claims in a row (disabled, countdown ticking, other players unaffected, button back after the lock) and record it in `specs/005-bingo-75-ball-module/verification.md` per US5/AC9 and FR-029 (partial)
- [X] T086 Send `<b>hi</b>`, a 600-character message and ten rapid messages in the Bingo match chat (wide and drawer) and record the plain-text display, the length limit and the rate limit in `specs/005-bingo-75-ball-module/verification.md` per FR-032 and US6/AC4 (partial)
- [X] T087 Observe hover and pressed states on cells, tabs, tiles, BINGO!, DRAW NEXT BALL, segmented controls and the pattern chooser in `client/src/games/bingo/bingo.css`, fix any control with no visible change, and record it in `specs/005-bingo-75-ball-module/verification.md` per FR-038 (partial)
- [X] T088 In a browser, daub cells and tap FREE on one card, lift the FREE dauber, reload and rejoin, and confirm the daubs return and the FREE tooltip stays gone on that card but shows on a card whose FREE was never tapped; record it in `specs/005-bingo-75-ball-module/verification.md` per US3/AC6, US3/AC7 and FR-016 (partial)
- [X] T089 Time the host path with a stopwatch (create the room, join one guest, Start with defaults; then change every setting and Start) and record it in `specs/005-bingo-75-ball-module/verification.md` per SC-001 (partial)
- [X] T090 Save screenshots as files under `specs/005-bingo-75-ball-module/evidence/` for the lobby, player view and host view at 320x568, 390x844, 667x375, 844x390, 768x1024, 1024x768 and 1366x768 (captured with the page's own screenshot call so landscape phones are not cropped), and link them from `specs/005-bingo-75-ball-module/verification.md` per Constitution workflow: UI evidence (partial)

---

## Phase 13: Convergence

**Purpose**: Remaining work found by a second `/speckit-converge` pass on 2026-11-05. The first Convergence phase is complete; what remains is one constitution finding about fixed size caps on large screens and two small verification gaps. T078 and T079 above stay open and are not repeated here.

- [X] T091 CRITICAL: Remove the fixed size caps in `client/src/games/bingo/useFit.ts` (`MAX_CELL` 120 for card cells; `MAX_BALL` 220 and the 34 px chip clamp in `planBall`) so the cards and the ball scale to the largest size their region allows (card cells still within the 1.5:1 limit), keep every size from 320x568 to 1024x768 unchanged, re-measure at 1366x768, 1920x1080 and 2560x1440 with 1, 2 and 3 cards (cell size, the card area as a share of the cards panel, the ball diameter against its console), add the default one-card view at those three sizes to `specs/005-bingo-75-ball-module/evidence/`, and replace the "Cards stop growing at 120 px cells" limit in `specs/005-bingo-75-ball-module/verification.md` with the new numbers per Constitution II and FR-036 (contradicts)
- [ ] T092 Have a person time the host path with a stopwatch (accepting the defaults under 10 seconds; changing every setting under 60 seconds) and record it in `specs/005-bingo-75-ball-module/verification.md` as part of the T078 sign-off, since T078 names only SC-013 and SC-014 while `verification.md` assigns the human SC-001 timing to it per SC-001 (partial)
- [X] T093 Observe hover, pressed and keyboard-focus states of the header chat button (`.bz-chat-bar` in `client/src/games/bingo/bingo.css`) at 390x844 and 667x375, fix any state with no visible change, and record it in `specs/005-bingo-75-ball-module/verification.md` per FR-038 (partial)