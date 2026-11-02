---

description: "Task list for Housie (Tambola) Visual-First Game Module"
---

# Tasks: Housie (Tambola) Visual-First Game Module

**Input**: Design documents from `/specs/003-housie-tambola-module/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md),
[contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: No automated unit or integration tests (user policy and constitution Principle III). Each story ends with a **browser-based
verification** task that records scenario, expected, and observed results (screenshots or measurements) in
`specs/003-housie-tambola-module/verification.md`. The existing `npm run smoke` is re-run only as a regression check (T023, T085).

**Organization**: Tasks are grouped by user story. The five P1 stories are ordered by dependency (setup, tickets, dabbing, caller, claims)
so every phase leaves a working, verifiable game; the three P2 stories (chat, layout, host dashboard) follow.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: Maps to the user story in [spec.md](spec.md) (US1 to US8)
- All paths are relative to the repository root `G:\Projects\MyArena`

## Path Conventions

Existing npm workspaces (see [plan.md](plan.md) Project Structure): `shared/src/housie/`, `server/src/games/housie/`,
`client/src/games/housie/`, plus small, optional, game-agnostic changes to Platform Core files. Constants, rules and wire shapes come from
[data-model.md](data-model.md), [contracts/housie-protocol.md](contracts/housie-protocol.md) and [research.md](research.md); do not invent
different values. Every platform change must leave Ludo and the placeholder games behaving exactly as before.

---

## Phase 1: Setup (Shared Contracts)

**Purpose**: The catalogue, ticket rules, claim evaluator, timing constants and wire types that the server and client must agree on

- [X] T001 [P] Create `shared/src/housie/timing.ts` exporting the data-model timing constants: `AUTO_INTERVALS_MS` `[5000, 8000, 10000]`, `CLAIM_PACE_MS` 2000, `BOGUS_STREAK_LIMIT` 3, `CLAIM_LOCK_MS` 60000, `BALL_ROLL_MS` 1100, `MARK_FLUSH_MS` 200, `MARK_BATCH_MAX` 30, plus `TICKET_CEILING_MAX` 4, `DEFAULT_TICKET_CEILING` 1, and `DEFAULT_PATTERN_IDS` (`early-five`, `top-line`, `middle-line`, `bottom-line`, `four-corners`, `full-house-1`)
- [X] T002 [P] Create `shared/src/housie/ticket.ts` exporting `Ticket` (3 rows of 9 cells, each `0` for empty or a number), `COLUMN_RANGES` (column 0 is 1 to 9, columns 1 to 7 are `10c` to `10c + 9`, column 8 is 80 to 90), `cellBit(row, col)` (`row * 9 + col`), `ticketKey(ticket)` (the 27 cells joined as text), `columnsOfRow(ticket, row)` (the five column indexes holding numbers, i.e. positions 1 to 5), and `validateTicket(ticket): string | null` enforcing exactly: every row has exactly 5 numbers; 15 numbers in total; column `c` holds 1 to 3 numbers all inside its range; numbers ascend top to bottom within a column; no number appears twice
- [X] T003 [P] Create `shared/src/housie/patterns.ts` with `PatternDef` (`id`, `name`, `group` of `early`|`lines`|`shapes`|`numbers`|`house`, `description` one line, `illustration` cells for the picture, `rule`) and the 40-pattern `PATTERNS` catalogue in the order of the spec Appendix (ids are kebab-case of the names; Full House ids `full-house-1`, `full-house-2`, `full-house-3`). Rule kinds exactly as research R3: `cells` (list of `[row 0-2, position 1-5]` for all 26 Lines/Shapes entries other than Any Line, including Top, Middle, Bottom, Top and Middle, Middle and Bottom, Top and Bottom as row cell lists), `rows` (Any Line), `count` (`n` plus optional filter `odd`|`even`|`1-45`|`46-90`; Early Five/Seven/Ten/Twelve use 5/7/10/12; Five Odds, Five Evens, Young Five, Old Five use 5; Young and Old needs two filters of 5 each; Almost House uses 14) and `full` (all 15, with `order` 1, 2, 3). Also export `PATTERN_GROUPS` (group id, label, pattern ids in order), `getPattern(id)`, and `ILLUSTRATION_SLOTS` (the fixed sample layout: row 1 columns 0,1,3,5,7; row 2 columns 1,2,4,6,8; row 3 columns 0,2,3,5,8)
- [X] T004 [P] Create `shared/src/housie/types.ts` with `HousieLobby` (`ceiling`, `hostPlays`, `patterns`, `caller { mode, intervalMs? }`, `choices` map), `ComboState`, `HousieView`, `HousieEvent` union (`snapshot`, `ball`, `caller`, `claimed`, `bogus`, `justClaimed`, `claimsPaused`, `finished`, `playerLeft`, with `seq` on public events and `priv: true` on private ones) and `HousieAction` union (`setCeiling`, `setHostPlays`, `setPatterns`, `setCaller`, `setTickets`, `draw`, `auto`, `manual`, `pause`, `resume`, `marks`, `claim`) with fields exactly as in [contracts/housie-protocol.md](contracts/housie-protocol.md) (including `you.claimsLockedMs?` and the results shape)
- [X] T005 Create `shared/src/housie/evaluate.ts` with the pure `evaluatePattern(pattern, ticket, marksMask, calledSet): boolean` per research R3 and data-model "Validity": a cell is satisfied only if its number is in `calledSet` AND its bit is set in `marksMask`; `cells` rules check every listed `(row, position)` through `columnsOfRow`; `rows` needs one whole row satisfied; `count` counts satisfied cells passing the filter; `full` needs all 15 (depends on T002, T003)
- [X] T006 [P] Update `shared/src/limits.ts` (add `ROSTER_COLORS`, 12 distinct colour keys: the existing `red`, `green`, `yellow`, `blue` plus eight more; and the platform constants `STATE_COALESCE_MS` 250 and `COALESCE_ABOVE` 12, which belong here and not in the Housie module) and `shared/src/games.ts` (extend `GameDefinition` with optional `roster?: boolean` and `quietChat?: boolean`; add the eight new colour values to `COLOR_HEX`; leave the `housie` entry as `coming_soon` until T026)
- [X] T007 Update `shared/src/protocol.ts` (add `gameLobby?: unknown` to `RoomState`, `'game_notice'` to `SystemCode`, `ROOM_RESET: 'room:reset'` to `EVENTS`, and widen `JoinedData.game` to `unknown`) and `shared/src/index.ts` (export the new `housie/` modules). Fix Ludo's usages of `JoinedData.game` with a cast to `LudoState` so Ludo's behaviour is unchanged (depends on T001 to T006)

---

## Phase 2: Foundational (Platform Core Extensions and Engine Skeleton)

**Purpose**: Game-agnostic, optional hooks in the platform (lobby channel, roster seating, quiet chat, private events, large-room guards, new round) and a Housie engine skeleton, so every story builds on a live room

**CRITICAL**: No user story work can begin until this phase is complete. All hooks are optional: Ludo and the placeholder games must be unaffected.

- [X] T008 [P] Update `server/src/config.ts` with `housieMaxPlayers` (`HOUSIE_MAX_PLAYERS`, default 200, clamped 2 to 500) and `maxSockets` (`MAX_SOCKETS`, default 1500), both optional with safe defaults and no effect in other games
- [X] T009 Update `server/src/games/registry.ts` per [contracts/platform-extensions.md](contracts/platform-extensions.md): add the optional engine members `createLobby`, `lobbyView`, `onLobbyAction(lobby, who: { playerId, isHost }, action)`, `onLobbyLeave`, `validateStart(lobby, seated)` and the third optional `lobby` argument to `createMatch`; add `emitTo(playerId, event)`, `hostId()` and `notice(text)` to `GameContext`; leave `placeholderEngine.ts` untouched (it ignores the new members)
- [X] T010 Update `server/src/rooms/room.ts` for roster seating: for games with `roster: true` create no seats in the constructor, make `addParticipant` create a seat on demand while `seats.length < capacity` with the colour from `ROSTER_COLORS` by `joinSeq` (cycling), make `releaseSeat` remove the seat entirely, make `setCapacity` accept any integer from `minPlayers` up to the room's effective `maxPlayers` (`min(game.maxPlayers, housieMaxPlayers)` for Housie) without moving occupants, and make `projection()` list only occupied seats and send the effective `maxPlayers`. Fixed-seat games keep their current code paths (depends on T008, T009)
- [X] T011 Update `server/src/rooms/room.ts` for quiet chat and coalescing: `announce` skips the chat line (but still bumps `rev` and broadcasts state) when the game is `quietChat` and the room state is `in_progress`; add `GameContext.notice(text)` posting one sanitised system line with `systemCode: 'game_notice'`, at most 5 per second per room; for rooms with `capacity > COALESCE_ABOVE` (both constants from `shared/src/limits.ts`), make `changed()` bump `rev` immediately but emit `room:state` at most every `STATE_COALESCE_MS` on the trailing edge, always sending the latest state; small rooms emit immediately as before (depends on T010)
- [X] T012 Update `server/src/rooms/room.ts` for the lobby channel, private events and new round (do it in three steps: lobby routing and `validateStart`; `emitTo`, `hostId` and `notice` in `buildContext`; `resetToLobby`) and add a read-only `hasGuest(guestId)` helper used by T015: keep an engine `lobby` created in the constructor via `createLobby`; attach `gameLobby: engine.lobbyView(lobby)` to `projection()` in the lobby; route `action()` to `onLobbyAction` (passing `{ playerId, isHost }`) in the lobby when the engine defines it, otherwise keep the current error; call `onLobbyLeave` when a person leaves or is removed in the lobby; in `start()` call `validateStart` (a returned string becomes `INVALID_STATE`) and pass the lobby as the third `createMatch` argument; add `emitTo`, `hostId` and `notice` to `buildContext()` (via a new `RoomEvents.gameEventTo(room, socketId, event)`); add `resetToLobby(socketId)` (host only, only when `in_progress`: dispose the match, clear match timers, state `lobby`, call `createLobby` again for default settings, keep `capacity`, `changed()`) (depends on T011)
- [X] T013 Update `server/src/rooms/roomStore.ts` to pass `gameEventTo` through to the room events and to create roster games with their `defaultCapacity` (the `MAX_SOCKETS` check lives in the handler, T015) (depends on T012)
- [X] T014 [P] Update `server/src/sockets/schemas.ts`: make `gameActionSchema` a union that keeps the Ludo members and adds every Housie intent from [contracts/housie-protocol.md](contracts/housie-protocol.md) as a strict object, with bounds: `setCeiling.value` integer 1 to 4; `setPatterns.ids` array of 1 to 40 distinct strings up to 40 chars; `setCaller.mode` `manual`|`auto` with `intervalMs` one of 5000/8000/10000; `setTickets.count` integer 1 to 4; `auto.intervalMs` one of 5000/8000/10000; `marks.changes` array of 1 to 30 items `{ t: integer 0..3, c: integer 0..26, on: boolean }`; `claim` `{ combo: string up to 40, ticket: integer 0..3 }`. No field may carry a ball, ticket or result
- [X] T015 Update `server/src/sockets/registerHandlers.ts`: implement `RoomEvents.gameEventTo` (emit `game:event` to one socket id), handle `room:reset` (host-only, calls `room.resetToLobby`, returns the new projection), and make `room:create` and a join for a *new* seat (check `room.hasGuest(guest.guestId)` first) answer `SERVER_BUSY` when `io.engine.clientsCount` exceeds `maxSockets`, but never refuse a resumed join by a guest who already holds a seat (reconnecting players must always get their snapshot, constitution Principle V); keep the existing action rate limit (burst 10, 5 per second) (depends on T012, T013, T014)
- [X] T016 Create `server/src/games/housie/engine.ts` as a skeleton `GameEngine` (id `housie`): `createLobby` returns the default lobby from `shared/src/housie`, `lobbyView` returns it, `onLobbyAction` returns `{ ok: false, reason: 'Not available yet' }`, `createMatch` returns an empty match, `getView` returns null, `onAction` not available, `onSeatReleased` and `onBotTurn` no-ops, `dispose` cancels timers. Register it for `housie` in `server/src/games/registry.ts` (depends on T009)
- [X] T017 Update `client/src/state/roomStore.ts` (depends on T007): make `createRoom` take a `gameId` (it is hard-coded to `'ludo'` today) and call `applyJoined(gameId, ...)`; keep the Ludo `game` slice untouched and, for other games, forward `JoinedData.game` and every `game:event` payload to the feed from `getGameFeed(room.gameId)` (`reset`, `onSnapshot`, `onEvent`); add `resetRoom()` sending `room:reset`; make `sendGameAction` accept any intent object; expose `room.gameLobby`
- [X] T018 [P] Update `client/src/games/registry.ts` (depends on T007): add `getLobbyScreen(gameId)` and `getGameFeed(gameId)` next to `getMatchScreen`, with the `GameFeed` type `{ reset(), onSnapshot(view), onEvent(event) }`; no Housie entries yet
- [X] T019 Update `client/src/components/room/RoomShell.tsx` to render the game's lobby screen from `getLobbyScreen(room.gameId)` when `room.state === 'lobby'` (passing `room`, `youId`, `invitePath`, `chat`) and otherwise keep the current generic layout (depends on T018)
- [X] T020 [P] Update `client/src/components/room/HostControls.tsx`: for games with `roster: true` replace the plus and minus stepper with a number field (min `room.minPlayers`, max `room.maxPlayers`, clamped on blur) plus preset buttons 10, 25, 50, 100, 200 (presets above the maximum are hidden); Start is unchanged and still disabled with the platform reasons; fixed-seat games keep the stepper
- [X] T021 [P] Update `client/src/components/room/PlayerList.tsx` to accept an optional `badge(playerId): ReactNode` render prop shown at the end of each row; default behaviour unchanged
- [X] T022 [P] Update `client/src/components/launch/LaunchModal.tsx` and `client/src/components/hub/GameCard.tsx`: pass the selected game's id to `createRoom`; show only Play Online for games with `supportsAi: false`; make cards for `status: 'active'` games launch like Ludo (depends on T017)
- [X] T023 Foundational checkpoint: run `npm run build` and `npm run smoke` (Platform Core regression must pass unchanged), then play one Ludo match with two windows (create, start, a few turns, chat) and confirm colours, chat system lines, and behaviour are exactly as before; fix any regression before continuing

**Checkpoint**: The platform hooks exist, Ludo is unchanged, and a Housie engine skeleton is registered; user stories can begin

---

## Phase 3: User Story 1 - Host Sets Up the Room (Priority: P1) MVP slice 1

**Goal**: One calm setup screen where the host sets the player limit (2 to 200), the ticket ceiling (1 to 4), whether the host plays, the calling mode, and the combinations, with defaults preselected, and starts the match.

**Independent Test**: Quickstart H1: create a Housie room, change every setting, join a second window, confirm the lobby shows the settings and Start rules.

- [X] T024 [US1] Create `server/src/games/housie/lobby.ts`: the lobby model per data-model "Lobby" (`ceiling` 1 to 4 default 1, `hostPlays` default true, `patterns` default the six ids, `caller` default manual, `choices` map playerId to 1..ceiling default 1; the host entry exists only when `hostPlays`), `applyLobbyAction(lobby, who, action)` for `setCeiling` (host only, clamps every choice to the new ceiling), `setHostPlays` (host only, adds or removes the host's choice), `setPatterns` (host only, only catalogue ids, no duplicates, 1 to 40, kept in catalogue order), `setCaller` (host only) and `setTickets` (anyone seated, the host only when `hostPlays`, refused above the ceiling with "Choose 1 to N tickets"), `onLeave(lobby, playerId)` dropping the choice, host handover handled at start (the host is the first seat; a leftover `choices` entry for a host is ignored when `hostPlays` is false), `validateStart` ("Pick at least one combination", and "Wait for at least one more person" when nobody else is seated), and `lobbyView(lobby)` as plain JSON with nothing private
- [X] T025 [US1] Update `server/src/games/housie/engine.ts` to wire the lobby (depends on T016, T024): `createLobby`, `lobbyView`, `onLobbyAction`, `onLobbyLeave`, `validateStart` delegating to `lobby.ts`; clamp a changed ceiling's effect so affected players' choices change and the new room state reaches everyone
- [X] T026 [US1] Update `shared/src/games.ts`: set `housie` to `status: 'active'`, `minPlayers: 2`, `maxPlayers: 200`, `defaultCapacity: 10`, `supportsAi: false`, `roster: true`, `quietChat: true`, keeping its theme and tagline (depends on T006)
- [X] T027 [P] [US1] Create `client/src/games/housie/PatternPicture.tsx`: inline SVG drawing a 3 by 9 sample ticket from `ILLUSTRATION_SLOTS` (empty cells dark, number slots paper-coloured) with the pattern's `illustration` cells in gold, taking `size` (`sm` for the chooser, `lg` for the popover) and an accessible name from the pattern name and description
- [X] T028 [P] [US1] Create `client/src/games/housie/housie.css` with the royal arcade base: CSS variables for the palette (deep midnight gradient, navy panels with thin gold edge, gold, paper, felt-tip red and blue, text on dark at least 4.5:1), tactile button states (hover, pressed, visible keyboard focus), panel, chip and segmented-control styles, the setup column and chooser styles, and a `prefers-reduced-motion` block; import it from the lobby and match screens
- [X] T029 [US1] Create `client/src/games/housie/HousieLobby.tsx` per [contracts/match-screen-layout.md](contracts/match-screen-layout.md) "Lobby screen": setup column (Players number field with presets, Max tickets each 1 to 4 segmented, I also play toggle, Calling Manual/5s/8s/10s segmented, combination chooser with 40 `PatternPicture` tiles in five groups, group header toggles, "n of 40" counter, Reset to defaults), a read-only summary for non-hosts, My tickets 1..ceiling segmented control (hidden for the host when `hostPlays` is off), people column (platform `InviteBar`, `PlayerList` with a ticket-count badge, Start button disabled with its reason), and the platform `ChatPanel`; send settings through `sendGameAction`, show the one-line notice when the player's own count was reduced (depends on T017, T018, T021, T027, T028)
- [X] T030 [US1] Create `client/src/games/housie/housieStore.ts` (feed skeleton: `reset`, `onSnapshot`, `onEvent`, a `useSyncExternalStore` hook, lobby selectors reading `room.gameLobby`) and register `housie` in `client/src/games/registry.ts` for `getLobbyScreen` and `getGameFeed` (depends on T018, T029)
- [X] T031 [US1] Verification (quickstart H1): run the setup scenarios (defaults, every setting, Start refusals, limit below seated refused, ceiling clamp notice, 200 preset, `HOUSIE_MAX_PLAYERS=50`) and time SC-001 (under 10 s with defaults, under 60 s changing everything); record scenario, expected, observed and screenshots in `specs/003-housie-tambola-module/verification.md`

**Checkpoint**: A host can configure and start a Housie room; the match screen is still empty (next story)

---

## Phase 4: User Story 2 - Players Choose Tickets and See Them Clearly (Priority: P1)

**Goal**: Each person picks 1 up to the ceiling; on start the server issues valid unique tickets that appear large and legible on the left, stacked, in a 2 by 2 grid, or in tabs.

**Independent Test**: Quickstart H2: change the ticket count, start, inspect tickets against every rule, compare tickets across players.

- [X] T032 [P] [US2] Create `server/src/games/housie/tickets.ts` implementing research R2: column counts (each column starts at 1, the remaining 6 go to random columns with fewer than 3), row placement by randomized backtracking so every row holds exactly 5, numbers picked per column with `crypto.randomInt` and sorted ascending top to bottom, a per-match `Set` of `ticketKey` for uniqueness (regenerate on a collision), `validateTicket` self-check on every ticket (log and regenerate on failure), and the development-only audit `HOUSIE_DEV_TICKET_AUDIT=N` that logs "N of N valid and unique" at start-up and is ignored when `NODE_ENV=production`
- [X] T033 [US2] Update `server/src/games/housie/engine.ts` `createMatch` (depends on T025, T032): freeze `settings` from the lobby, build `PlayerEntry` objects for every seated ticket holder (the host only when `hostPlays`), issue each their chosen number of unique tickets and empty mark masks (27-bit per ticket), set `matchRev`, and send each person a private `snapshot` event via `ctx.emitTo` containing their own `HousieView` (never others' tickets); implement `getView(match, playerId)` returning that person's view (empty `you` for a non-playing host) so join, create and resume acknowledgements restore state
- [X] T034 [P] [US2] Create `client/src/games/housie/Ticket.tsx`: a read-only 3 by 9 grid of cells (number cells as buttons with the number as text, empty cells inert and hatched), warm paper look with gold edge, number text sized from the cell, `aria-label` per cell ("Row 1, column 3, number 27")
- [X] T035 [P] [US2] Create `client/src/games/housie/useFit.ts`: a `useRegionSize(ref)` hook using one `ResizeObserver` that reports width and height and re-fits within 0.5 s of a resize or rotation, and the pure `planTickets(width, height, count)` function per [contracts/match-screen-layout.md](contracts/match-screen-layout.md) "Ticket fit" returning `{ mode: 'stack' | 'grid' | 'tabs', cell }` choosing stack if every cell width is at least 32 px, else a 2 by 2 grid for 3 to 4 tickets if at least 32 px, else tabs
- [X] T036 [US2] Create `client/src/games/housie/TicketArea.tsx` (depends on T034, T035): lays out the player's tickets per `planTickets`, selection (the selected ticket gets a gold outline and gold tab, "Ticket #n" labels), keyboard-reachable tabs, and the selected index persisted in `localStorage` key `myarena.housie.ticket`
- [X] T037 [US2] Update `client/src/games/housie/housieStore.ts` (depends on T030): apply the private `snapshot` and the join-ack `game` view (tickets, marks, `seq`), expose selectors for tickets, selected ticket and `playing`, keep a snapshot that arrives before `room:state` flips to `in_progress` and show it as soon as the match screen mounts, and reset on leave
- [X] T038 [US2] Create `client/src/games/housie/HousieScreen.tsx` (depends on T036, T037): the match screen shell with the compact header (room code, "n / limit" count, Quit with confirmation, Lobby dialog using the platform `LobbyDialog` pattern, sound toggle) and the left region showing the `TicketArea` (or a short "You are the caller" panel for a non-playing host), `100dvh` with safe-area padding and no page scroll; register it for `getMatchScreen` in `client/src/games/registry.ts`
- [X] T039 [US2] Verification (quickstart H2): ticket counts 1 to 4 visible to the host within 1 s, SC-002 audit (`HOUSIE_DEV_TICKET_AUDIT=500` logs 500 of 500; inspect 40 tickets in the DOM for every rule and uniqueness), stack, 2 by 2 and tabs at 1280 x 720 and 390 x 844 with every cell measured at least 32 px; record in `verification.md`

**Checkpoint**: A started match shows each person's valid tickets

---

## Phase 5: User Story 3 - Dab Numbers by Hand (Priority: P1)

**Goal**: Cells are never auto-marked; tapping toggles a tactile ink cross; marks survive reloads and are held by the server for claim checks.

**Independent Test**: Quickstart H3: a called number stays unmarked until tapped; tap and untap; reload keeps marks; keyboard works.

- [X] T040 [US3] Update `server/src/games/housie/engine.ts` (depends on T033): handle `marks` (only a playing person; each change `{ t, c, on }` is applied only when ticket `t` is theirs and the cell holds a number, others are dropped; never infer or add marks) and include the 27-bit masks in `getView` so a reconnect restores marks
- [X] T041 [P] [US3] Update `client/src/audio/sfx.ts` with three short synthesized sounds respecting the existing mute and reduced-motion handling: `ballRoll` (roll and settle), `stamp` (ink), and `winChime` (claim celebration)
- [X] T042 [P] [US3] Create `client/src/games/housie/anim/stamp.ts`: draws the SVG X by animating `stroke-dashoffset` for 120 ms with a small scale pop; under reduced motion the cross appears instantly; removing fades it out in 80 ms
- [X] T043 [US3] Update `client/src/games/housie/Ticket.tsx` (depends on T034, T041, T042): make number cells toggle on click, tap, Enter and Space with `aria-pressed`, render felt-tip red (ticket 1, 3) or blue (ticket 2, 4) crosses, never auto-mark called numbers, allow marking a number that is not called without any message, and add arrow-key movement between cells (Tab enters the ticket)
- [X] T044 [US3] Update `client/src/games/housie/housieStore.ts` (depends on T037): optimistic mark toggles; coalesce toggles for `MARK_FLUSH_MS` (200 ms) into one `marks` action of at most `MARK_BATCH_MAX` (30) changes; expose `flushMarks()` which `claim` calls before sending; on a failed send keep local state and retry with the next flush; adopt the server's marks from snapshots
- [X] T045 [US3] Verification (quickstart H3): called ball leaves its cell unmarked, tap and untap, uncalled number can be crossed, reload restores marks, keyboard operation, SC-004 over 20 draws; record in `verification.md`

**Checkpoint**: Dabbing works and the server holds each player's marks

---

## Phase 6: User Story 4 - The Host Calls Balls and Everyone Sees Them Beautifully (Priority: P1)

**Goal**: A server-authoritative caller (manual, or auto every 5, 8 or 10 s, pausable), a glossy rolling ball for everyone, the mini-grid of previous numbers, and the host's master 1 to 90 board.

**Independent Test**: Quickstart H4: draw manually and in each auto mode; balls appear within 1 s on every screen, the mini-grid and master board match, no repeats, calling ends at 90.

- [X] T046 [P] [US4] Create `server/src/games/housie/deck.ts`: Fisher-Yates shuffle of 1 to 90 using `crypto.randomInt`, kept server-side only, plus the development-only controls ignored in production: `HOUSIE_DEV_BALLS` (fixed start of the call order) and `HOUSIE_DEV_DECK=first-ticket` (the first seated ticket holder's first ticket numbers row by row, then the rest shuffled)
- [X] T047 [US4] Update `server/src/games/housie/engine.ts` (depends on T033, T046): build the deck at match start; handle `draw` (host only via `ctx.hostId()`, refused after the 90th with "All balls have been called"; restarts the auto timer when auto is running), `auto` (host only, 5000, 8000 or 10000), `manual`, `pause`, `resume`; auto calling is a `ctx.schedule` chain that keeps running when the host disconnects; emit public `ball` (`n`, `index`, `nextInMs`) and `caller` events with increasing `seq`; keep `called` and `current` in `getView`; never expose the deck
- [X] T048 [P] [US4] Create `client/src/games/housie/Ball.tsx`: CSS glossy white sphere (layered radial gradients, specular highlight, blurred ground shadow, soft glow) with a bold number in a white disc, sized by prop
- [X] T049 [P] [US4] Create `client/src/games/housie/anim/ballRoll.ts`: Web Animations API roll-in (from the right with rotation and settle, `BALL_ROLL_MS` 1100) then a glow pulse; a newer ball interrupts an older reveal; reduced motion uses a 150 ms fade
- [X] T050 [P] [US4] Create `client/src/games/housie/MasterBoard.tsx`: the 1 to 90 board as a 10 by 9 grid measured to its region, called numbers lit, the current ball gold; also used as the on-demand "View all" overlay for players
- [X] T051 [US4] Create `client/src/games/housie/BallConsole.tsx` (depends on T048, T049, T050): the ball, "Called n of 90", and the mini-grid of previously called numbers newest first with as many chips as fit plus a "View all" chip opening the `MasterBoard` overlay; plays `ballRoll` and the `ballRoll` sound on each new ball
- [X] T052 [US4] Create `client/src/games/housie/CallerConsole.tsx` (depends on T048, T050): host-only DRAW NEXT BALL, Auto segmented Off/5s/8s/10s, Pause/Resume, recent number chips, a thin countdown ring to the next automatic draw from `nextInMs`, and disabled states with the reason after the 90th ball
- [X] T053 [US4] Update `client/src/games/housie/housieStore.ts` (depends on T044): apply public `ball` and `caller` events in `seq` order (ignore `seq <= view.seq`; detect a gap and re-join to resync), update the called list, current ball and caller state immediately, and queue only the large-ball reveal animation
- [X] T054 [US4] Update `client/src/games/housie/HousieScreen.tsx` (depends on T038, T051, T052, T053): add the right column's top region (ball console for players; caller console for the host) at about one third of the right column's height
- [X] T055 [US4] Verification (quickstart H4): manual draws, auto at 5, 8 and 10 s with ten measured intervals each (within 0.5 s, SC-006), pause, resume, interval change, host tab closed (draws continue), 90 draws with no repeats and a refused 91st (scripted host client), mini-grid newest first with the correct count (SC-007), reduced motion; record in `verification.md`

**Checkpoint**: A match can be called end to end

---

## Phase 7: User Story 5 - Claim a Win and See It Everywhere (Priority: P1)

**Goal**: A CLAIM button on each open combination tile uses the selected ticket; the server validates against called numbers and the player's crosses; valid claims show Claimed everywhere, bogus claims show only to the claimant; tiles open a pattern illustration.

**Independent Test**: Quickstart H5: valid claim, each bogus variant, a race, pace and lock, Full House order, popover.

- [X] T056 [US5] Create `server/src/games/housie/claims.ts`: `handleClaim(match, playerId, action, nowMs)` evaluating in the data-model order: (1) running, playing sender, combination in play, ticket owned; (2) open and not locked (else `justClaimed` or "Claim the earlier Full House first"); (3) pace `CLAIM_PACE_MS` ("Wait a moment") and not locked (`now >= lockedUntil`, else "Claims paused"); (4) `evaluatePattern` against the sender's marks and the called set, and for Full House 2nd and 3rd the ticket must not already have won a Full House; track `bogusStreak` (reset by a valid claim, at `BOGUS_STREAK_LIMIT` set `lockedUntil = now + CLAIM_LOCK_MS` and reset the streak when the lock ends); `HOUSIE_CLAIM_PACE_MS` development override ignored in production
- [X] T057 [US5] Update `server/src/games/housie/engine.ts` (depends on T040, T047, T056): create `combos` from `settings.patterns` with `locked` for Full House 2nd and 3rd; handle `claim`; accepted claims set `claimedBy`, emit the public `claimed` event, unlock the next Full House, and call `ctx.notice("[name] won [pattern]")`; bogus claims send only the claimant a private `bogus`; lost races and taken combinations send a private `justClaimed`; a lock sends a private `claimsPaused { untilMs }` (also in `getView` as `you.claimsLockedMs`); the single-threaded handler decides races in arrival order
- [X] T058 [P] [US5] Create `client/src/games/housie/anim/celebrate.ts`: gold sweep and confetti sparks on a tile for 1.2 s; reduced motion shows a 1 s gold outline
- [X] T059 [P] [US5] Create `client/src/games/housie/PatternPopover.tsx`: a dialog showing `PatternPicture` (large), the pattern name and one-line description, anchored to the tile and flipped to stay on screen, a bottom sheet on narrow screens, closing on an outside tap, Escape or the close control with focus returning to the tile; it reads no player state
- [X] T060 [US5] Create `client/src/games/housie/CombinationTiles.tsx` (depends on T058, T059): tiles for the chosen combinations only; open tile = name plus gold CLAIM button (disabled with "after 1st" for locked Full House tiles, disabled with a countdown while "Claims paused"); claimed tile = name and "Claimed by [name]" in the winner's colour; header "Claims use: Ticket #n"; tile body click, tap, Enter or Space opens the popover (the CLAIM button does not); local "Bogus Claim" notice on the tile for about 2 s; `flushMarks()` before sending `claim`; density tiers are applied in US7
- [X] T061 [US5] Update `client/src/games/housie/housieStore.ts` (depends on T053): apply `claimed` (everyone), private `bogus`, `justClaimed` and `claimsPaused`, run the celebration and `winChime` on every screen, and track combo state and the lock countdown
- [X] T062 [US5] Update `client/src/games/housie/HousieScreen.tsx` (depends on T054, T060, T061): add the left-bottom combinations region under the tickets
- [X] T063 [US5] Verification (quickstart H5): valid claim with the dev deck, bogus variants (not called, called but not crossed, crossed but not called), already claimed, a scripted race (exactly one `claimed`), pace and the 1-minute lock after 3 bogus claims in a row (reset by a valid claim), Full House order and one Full House per ticket, popover behaviour, privacy (no other client sees a bogus claim), a claim sent just before a ball is called does not count that ball, SC-008 and SC-009; record in `verification.md`

**Checkpoint**: The core game loop is complete (MVP: US1 to US5)

---

## Phase 8: User Story 6 - Player-Only Chat That Can Be Tucked Away (Priority: P2)

**Goal**: Chat below the ball console with only typed messages and accepted-win lines during the match, minimizable to a slim bar with an unread indicator.

**Independent Test**: Quickstart H7.

- [X] T064 [US6] Create `client/src/games/housie/ChatDock.tsx`: wraps the platform `ChatPanel` with a Minimize control; the minimized slim bar shows a chat icon, "Chat" and an unread pill (count of unread typed messages from other people; accepted-win lines do not count, matching the room store's `unread` rule, which stays unchanged) using the room store's `unread` and `setDrawerOpen`; the panel stays mounted (hidden with CSS) while minimized so half-typed text is kept; open or minimized state persisted in `localStorage` key `myarena.housie.chat`
- [X] T065 [US6] Update `client/src/games/housie/HousieScreen.tsx` (depends on T054, T064): place the dock in the right column's lower two thirds (landscape) and as the peek drawer (portrait); add a visually hidden live region announcing each new ball ("Ball 42") and each accepted claim; confirm the platform renders `game_notice` lines as win lines and that no other automatic lines appear during the match
- [X] T066 [US6] Verification (quickstart H7): only typed messages and win lines during a match (balls, claims, joins, leaves, host actions never appear), join and leave lines still appear in the lobby and stop at match start, minimize with unread count within 1 s, restore keeps draft text, minimized state survives a reload; type `<b>hi</b>` and a 600-character message to confirm plain-text display and the length limit, and send quickly to see the platform rate limit (FR-031); record SC-010 and SC-011 in `verification.md`

---

## Phase 9: User Story 7 - A Calm, Beautiful, Uncluttered Screen on Every Device (Priority: P2)

**Goal**: A measured, space-filling layout with no page scroll from 320 to 2560 px, tile density tiers, royal arcade styling, restrained effects, reduced-motion paths.

**Independent Test**: Quickstart H8.

- [X] T067 [US7] Update `client/src/games/housie/useFit.ts` (depends on T035): add `planTiles(width, height, count)` implementing the density tiers (up to 9 large, up to 18 medium, up to 40 compact; minimum tile widths 96, 76 and 58 px; tap height at least 40 px, 44 px for large) with the tile grid scrolling internally only if the minimum cannot fit, and `planBall(width, height)` (diameter `min(height x 0.7, width x 0.4)`, at least 56 px, with chip sizes 22 to 30 px)
- [X] T068 [US7] Update `client/src/games/housie/CombinationTiles.tsx` and `client/src/games/housie/BallConsole.tsx` to use `planTiles` and `planBall` (abbreviated tile names with tooltips in the compact tier)
- [X] T069 [US7] Update `client/src/games/housie/housie.css` and `HousieScreen.tsx` for the full responsive layout per [contracts/match-screen-layout.md](contracts/match-screen-layout.md): landscape two columns (left about 58 percent: tickets over tiles; right: ball console one third over chat two thirds) using grid `fr` units with `min-height: 0` and `min-width: 0`; portrait one column (ball row at most 14 percent, tickets, tiles at most 30 percent, chat peek drawer); `100dvh`, safe-area insets, re-fit within 0.5 s on resize or rotation without changing state
- [X] T070 [P] [US7] Update `client/src/games/housie/housie.css` for the quiet-moment rule (only the ambient background shimmer and the active-ball glow animate), the full reduced-motion block (ball fade, instant crosses, outline celebration, no ambient shimmer), high-contrast checks against the Ludo audit (4.5:1 normal text, 3:1 large numbers), and visible hover, pressed and focus states on every control
- [X] T071 [US7] Compare the player and host screens with `specs/003-housie-tambola-module/mockups/player-view.png` and `host-view.png` and polish proportions, spacing, tile and ball sizes so the playing area uses at least 90 percent of the viewport apart from header and gaps (FR-034a, SC-012)
- [X] T072 [US7] Verification (quickstart H8): measure at 1920 x 1080, 1366 x 768, 1024 x 768, 768 x 1024, 390 x 844, 844 x 390, 360 x 640 and 320 x 568 (page never scrolls, cells at least 32 px, playing area at least 90 percent), with 9, 18 and 40 chosen combinations, reduced motion, contrast, hover, pressed and focus states, and that nothing animates in a quiet moment; save screenshots and measurements in `verification.md`

---

## Phase 10: User Story 8 - The Host's Dashboard During the Match (Priority: P2)

**Goal**: The host screen (master board over combinations, caller console over chat, and a Board | My Tickets switch when the host plays), match end conditions, results screen, and New round.

**Independent Test**: Quickstart H6, H9 and H10.

- [X] T073 [US8] Update `server/src/games/housie/engine.ts` (depends on T057): finish the match when every chosen combination is claimed, the 90th ball has been called, or no ticket holder remains (FR-028); on finish stop auto calling, cancel timers, emit the public `finished` event with `results` (each combination and winner or none, `calledCount`) and set `phase: 'finished'`; refuse further draws and claims with "Match is over"
- [X] T074 [US8] Update `server/src/games/housie/engine.ts` (depends on T073): implement `onSeatReleased` (a ticket holder's tickets stop playing, marks discarded, won combinations stay claimed, emit `playerLeft`, finish if no ticket holder remains) and make caller permissions follow `ctx.hostId()` at action time so host handover gives the new host the controls and auto calling continues; a released person cannot rejoin the match (the platform already blocks joining in progress); update `dispose` and make `resetToLobby` clear all match state
- [X] T075 [US8] Update `client/src/games/housie/HousieScreen.tsx` (depends on T062, T065): the host variant: left top Master Board, left bottom combinations (CLAIM buttons only when the host plays), right top caller console, right bottom chat dock; for a playing host a segmented `Board | My Tickets` control that swaps the master board for the ticket area (claims then use the selected host ticket), and the caller console stays visible in both states; after a host handover the new host's screen shows the caller controls
- [X] T076 [P] [US8] Create `client/src/games/housie/ResultsOverlay.tsx`: the results list (each combination with its winner's name and colour, or "No winner"), the final call count, Leave for everyone, and New round for the host only (calls `resetRoom()`); celebratory but quiet styling; reduced motion respected
- [X] T077 [US8] Update `client/src/games/housie/housieStore.ts` (depends on T061): handle `finished` and `playerLeft`, clear match state when the room returns to the lobby (via `room:state` and `feed.reset()`), and keep the host's caller state consistent across reconnects
- [X] T078 [US8] Verification (quickstart H6, H9, H10): host plays and claims from My Tickets, host not playing sees no tickets or CLAIM buttons, host handover (caller controls move, old host's tickets stop playing), every combination claimed ends the match, 90 balls with unclaimed combinations ends with "No winner", all ticket holders leaving ends the match, New round resets all settings to defaults with the player limit kept and ticket counts at 1, player reconnect restores tickets, marks, history and tile states, a seat released after the 60 s window cannot return, server restart shows the existing reconnect then "room ended" flow; record in `verification.md`

---

## Phase 11: Polish & Cross-Cutting Concerns

**Purpose**: Large-room checks, regression, documentation, and sign-off

- [X] T079 [P] Verification (quickstart H11): with a scripted guest tool (Node Socket.IO clients in a temp folder, not committed) join 50 then 200 guests, record `room:state` sizes and burst rates (about 4 per second), start a 200-player match with 2 tickets each, measure ball delivery on three real clients (within 1 s) and server RSS (well under 512 MB), confirm a 201st join is refused and `MAX_SOCKETS=60` makes the 61st connection answer `SERVER_BUSY` while a guest who already holds a seat can still resume; record SC-016 in `verification.md`
- [X] T080 [P] Verification (quickstart H12): re-run `npm run smoke`, play one Ludo match end to end, and confirm every Housie development variable is ignored with `NODE_ENV=production`; record in `verification.md`
- [X] T081 [P] Update `README.md` with a Housie section: how to play, the host setup options, the 2 to 200 player limit and `HOUSIE_MAX_PLAYERS`, `MAX_SOCKETS`, and the development-only variables (`HOUSIE_DEV_DECK`, `HOUSIE_DEV_BALLS`, `HOUSIE_DEV_TICKET_AUDIT`, `HOUSIE_CLAIM_PACE_MS`) flagged as ignored in production
- [X] T082 Review `specs/003-housie-tambola-module/` against the finished code: update `spec.md` Assumptions, `data-model.md`, the contracts and `quickstart.md` wherever the implementation differs, and remove the "pending" notes that no longer apply
- [X] T083 Run `npm run build` (shared, server, client type-check and build) and fix every error and warning introduced by this feature; confirm the editor diagnostics are clean for the touched files
- [ ] T084 Sign-off SC-014 and SC-015 on real devices (a mid-range phone and a laptop: smooth animation during a full match, a first-time player can find, ink and claim in under 2 minutes, stakeholder review against the mockups); record in `verification.md`, or mark pending if devices are unavailable
- [ ] T085 Deploy to Render and repeat quickstart H1, H4 and H5 on the live URL with two devices (depends on the Platform Core deployment tasks in `specs/001-platform-hub-rooms/tasks.md`); record results in `verification.md`, or mark as **pending** if not yet deployed (local checks are never presented as deployment verification)

---

## Dependencies & Execution Order

### Phase dependencies

- **Phase 1 (Setup)**: no dependencies; T001 to T004 and T006 run in parallel, T005 needs T002 and T003, T007 needs T001 to T006.
- **Phase 2 (Foundational)**: needs Phase 1; blocks every user story. Server order: T008, T009, then T010 to T012 in order (same file), then T013, T015, T016; T014 in parallel with the room changes; client T017 to T022 can proceed once T007 is done (T018 before T019). T023 is the gate.
- **User stories** (all need Phase 2):
  - **US1** (T024 to T031) first: nothing else can be configured or started without it.
  - **US2** needs US1 (a started match); **US3** needs US2 (tickets on screen).
  - **US4** needs US2 (a started match and the screen shell) and, for shared files, US3's T041 (sounds) and T044 (`housieStore.ts`): start US4's server tasks (T046, T047) in parallel with US3, and its client tasks after T044.
  - **US5** needs US3 (marks held by the server) and US4 (called numbers).
  - **US6** needs the match screen (T038); its `ChatDock` (T064) can be built any time after Phase 2, but its integration (T065) needs T054 (the right column).
  - **US7** needs US2 to US5 (the regions it lays out); **US8** needs US4 and US5.
- **Polish (Phase 11)**: needs all stories; T079, T080, T081 in parallel.

### Within a story

Server logic before client wiring; shared types first; the store after its events exist; verification last. Tasks on the same file (`room.ts`, `engine.ts`, `housieStore.ts`, `HousieScreen.tsx`, `housie.css`) run in the listed order, never in parallel.

### Parallel opportunities

- Phase 1: T001, T002, T003, T004, T006.
- Phase 2: T008 with T014; T018 with T020, T021, T022 after T007.
- US1: T027 and T028; US2: T032, T034, T035; US3: T041 and T042; US4: T046, T048, T049, T050; US5: T058 and T059; US8: T076.
- Server work (`deck.ts`, `tickets.ts`, `claims.ts`) and client components can be built by different people at once once the shared types exist.

## Implementation Strategy

1. **MVP**: Phases 1 to 7 (US1 to US5): a configured room, tickets, dabbing, a caller, and claims. Stop here and run quickstart H1 to H5 before the P2 stories.
2. **Incremental delivery**: add US6 (chat dock), US7 (measured layout and tiers; do a first pass of the layout early if screens look cramped), then US8 (host dashboard, results, New round).
3. **Risk control**: the platform changes (Phase 2) touch shared code; T023 and T080 must prove Ludo is unchanged before and after.
4. **Evidence**: each verification task appends a dated section to `verification.md` with scenario, expected, observed and screenshots; local checks are never presented as Render deployment verification.
5. **Sub-agents** (owner decision: use them when implementing): hand self-contained, parallel-safe tasks to sub-agents with a full prompt, an explicit
   file list they own, and instructions to touch nothing else; run everything else in the main thread. Good candidates: T001 to T004 and T006 (shared
   files), T032, T046 and T056 (server logic files), T027, T034, T048, T050, T058, T059 and T076 (independent client components), read-only code
   lookups, and command runs (`npm run build`, `npm run smoke`). Keep in the main thread: all `room.ts` edits (T010 to T012), `engine.ts`,
   `housieStore.ts`, `HousieScreen.tsx`, `housie.css`, and every browser verification task (one visible tab at a time).
