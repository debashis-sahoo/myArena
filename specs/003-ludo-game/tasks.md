# Tasks: Ludo

**Input**: Design documents from `/specs/003-ludo-game/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: Included. The constitution requires automated tests for server-authoritative rules, reconnection and permissions where practicable (Development Quality Gates), the spec's success criteria need automated evidence (SC-002, SC-003, SC-004, SC-007, SC-014), and the plan defines the test stack. Real-device acceptance and the outside review sessions are manual and recorded as evidence (spec FR-038). Within each phase, write the test tasks first and confirm they fail before implementing.

**Organization**: Tasks are grouped by user story. Nothing in this list is marked done until evidence exists (Principle IX).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: User story the task belongs to (US1 to US9); the Requirement Traceability table at the end maps each FR and SC to tasks
- Tasks T141 and T142 were added after the first pass and sit in Phase 3 out of numeric order so existing references stay valid
- Paths follow the monorepo layout in plan.md: `apps/server`, `apps/web`, `packages/protocol`, `packages/game-sdk`, `packages/ludo`, `tools/load`
- Run Node tooling with Node 24 (`npx --yes --package=node@24 -- node ...` when the system Node is newer)
- Contract documents: [game-channel.md](contracts/game-channel.md) (platform), [ludo-protocol.md](contracts/ludo-protocol.md) (messages, timing), [ui-contract.md](contracts/ui-contract.md) (screens, storage), [catalog-art-image.openapi.yaml](contracts/catalog-art-image.openapi.yaml) (REST delta)

---

## Phase 1: Setup

**Purpose**: New package, dependencies and a baseline to compare against

- [X] T001 [P] Create the workspace package `packages/ludo` mirroring `packages/game-sdk`: `package.json` (`@myarena/ludo`, `type: module`, `exports` for `./dist/index.js` and types, scripts `build` = `tsc -p tsconfig.json` and `test:unit` = `vitest run --passWithNoTests`, no runtime dependencies), `tsconfig.json` extending `tsconfig.base.json`, and an empty `src/index.ts`
- [X] T002 [P] Add `@myarena/ludo` to the `build:shared` script in the root `package.json` (after `@myarena/protocol` and `@myarena/game-sdk`) and add `"@myarena/ludo": "*"` to the dependencies of `apps/server/package.json` and `apps/web/package.json`
- [X] T003 Add `three` to `dependencies` and `@types/three` to `devDependencies` in `apps/web/package.json`, run `npm install` to update `package-lock.json`, then confirm `npm ci --include=dev` succeeds in a clean clone (the Render build command) (checked with `npm ci --include=dev --dry-run`; the full clean-clone build is repeated in T136) (depends on T002)
- [X] T004 [P] Record the baseline before any change in `specs/003-ludo-game/acceptance/baseline.md`: results of `npm run lint`, `npm test`, `npm run test:integration`, `npm run test:contract`, `npm run test:e2e -w @myarena/web -- --project=desktop-chromium`, and the gzipped initial-bundle size (about 138 KB in 002)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The generic game channel, the engine's shared types and geometry, the test-dice guard and the generalized bundle budget, which every story needs

**CRITICAL**: No user story work can begin until this phase is complete

### Tests first

- [X] T005 [P] Add `apps/server/tests/unit/game-channel-schema.test.ts` covering the `game.action` intent: `action.type` matching `^[a-z][a-zA-Z0-9.]*$` and "1 to 32" characters, optional JSON `payload`, strict object (unknown fields rejected), `clientActionId` required, frame over 4 KB refused; the `game` server message (`matchId` UUID, `seq` integer at least 1, `state` JSON, `events` array); `snapshot.game` as `{ matchId, seq, state }` or null
- [X] T006 Update `apps/server/tests/contract/helpers.ts` so `validateResponse` merges `specs/003-ludo-game/contracts/catalog-art-image.openapi.yaml` over the 001 file and the 002 delta (each component schema in the delta replaces the one of the same name; `paths: {}` adds nothing)
- [X] T007 [P] Add `apps/server/tests/contract/game-channel.contract.test.ts` checking that real `game` messages, `snapshot.game` and the `GAME_ACTION_REJECTED` ack validate against the shared schemas, and that `contracts/game-channel.md` names `game.action`, `game`, `GAME_ACTION_REJECTED` and every SDK hook added in T018 (depends on T006)
- [X] T008 [P] Add `apps/server/tests/unit/room-size-rule.test.ts` covering: `settings.update` with `maxParticipants` above the selected game's `maxParticipants` is `VALIDATION_FAILED`; `game.select` is `START_BLOCKED_PARTICIPANT_COUNT` when more people hold seats than the game's maximum; otherwise the room limit is lowered to the game's maximum; a game without a selection keeps the 001 range "1 to 100"
- [X] T009 [P] Add `apps/web/tests/unit/room-state-game.test.ts` covering the reducer: a `game` message with a new `matchId` replaces everything; a `seq` not greater than the last one for the same `matchId` is ignored; `snapshot.game` is applied; `game` is cleared on `match.started`, `match.rematch` and `match.returnedToLobby`; room `version` contiguity is unaffected by `game` messages
- [X] T010 [P] Add `apps/server/tests/integration/game-channel.test.ts` with real WebSocket clients and the channel test behaviour from T030: `game.action` is acknowledged; `publish` gives each connected member their own `viewFor` result with increasing `seq`; a `null` view is not sent; a connecting or resyncing client gets `snapshot.game`; a resent `clientActionId` is not applied twice; `matchId` changes and `seq` restarts at 1 on rematch; `releaseMatch` runs on return to the lobby and on room close; `onParticipantLeft` is called once per released seat with `left`, `removed` or `expired`; the host's room role is never passed to the game; a non-member action is refused
- [X] T011 [P] Add `packages/ludo/tests/unit/layout.test.ts`: the layout table has 52 distinct ring squares, consecutive ring squares are one grid step apart (including the wrap from 51 to 0), start squares are ring indexes 0, 13, 26 and 39, star squares are 8, 21, 34 and 47, each colour has "5" lane squares ending next to the centre, and each colour has four base slots
- [X] T012 [P] Add `packages/ludo/tests/unit/seats.test.ts`: 2 players get Red and Yellow, 3 get Red, Green and Yellow, 4 get Red, Green, Yellow and Blue; assignment follows join order; turn order is clockwise Red, Green, Yellow, Blue skipping unused colours; the solo visitor is Red and 1, 2 and 3 computers take Yellow, Green and Yellow, and Green, Yellow and Blue
- [X] T013 [P] Add `packages/ludo/tests/unit/action-parser.test.ts` for `parseLudoAction`: accepts `{ type: "roll" }`, `{ type: "move", payload: { pawn } }` with `pawn` an integer 0 to 3, and `{ type: "resume" }`; rejects other types, extra fields, a non-integer or out-of-range `pawn`, and a payload on `roll` or `resume`
- [X] T014 [P] Add `apps/server/tests/unit/ludo-env.test.ts`: `LUDO_TEST_DICE` is a comma-separated list of integers 1 to 6; invalid lists are rejected; with `NODE_ENV=production` start-up is refused even when `DEPLOY_TARGET=preview`; development and test accept it
- [X] T015 [P] Update `apps/web/tests/unit/budget.test.ts` (create it if absent) for the generalized check: a 3D engine (`three` or `babylon`) in any non-lazy chunk fails; the lazy chunks whose modules include `features/ludo` or `three` fail when their combined gzip size is over "400 KB"; the initial limit stays "200 KB"; a clean build passes

### Platform game channel (generic, no Ludo knowledge)

- [X] T016 Add the `game.action` intent to `packages/protocol/src/messages.ts`: `action` as a strict object with `type` ("1 to 32" characters, `^[a-z][a-zA-Z0-9.]*$`) and optional `payload` (`z.json()`), plus the shared `clientActionId` and `v`; keep the 4 KB frame limit
- [X] T017 Add the `game` server message to `packages/protocol/src/messages.ts` (`matchId` UUID, `seq` integer "at least 1", `state` JSON, `events` array of JSON) to `serverMessageSchema`, and an optional `game` field `{ matchId, seq, state } | null` on `snapshotSchema`; export the types (depends on T016)
- [X] T018 [P] Add `GAME_ACTION_REJECTED` to `rejections` in `packages/protocol/src/errors.ts` with `detail` "That action is not allowed right now." and `nextStep` "Check the game and try again."
- [X] T019 [P] Extend `packages/game-sdk/src/lifecycle.ts` per `contracts/game-channel.md` section 2: `JsonValue`; `MatchContext.participants` (`readonly { id, label }[]` in join order) and `publish(events?)`; `ActionResult` rejected branch with optional `detail` and `nextStep`; optional `GameLifecycle.viewFor`, `onParticipantLeft` (`left | removed | expired`) and `releaseMatch`; export from `packages/game-sdk/src/index.ts`
- [X] T020 [P] Add `ART_IMAGES = ['LUDO']`, the `ArtImage` type and an optional `image` on `GameArt` in `packages/game-sdk/src/presentation.ts`, and use it in `packages/game-sdk/src/descriptor.ts`
- [X] T021 [P] Add the optional `image` (`z.enum(['LUDO'])`) to `art` in `packages/protocol/src/catalog.ts` and keep the SDK and protocol enum values identical
- [X] T022 Make `GameRegistry` in `apps/server/src/games/registry.ts` accept `art.image` only from `ART_IMAGES` and add a server unit test case for an invalid image name in `apps/server/tests/unit/catalog.test.ts` (depends on T020)
- [X] T023 Add `matchId` (string or null) and `gameSeq` (integer) to `Room` in `apps/server/src/rooms/room.ts` and initialize them (`null`, `0`) in `createRoom` in `apps/server/src/rooms/room-service.ts`
- [X] T024 Update `apps/server/src/rooms/match.ts`: create a new `matchId` UUID and reset `gameSeq` to 0 on start and rematch; pass `participants` (id and display label, in join order) and a `publish` function into `MatchContext`; call `releaseMatch` on return to the lobby, before a rematch replaces the match, and in `abort` for a closing room; add `participantLeft(room, participantId, reason, games)` that calls `onParticipantLeft` only while the match is in progress; keep the host's role out of every call (depends on T019, T023)
- [X] T025 Update `apps/server/src/rooms/room-service.ts`: add a `publishGame(roomId, events)` hook field; add `game` (`{ matchId, seq, state }` from `viewFor`) to `snapshotFor` while `matchStatus` is `IN_PROGRESS` or `ENDED`; call `matches.participantLeft` from `releaseSeat` with the reason; return the game's `detail` and `nextStep` from `submitGameAction` (depends on T017, T024)
- [X] T026 Update `apps/server/src/realtime/authorize.ts` and `apps/server/src/realtime/intents.ts`: `game.action` is allowed for HOST and PLAYER (not host-only); route it to `rooms.submitGameAction`; answer with `GAME_ACTION_REJECTED` carrying the game's `detail` and `nextStep` (defaults from T018); give `rejectionAck` an optional detail override; the action counts against the existing intent rate limit (depends on T016, T018, T025)
- [X] T027 Update `apps/server/src/http/app.ts`: set `rooms.publishGame` to call `broadcast` with, per connected recipient, a `{ v: 1, type: 'game', matchId, seq, state, events }` message built from `viewFor`, skipping a `null` view, and incrementing `room.gameSeq` once per publish (depends on T025)
- [X] T028 [P] Update `apps/server/src/rooms/lobby.ts`: in `validateSettingsChange` reject a `maxParticipants` above the selected game's `maxParticipants` with `VALIDATION_FAILED`; in `selectGame` reject with `START_BLOCKED_PARTICIPANT_COUNT` when more people hold seats than the game's maximum, otherwise lower `maxParticipants` to the game's maximum when it was higher
- [X] T029 [P] Update `apps/web/src/platform/room-state.ts`: add `game: { matchId, seq, state, events } | null` to `RoomState`; apply `game` messages and `snapshot.game` by the rules in `contracts/game-channel.md` section 1; clear it on `match.started`, `match.rematch` and `match.returnedToLobby` (depends on T017)
- [X] T030 Extend `createOnlineStubGame` in `apps/server/src/games/stub-game.ts` with `viewFor`, `publish` after an accepted action, `onParticipantLeft` and `releaseMatch` behaviour (a per-room counter view) used only by the channel tests; the existing test games keep behaving as before (depends on T019)
- [X] T031 Create `apps/web/src/features/games/registry.ts` with `OnlineGameModule` (`Settings` and `Match` components, props per `contracts/game-channel.md` section 4) and a lazy `Record<gameId, loader>`, and update `apps/web/src/features/lobby/RoomPage.tsx` to render a registered game's `Settings` instead of the generic `SettingsPanel` and its `Match` while `lobby.status` is `IN_MATCH` or `matchStatus` is `ENDED`, always keeping the member list, chat and match controls; a game without a module keeps today's behaviour (depends on T029)

### Engine foundations (`packages/ludo`)

- [X] T032 [P] Create `packages/ludo/src/board.ts`: `RING_LENGTH` = 52; `START_INDEX` Red 0, Green 13, Yellow 26, Blue 39; `STAR_INDEXES` 8, 21, 34, 47; `LANE_LENGTH` = 5; `HOME_STEP` = 56; helpers `ringIndexOf(color, step)` (steps 0 to 50: `(startIndex + step) mod 52`), `zoneOf(step)` (step "-1 base, 0 start square, 1 to 50 ring, 51 to 55 lane, 56 home"), `isProtectedRing(index)` (the four start squares and the four star squares)
- [X] T033 [P] Create `packages/ludo/src/layout.ts`: the 15 by 15 grid position of every ring index, lane square, base slot and the centre, defined once and exported for both renderers
- [X] T034 [P] Create `packages/ludo/src/seats.ts`: colour assignment and turn order per `data-model.md` (2 players Red and Yellow; 3 Red, Green and Yellow; 4 all four; join order; clockwise Red, Green, Yellow, Blue skipping unused colours; solo visitor Red with computers filling Yellow; Green and Yellow; Green, Yellow and Blue)
- [X] T035 [P] Create `packages/ludo/src/state.ts` with the types from `data-model.md`: `Color`, pawn step, `SeatState` (`color`, `kind` HUMAN or COMPUTER, `label`, `participantId?`, `pawns` "four", `away`, `missed` "0 to 3", `left`), `TurnState` (`seat`, `phase` ROLL | MOVE | ENDED, `dice` "1 to 6 or null", `sixesInRow` "0 to 2"), log entry `{ n, text, seat? }` ("the last 50"), `MatchState` and the engine event union
- [X] T036 [P] Create `packages/ludo/src/view.ts` with the `LudoView` (MATCH and WAITING) and `LudoEvent` types from `contracts/ludo-protocol.md` sections 5 and 6, and the dependency-free `parseLudoAction(value)` returning a typed action or `null` (`roll`, `move` with `payload.pawn` an integer 0 to 3, `resume`; anything else null); export all from `packages/ludo/src/index.ts`
- [X] T037 [P] Add `LUDO_TEST_DICE` to `apps/server/src/config/env.ts`: a comma-separated list of integers 1 to 6, exposed as `ludoTestDice`; refuse it when `NODE_ENV=production` regardless of `DEPLOY_TARGET`
- [X] T038 [P] Generalize the budget check in `apps/web/build/budget.ts` and `apps/web/vite.config.ts`: fail when `three` or Babylon.js code is in any non-lazy chunk; fail when the combined gzip size of the lazy chunks containing `features/ludo` or `three` exceeds "400 KB"; keep the "200 KB" initial limit; update the plugin comment accordingly

**Checkpoint**: The channel carries `game.action` and `game` messages with tests green; the stub game proves it end to end; room size follows the game; the engine's shared types, geometry and seat assignment pass their tests; the budget check knows about 3D code.

---

## Phase 3: User Story 1 - Play a full Ludo match with friends in a room (Priority: P1) 🎯 MVP

**Goal**: A host picks Ludo, creates a private room for 2 to 4, friends join, and the match is played to a winner under the classic rules with blocks, decided entirely by the server, on a clear flat board.

**Independent Test**: Create a Ludo room for 4 people, start, play to a winner; repeat with 2 and 3. Check each rule scenario with scripted dice, and confirm a roll or move out of turn, an unknown action and a client-supplied result are refused with no change.

### Tests first

- [X] T039 [P] [US1] Add `packages/ludo/tests/unit/engine-rules.test.ts` with scripted scenarios: a pawn leaves base only on a 6 and goes to step 0; a 6 gives another roll; no legal pawn passes the turn (a 6 still gives its extra roll); a pawn moves exactly the rolled number and `step + roll <= 56` is required; an unprotected ring square with exactly one opponent pawn captures it, sends it to base and gives an extra roll; start and star squares are protected and pawns of different colours share them; two or more same-seat pawns on an unprotected ring square form a block that an opponent may pass but not land on; own pawns may join their own block; lane squares never block; the third 6 in a row ends the turn with no move and `sixesInRow` resets when the turn passes; reaching home gives no extra roll; the first seat with four pawns on step 56 wins and the phase becomes ENDED; plus a property test of 2,000 seeded random matches asserting four pawns per seat, steps in range, no pawn on a block it may not occupy, and a winner at the end
- [X] T040 [P] [US1] Add `apps/server/tests/unit/ludo-view.test.ts`: the MATCH projection holds exactly the fields in `contracts/ludo-protocol.md` section 5 for a seated member; an unseated member (joined after the start or released) gets `{ kind: "WAITING" }` and nothing else; `you` is the recipient's seat index
- [X] T041 [P] [US1] Add `apps/server/tests/unit/ludo-runner.test.ts` with a fake clock and scripted dice: colours follow join order and the first seat comes from the injected random source; `roll` only on the sender's turn in phase ROLL; `move` only for a pawn in `legalPawns`; each rejection reason in `contracts/ludo-protocol.md` section 3 (`NOT_YOUR_TURN`, `NOT_PLAYING`, `ALREADY_ROLLED`, `MOVE_NOT_ALLOWED`, `MATCH_ENDED`) with its plain-language detail and next step; strict action validation (extra fields, unknown types); no roll, seed or result is ever taken from a client; a win calls `endMatch`; a fairness sample of at least 6,000 dice draws has every face between 15% and 18.5% (SC-003) and first-seat choice is spread across seats
- [X] T042 [P] [US1] Add `apps/server/tests/integration/ludo-match.test.ts` with four real WebSocket clients and scripted dice: play a full match to a winner; a roll or move out of turn and an unknown action are refused with no state change; the host holds no extra power; the same match with 2 and with 3 players uses the right colours; a rematch creates a new `matchId` with `seq` restarting at 1, assigns colours again by join order, picks a fresh random first seat, and releases the previous match's state
- [X] T043 [P] [US1] Add `apps/web/tests/unit/ludo-controls.test.tsx`: Roll is enabled only on the viewer's own turn in phase ROLL; the pawn chooser lists only legal pawns, each with a name saying the pawn, its position and what the move does (including a capture), at least 44 by 44 CSS pixels; the status line states the phase in plain words
- [X] T044 [US1] Add `LUDO_TEST_DICE` (a short scripted sequence) to the `webServer` environment in `apps/web/playwright.config.ts` and add `apps/web/tests/e2e/ludo-match.spec.ts`: four contexts create and join a Ludo room from the landing page, start, and play scripted turns with the flat renderer (a full match to a winner is covered by the T042 integration test) (`localStorage` `myarena-ludo-quality=lite`); the result is shown to everyone; a refused out-of-turn roll shows a plain explanation (depends on T037)

### Implementation: engine

- [X] T045 [US1] Implement `packages/ludo/src/engine.ts`: `createMatch`, `legalPawns(state)`, `roll(state, value)` and `move(state, pawn)` as pure functions returning a new state and engine events, following the rules in `data-model.md` (roll, legal pawn, move, extra roll, block, win), keeping a plain-language game log of the last 50 entries (labels and numbers only), exported from `packages/ludo/src/index.ts` (depends on T032 to T036)

### Implementation: server

- [X] T046 [P] [US1] Create `apps/server/src/games/ludo/settings.ts`: strict Zod schema with `theme` one of "classic, super-heroes, halloween, diwali, winter" (default `classic`) and `turnLimitSeconds` one of "0, 30, 60, 90" (default `60`); unknown keys rejected
- [X] T047 [P] [US1] Create `apps/server/src/games/ludo/dice.ts`: a `DiceSource` interface (`value()` 1 to 6, `seed()` 0 to 4294967295, `firstSeat(count)`), `cryptoDice()` using `node:crypto` `randomInt`, and `scriptedDice(values)` for tests: `value()` cycles `values`; `seed()` returns a counter-derived 32-bit value (counter times a fixed odd constant, modulo 2^32) so each roll's throw differs; `firstSeat(count)` always returns 0
- [X] T048 [P] [US1] Create `apps/server/src/games/ludo/view.ts`: per-recipient projection of the engine state into `LudoView` (MATCH for seated members with `you`, WAITING otherwise) per `contracts/ludo-protocol.md` section 5
- [X] T049 [US1] Create `apps/server/src/games/ludo/match-runner.ts`: per-room state; handles `roll`, `move` and `resume` after `parseLudoAction`; returns the rejection reasons and plain-language texts from `contracts/ludo-protocol.md` section 3; publishes `ROLLED` (value, seed, `durationMs` 2400), `MOVED`, `NO_MOVE`, `TURN` and `WON`; passes the turn after a no-move result following `NO_MOVE_PAUSE_MS` 1200; ends the match through `endMatch()` on a win (depends on T045, T047, T048)
- [X] T050 [US1] Create `apps/server/src/games/ludo/ludo-game.ts`: the `GameLifecycle` with the descriptor from `contracts/ludo-protocol.md` section 1 (`id` `ludo`, 2 to 4 players, default 4, `durationMinutes` `{ min: 20, max: 45 }`, modes `SOLO_AI` and `ONLINE`, category "Classic board", art `{ icon: TARGET, palette: CRIMSON, image: LUDO }`), `onMatchStart` (colours from `context.participants` in join order, random first seat from the dice source), `onAction`, `viewFor`, `onMatchEnd` and `releaseMatch` (depends on T046, T049)
- [X] T051 [US1] Register the Ludo game in `apps/server/src/main.ts` (always, not gated by an environment setting; use `scriptedDice(config.ludoTestDice)` when set, else `cryptoDice()`) and remove the `ludo` entry from `apps/server/src/games/roadmap.ts` (depends on T037, T050)
- [X] T052 [US1] Move the e2e checks that treat Ludo as "Coming soon" to Tambola in `apps/web/tests/e2e/a11y.spec.ts`, `apps/web/tests/e2e/keyboard.spec.ts` and `apps/web/tests/e2e/landing.spec.ts` (and the matching unit cases) so they keep testing the unavailable-tile behaviour (depends on T051)

### Implementation: web

- [X] T053 [P] [US1] Create `apps/web/src/features/ludo/view/Board2D.tsx`: an SVG board from the layout table (ring, four lanes, bases, start and star markers, centre) with pawns drawn as colour plus a distinct shape mark plus the pawn number; legal pawns highlighted and pressable with a hit area of at least 44 by 44 CSS pixels; no inline `style` attributes
- [X] T054 [P] [US1] Create `apps/web/src/features/ludo/a11y/describe.ts` with `describePawnMove` (pawn number, steps from start, roll and effect such as "move 4 to a protected star square" or "move 4 and capture Alex's pawn") and the status sentences of `contracts/ui-contract.md` section 3
- [X] T055 [P] [US1] Create `apps/web/src/features/ludo/view/StatusBar.tsx` (a polite `role="status"` line stating the phase in plain words) and `apps/web/src/features/ludo/view/Controls.tsx` (the "Roll the die" button and the "Choose a pawn" group of one button per legal pawn, each named by `describePawnMove`) (depends on T054)
- [X] T056 [US1] Create `apps/web/src/features/ludo/match/useRoomGame.ts`: parse `state.game` into the typed view, find the viewer's seat from `you`, send `{ type: 'game.action', action: { type: 'roll' } }` and `{ type: 'move', payload: { pawn } }` through `run`, and surface the plain-language rejection (depends on T031, T036)
- [X] T057 [P] [US1] Create `apps/web/src/features/ludo/view/ResultPanel.tsx` (winner and the pawns home for each seat; the room's existing rematch and back-to-lobby buttons stay in `MatchControls`) and `apps/web/src/features/ludo/view/BoardView.tsx` (renders `Board2D` for now and exposes `data-render-state` and `data-die-face` on its wrapper)
- [X] T058 [US1] Create `apps/web/src/features/ludo/match/MatchView.tsx` (presentational and driven by props: status bar, board view, controls and result panel, with no room or chat dependency) and a thin online wrapper `apps/web/src/features/ludo/match/LudoMatch.tsx` that feeds it from `useRoomGame`, and `apps/web/src/features/ludo/settings/LudoSettings.tsx` showing read-only lines "Theme" and "Turn limit" for now; export both lazily from `apps/web/src/features/ludo/index.ts` and register `ludo` in `apps/web/src/features/games/registry.ts` (depends on T053, T055, T056, T057)
- [X] T059 [P] [US1] Create `apps/web/src/styles/ludo.css` for the match layout (board sized to the smaller of the available width and height, controls below, no overflow down to 320 px wide, no inline styles) and import it in `apps/web/src/main.tsx`
- [X] T141 [US1] In `apps/web/src/features/ludo/match/LudoMatch.tsx`, render the `{ kind: "WAITING" }` view as a heading "A Ludo match is in progress" and the text "You will be able to join the next one.", with no board and the room chat still available (ui-contract section 3, spec FR-002) (depends on T058)
- [X] T142 [P] [US1] Add `apps/web/tests/e2e/ludo-late-join.spec.ts`: three players start a match in a room with limit 4; a fourth person joins afterwards and sees the waiting message and chat but no board; a `game.action` from them is refused with `NOT_PLAYING`; after the match ends and the room returns to the lobby the fourth person is included in the next match (quickstart scenario 20) (depends on T044)

**Checkpoint**: A full, server-decided Ludo match is playable and accessible on a flat board for 2, 3 and 4 players; rule scenarios and refusals are covered by automated tests.

---

## Phase 4: User Story 2 - Roll a natural, realistic 3D die (Priority: P1)

**Goal**: A lifelike die is thrown onto the board, tumbles, bounces off the surface and the board edge, and settles on exactly the decided number, identically for every viewer; no pawn can be chosen until it settles.

**Independent Test**: Roll many times with 2 or more people watching on different devices. Each roll looks different, settles within 3 seconds, shows the same face to everyone, and always matches the text and the game's number.

### Tests first

- [ ] T060 [P] [US2] Add `packages/ludo/tests/unit/dice-animation.test.ts`: for 10,000 seeds and every face, the final orientation shows the decided face up (within 1e-6) and angular speed is near zero at the end; the path stays inside the tray bounds; each throw has between 2 and 4 bounces; the sampled duration equals the requested one; the same seed gives the same path and different seeds give different paths
- [X] T061 [P] [US2] Add `apps/server/tests/unit/ludo-runner-settle.test.ts` with a fake clock: `move` during the 2400 ms window is `DIE_STILL_ROLLING`; the view's `settleMsLeft` counts down to 0; a no-move result waits for the settle window plus `NO_MOVE_PAUSE_MS` before the turn passes
- [ ] T062 [P] [US2] Add `apps/web/tests/unit/ludo-roll-playback.test.ts`: a `ROLLED` event starts playback; skipping ends it at once for this viewer only; reduced motion or effects off reveals the face immediately; a snapshot received during a roll shows the settled die with no replay; the roll is announced when it settles, not when it starts; `data-die-face` is empty while rolling and holds the number after
- [ ] T063 [US2] Add `apps/web/tests/e2e/ludo-dice.spec.ts`: three contexts watch the same roll and read the same `data-die-face` and the same text within 1 second of each other; the die settles within 3 seconds; "Skip animation" changes only the clicking viewer; a pawn cannot be chosen while the die rolls (depends on T044)

### Implementation

- [ ] T064 [US2] Implement `packages/ludo/src/dice-animation.ts`: `buildThrow(seed, face, durationMs)` returning a pure sampler `sample(t)` of position and orientation, built per research R6 (fix the final orientation with the decided face up and a seeded turn about the vertical axis, build the ballistic arc backward with two to four damped bounces off the floor and walls, compose the final orientation with a seeded spin about a slowly changing axis that decays to zero at the end); export from `packages/ludo/src/index.ts`
- [X] T065 [US2] Update `apps/server/src/games/ludo/match-runner.ts` and `view.ts`: `ROLL_ANIMATION_MS` 2400 settle window after each roll, refuse `move` with `DIE_STILL_ROLLING` until it ends, report `settleMsLeft` in the view, and start a no-move pass timer only after settling (depends on T049, T048)
- [ ] T066 [P] [US2] Create the scene infrastructure in `apps/web/src/features/ludo/scene/`: `renderer.ts` (WebGLRenderer, size from a ResizeObserver without writing `style` attributes in markup, pixel-ratio cap, soft shadow maps, tone mapping, context-loss events), `environment.ts` (built-in studio environment through a pre-filtered environment map, no file downloads), `camera.ts` (angled camera) and `loop.ts` (render only when something changes, stop while the page is hidden)
- [ ] T067 [P] [US2] Create `apps/web/src/features/ludo/scene/textures.ts` (canvas-generated wood, ivory and pip bump textures) and `apps/web/src/features/ludo/scene/die.ts` (rounded cube with a physically based ivory material with clearcoat and pips) plus `apps/web/src/features/ludo/scene/tray.ts` (a table surface with a low rim whose bounds match the throw in T064)
- [ ] T068 [US2] Create `apps/web/src/features/ludo/match/rollPlayback.ts`: a queue that turns `ROLLED` events into throws using `buildThrow`, supports "Skip animation" for the local viewer, shows the settled face at once under reduced motion or effects off, discards stale events when the page is hidden, sets `data-die-face`, and announces the result on settling (depends on T064)
- [ ] T069 [US2] Create `apps/web/src/features/ludo/view/BoardView3D.tsx` (canvas with `role="img"`, a "Preparing the board" `role="status"` placeholder, dynamic import of the scene, fallback to `Board2D` on failure) and update `BoardView.tsx` to use it when WebGL is available and the quality allows (depends on T066, T067, T068)
- [ ] T070 [P] [US2] Create `apps/web/src/features/ludo/view/Die2D.tsx` (flat die face with a still reveal, used by the lite renderer and under reduced motion) and the "Skip animation" button in `Controls.tsx`, shown only while a roll animates

**Checkpoint**: The 3D die works end to end on the angled scene and the flat renderer, the server refuses moves until the die settles, and every viewer sees the same throw.

---

## Phase 5: User Story 3 - A hyper realistic board and pawns (Priority: P2)

**Goal**: A realistic board on a table with turned 3D pawns that travel square by square, are visibly knocked back to base when captured and celebrate at home, in an angled or flat top-down view.

**Independent Test**: Start a match on a laptop and on phones; review the board, pawns, movement, capture and finish; outside reviewers rate realism and attractiveness.

### Tests first

- [ ] T071 [P] [US3] Add `apps/web/tests/unit/scene-geometry.test.ts`: the layout-to-world mapping is one-to-one for every square; the pawn travel path from step A to step B lists each square in between (base to start, ring, lane, home); the capture return path ends in the owner's base slot
- [ ] T072 [US3] Add `apps/web/tests/e2e/ludo-board.spec.ts`: the 3D canvas reaches `data-render-state="ready"` after the loading status appears; the "Top-down view" toggle changes its pressed state and keeps every chooser button working; the choice survives a reload (depends on T044)

### Implementation

- [ ] T073 [P] [US3] Create `apps/web/src/features/ludo/scene/board.ts`: a framed board with inlaid ring and lane squares, bases, start and star markers and the centre, positioned from the layout table in `packages/ludo`, with physically based materials from procedural textures and soft shadows
- [ ] T074 [P] [US3] Create `apps/web/src/features/ludo/scene/pawns.ts`: lathe-turned pawns with a per-colour topper shape (circle, triangle, square, diamond) and an engraved pawn number so colour is never the only cue
- [ ] T075 [P] [US3] Create `apps/web/src/features/ludo/scene/animations.ts`: step-by-step pawn hops along the travel path, the captured pawn knocked back to its base, and a short celebration at home; every one is skipped when effects are off or reduced motion is requested
- [ ] T076 [US3] Extend `apps/web/src/features/ludo/scene/camera.ts` with an eased angled and top-down camera, create `apps/web/src/features/ludo/view/ViewToggle.tsx` ("Top-down view" toggle button with a pressed state) and `apps/web/src/features/ludo/quality/preferences.ts` storing `myarena-ludo-view` (`angled` or `top`, default `angled`) (depends on T066)
- [ ] T077 [US3] Create `apps/web/src/features/ludo/scene/picking.ts` (pointer raycast with a hit radius of at least 44 CSS pixels on screen, sending the same `move` as the chooser button) and update `BoardView3D.tsx` to place pawns from the view, play `MOVED` events, and draw the current state without replaying past events after the page was hidden or restored (depends on T073, T074, T075, T076)

**Checkpoint**: The 3D board and pawns work in both views, the loading state is clear, and the flat SVG board is still available.

---

## Phase 6: User Story 4 - Chat with everyone in the room during the match (Priority: P2)

**Goal**: Everyone in the room can chat throughout the match without covering the board, next to a separate plain-language game log.

**Independent Test**: In a 4-player match on a laptop and phones, send messages from each device while playing; everyone sees them, the board stays usable, the log is separate, and chat never affects the game.

### Tests first

- [ ] T078 [P] [US4] Add `apps/web/tests/unit/ludo-sheets.test.tsx`: unread counts for the game log and chat while closed; opening a sheet resets its count; sending chat never sends a `game.action`
- [ ] T079 [P] [US4] Add `apps/server/tests/integration/ludo-chat.test.ts`: messages sent in the lobby remain after the match starts; chat sent during the match reaches every member within 1 second for at least 95% of messages (SC-008 sample); sending chat leaves the match state, `gameSeq` and the turn unchanged
- [ ] T080 [US4] Add `apps/web/tests/e2e/ludo-chat.spec.ts`: wide viewport shows chat beside the board with the game log above it; phone viewport shows the "Game log" and "Chat" buttons with unread counts and the board stays visible while a sheet is open (depends on T044)

### Implementation

- [ ] T081 [P] [US4] Create `apps/web/src/features/ludo/view/GameLog.tsx`: the plain-language entries from the view (rolls, moves, captures, automatic moves, departures, the result), oldest first, separate from chat
- [ ] T082 [P] [US4] Create `apps/web/src/features/ludo/match/useUnread.ts` tracking unread counts for the log and the chat against the last length seen when each was open
- [ ] T083 [US4] Create `apps/web/src/features/ludo/match/MatchLayout.tsx` (wrapping the shared `MatchView.tsx`) and extend `apps/web/src/styles/ludo.css`: at 900 px and wider a two-column grid with the board on the left and the game log above the chat on the right; narrower, the board and controls with two buttons ("Game log", "Chat") opening bottom sheets limited to about half the height, each showing its unread count; reuse `apps/web/src/features/chat/ChatPanel.tsx` unchanged; pass the room's messages and `run` to `Match` from `RoomPage.tsx` (depends on T081, T082)

**Checkpoint**: Chat and the game log work beside the board on every screen size, without touching the game channel.

---

## Phase 7: User Story 5 - Choose a theme for the room's board and pawns (Priority: P2)

**Goal**: The host picks one of five themes (Classic, Super Heroes, Halloween, Diwali, Winter Holidays) with previews, and it restyles the board, pawns, die and surroundings for everyone without touching the rules.

**Independent Test**: Start a match in each theme; the look changes while the rules, the path, the protected squares and the clarity of whose pawn is whose do not.

### Tests first

- [ ] T084 [P] [US5] Add `apps/web/tests/unit/themes.test.ts`: exactly the five theme ids "classic, super-heroes, halloween, diwali, winter" exist with name, description and a distinct palette per colour; every theme keeps the shape marks, pawn numbers and protected-square markers; adding a theme does not require changing `packages/ludo` (no import of theme data from the engine)
- [ ] T085 [P] [US5] Add `apps/web/tests/unit/ludo-settings.test.tsx`: the host sees a "Theme" radio group with a preview per theme and arrow-key navigation; non-hosts and anyone during a match see read-only lines; a server error appears in a `role="alert"`; no 3D code is imported by the lobby settings
- [ ] T086 [P] [US5] Add `apps/server/tests/unit/ludo-settings.test.ts`: `theme` accepts only the five ids and defaults to `classic`; `turnLimitSeconds` accepts only "0, 30, 60, 90" and defaults to `60`; unknown keys and wrong types are rejected; a settings change outside the lobby is refused by the platform
- [ ] T087 [US5] Add `apps/web/tests/e2e/ludo-themes.spec.ts`: the host chooses Diwali and every member sees it in the lobby; the match wrapper reports `data-theme="diwali"`; the theme cannot be changed during the match; after a rematch the host can keep or change it; axe is clean in the system, light and dark themes in the lobby (depends on T044)

### Implementation

- [ ] T088 [P] [US5] Create `apps/web/src/features/ludo/themes/themes.ts`: the five theme records (id, name, short description, palette for each colour, board, pawn and die styles, props, celebration); Super Heroes is an original look with no names, logos or likenesses from any film or comic; no code from the scene is imported here
- [ ] T089 [P] [US5] Create `apps/web/src/features/ludo/themes/ThemePreview.tsx`: a small static SVG preview drawn from a theme's palette and a pawn silhouette
- [ ] T090 [US5] Replace the read-only `LudoSettings.tsx` with the real component: the host sees the "Theme" radio group with previews (sending `settings.update` with `gameSettings.theme`) and the "Maximum participants" control bounded to 2 to 4; everyone else, or anyone during a match, sees read-only lines; errors in a `role="alert"` (depends on T088, T089)
- [ ] T091 [P] [US5] Create the 3D theme generators in `apps/web/src/features/ludo/scene/themes/`: `classic.ts` (polished wood, glass and brass pawns), `super-heroes.ts` (steel and bold primaries, original shield and star shapes), `halloween.ts` (slate, candle light, pumpkin and bat props), `diwali.ts` (brass, diyas, rangoli patterns, warm lamp light, sparkles), `winter.ts` (frosted wood and ice, snow and pine props) and `index.ts` selecting by id; each supplies board and pawn materials, the die, props, lighting tint and the celebration
- [ ] T092 [P] [US5] Theme the flat renderer through class names and CSS custom properties from the theme data in `apps/web/src/styles/ludo-themes.css` (no inline styles), keeping shape marks, numbers and markers in every theme
- [ ] T093 [US5] Pass the theme id from the view through `BoardView.tsx`, `BoardView3D.tsx` and `Board2D.tsx`, set `data-theme` on the wrapper, and have the scene build with the selected generator (depends on T091, T092)

**Checkpoint**: All five themes work in the lobby, in 3D and in the flat renderer, with unchanged rules and legibility.

---

## Phase 8: User Story 6 - Stay in the match through disconnects, timeouts, and departures (Priority: P2)

**Goal**: Disconnected players return to the exact state; turns have a host-chosen time limit with automatic play on timeout; a seat that keeps missing turns is marked away and played automatically until the person returns; departures never stall the match.

**Independent Test**: Start a 4-player match, disconnect a player on their turn, let the limit pass, reconnect them, and confirm board, turn and last roll are restored with no lost or doubled action. Then remove a player and let a seat expire; the match carries on.

### Tests first

- [ ] T094 [P] [US6] Add `packages/ludo/tests/unit/engine-seats.test.ts`: `removeSeat` removes pawns, passes the turn if it was theirs and declares the last remaining seat the winner; each timeout adds one to `missed` and the third sets `away`; `resume` and any manual action clear both; the auto choice is capture if possible, otherwise the pawn furthest along, otherwise the lowest pawn index
- [ ] T095 [P] [US6] Add `apps/server/tests/unit/ludo-runner-timers.test.ts` with a fake clock: a decision timer starts for the roll and again for the move and is cancelled when the seat acts; `0` creates no timer; a timeout rolls with the same fair die and animation and then moves after settling; `AUTO_PLAYED` is published; three timeouts mark the seat away and later decisions are played after `AUTO_PAUSE_MS` 600; `resume` and a manual action clear away; `onParticipantLeft` removes the seat; all timers are cleared at the end and on `releaseMatch`
- [ ] T096 [P] [US6] Add `apps/server/tests/integration/ludo-recovery.test.ts`: a player disconnected during their turn and during a roll returns within the window to the same board, turn, last roll and theme; a resent action is not doubled; a timeout while disconnected plays for them; an expired seat leaves the match running; one remaining seat wins; a host handoff leaves the game unchanged (SC-007 evidence)
- [ ] T097 [US6] Add `apps/web/tests/e2e/ludo-recovery.spec.ts`: take one context offline during their turn, bring it back and compare the board; with the 30 second limit let a turn time out and check the notice; use "I'm back" after being marked away (depends on T044)

### Implementation

- [ ] T098 [US6] Extend `packages/ludo/src/engine.ts` and create `packages/ludo/src/auto.ts` with `removeSeat`, `resume`, missed-turn counting (`missed` "0 to 3", `AWAY_AFTER_MISSES` 3) and `autoChoice` using the fixed preference "capture if possible, otherwise the pawn furthest along, otherwise the lowest pawn index" (depends on T045)
- [ ] T099 [US6] Extend `apps/server/src/games/ludo/match-runner.ts`: the per-decision timer from `turnLimitSeconds` using `MatchContext.clock`, `decisionMsLeft` in the view, timeout auto-play (roll, then move after settling), away handling with `AUTO_PAUSE_MS` pauses, the `AUTO_PLAYED`, `AWAY_SET`, `AWAY_CLEARED` and `SEAT_LEFT` events, and `onParticipantLeft` handling (remove the seat, pass the turn, win when one seat remains); clear every timer on end, on `releaseMatch` and on room close (depends on T065, T098)
- [ ] T100 [US6] Add the "Turn time limit" radio group (30 seconds, 60 seconds default, 90 seconds, No limit) to `apps/web/src/features/ludo/settings/LudoSettings.tsx`, sent as `gameSettings.turnLimitSeconds` (depends on T090)
- [ ] T101 [P] [US6] Add the countdown to `StatusBar.tsx` (counted down from the receipt time of `decisionMsLeft`, announced only at coarse points such as 10 and 5 seconds, never every second) and create `apps/web/src/features/ludo/view/AwayBanner.tsx` with an "I'm back" button that sends `resume`, shown only when the viewer's seat is away
- [ ] T102 [US6] Make `useRoomGame.ts` and `rollPlayback.ts` restore the exact state on reconnect without replaying past events (a snapshot or `game` message after the page was hidden or the socket reconnected draws the current state and shows the settled die) (depends on T068)

**Checkpoint**: Matches survive disconnects, time limits and departures, with evidence for SC-007.

---

## Phase 9: User Story 7 - Works well for everyone on every device (Priority: P2)

**Goal**: Ludo is playable on laptop, Android and iPhone, portrait and landscape, with keyboard, touch or mouse, assistive technology, reduced motion, colour-vision differences and weak devices; the rich visuals are a layer on a game that is always clear.

**Independent Test**: Play a match with only a keyboard, then with a screen reader, with reduced motion, on a low-powered phone, and in both orientations; nothing important depends on motion, colour or 3D.

### Tests first

- [ ] T103 [P] [US7] Add `apps/web/tests/unit/a11y-describe.test.ts`: the hidden board description lists each seat in turn order with pawns in base, on the path and home and the away and left marks; announcement text exists for turn, roll, move, capture, automatic play, away, departure and result; at most one announcement per state change; the roll is announced on settling
- [ ] T104 [P] [US7] Add `apps/web/tests/unit/quality.test.ts`: automatic selection from device hints, a manual choice always wins, a drop of one level after about 2 seconds over the frame budget, never an automatic upgrade, `myarena-ludo-quality` persists `auto`, `high`, `standard` or `lite`, missing WebGL selects lite, and a lost context is restored once and then falls back to lite with the notice
- [ ] T105 [US7] Add `apps/web/tests/e2e/ludo-a11y.spec.ts`: axe clean in the system, light and dark themes during a match; a full match with only the keyboard where focus moves to Roll or the first chooser button only when the viewer's own decision starts and never otherwise; with reduced motion no tumbling or travel and `data-die-face` is set at once; no horizontal overflow at 320 px and at 200% text in both orientations; chooser buttons and board hit areas at least 44 by 44 CSS pixels (depends on T044)
- [ ] T106 [US7] Add `apps/web/tests/e2e/ludo-quality.spec.ts`: the Lite quality shows the same information and rules with the flat board; quality can be changed at any time; with WebGL disabled or the scene failing, the flat board takes over with the notice "Switched to the simpler board so you can keep playing" (depends on T044)

### Implementation

- [ ] T107 [US7] Extend `apps/web/src/features/ludo/a11y/describe.ts` with the board description and announcement strings of `contracts/ui-contract.md` section 5, create `apps/web/src/features/ludo/view/BoardDescription.tsx` (visually hidden list, updated with every state change) and `apps/web/src/features/ludo/match/useAnnouncements.ts` (one polite message per change, queued, using `apps/web/src/a11y/announcer.tsx`)
- [ ] T108 [US7] Add focus management to `MatchView.tsx`: move focus to Roll when the viewer's own roll starts, to the first pawn button when their move starts, and to the result heading at the end; never move focus for anyone else's turn
- [ ] T109 [P] [US7] Create `apps/web/src/features/ludo/quality/quality.ts` (device hints: memory, cores, pixel ratio, coarse pointer, WebGL availability; the tier settings for shadow size, pixel-ratio cap, clearcoat and props; persisted `myarena-ludo-quality`) and `apps/web/src/features/ludo/quality/QualityMenu.tsx` (radio group Automatic, High, Standard, Lite, applying at once)
- [ ] T110 [P] [US7] Create `apps/web/src/features/ludo/quality/adaptive.ts` (frame-time monitor that drops one level after about 2 seconds over a 33 ms budget and never upgrades) and wire it into `scene/loop.ts` (depends on T109)
- [ ] T111 [US7] Handle WebGL context loss in `BoardView3D.tsx`: restore once, otherwise switch to the flat renderer with a one-time notice; select the flat renderer for lite quality and when WebGL is missing (depends on T109)
- [ ] T112 [P] [US7] Create `apps/web/src/features/ludo/match/useMotion.ts` combining `prefersReducedMotion()` and the platform effects preference, and make `rollPlayback.ts`, `animations.ts` and the camera use it: with reduced motion or effects off there is no tumbling, camera movement, pawn travel or celebration and nothing depends on motion
- [ ] T113 [US7] Finish the responsive behaviour in `apps/web/src/styles/ludo.css`: the whole board fits down to 320 px wide, safe-area padding, re-layout on rotation, targets of at least 44 by 44 CSS pixels, readable at 200% text; rendering pauses while the page is hidden and draws the current state when visible again (depends on T083)

**Checkpoint**: The match is fully playable and announced without a pointer, without motion and without WebGL; automated evidence is in place for the device matrix.

---

## Phase 10: User Story 8 - Play alone against the computer (Priority: P2)

**Goal**: From "Play against AI", a visitor plays a full match against 1 to 3 computer opponents at easy, normal or hard, with no room or account, under the same rules, dice, themes and accessibility.

**Independent Test**: From the landing page choose Ludo then "Play against AI", play to the end with 1 opponent and with 3, at each difficulty. No room or invitation exists, the computer never breaks a rule, and its turns do not drag.

### Tests first

- [ ] T114 [P] [US8] Add `packages/ludo/tests/unit/strategies.test.ts`: easy chooses uniformly among legal pawns; normal scores capture +100, reaching home +80, leaving base +60, entering a home lane +40, landing on a protected square +25, forming a block on an unprotected square +10, plus 1 per step of progress; hard subtracts 60 for an exposed landing square (ring, unprotected, not its own block, an opponent pawn 1 to 6 steps behind) and adds 30 for moving a pawn that currently stands on such a square; ties go to the highest step then the lowest index; across 5,000 generated positions a strategy never returns an illegal pawn and never touches a die value; hard beats easy in at least 60% of 400 seeded one-on-one matches (SC-015 support)
- [ ] T115 [P] [US8] Add `apps/web/tests/unit/ludo-solo-runner.test.ts`: the visitor is Red; the computers take the colours in `seats.ts`; a computer turn uses a pause of 700 to 1500 ms and at most 3 s in total excluding the roll animation (SC-014); every computer roll and move is logged; there is no chat, turn limit or away handling; "Play again" restarts with the same settings; the saved match restores exactly, is discarded 30 minutes after `savedAt`, and "Leave match" discards it at once
- [ ] T116 [US8] Add `apps/web/tests/e2e/ludo-solo.spec.ts`: from the landing page "Play against AI" opens the setup without creating a room or invitation; start with each difficulty; a refresh restores the match; the end screen offers "Play again" and "Back to games"; chat is not offered (depends on T044)

### Implementation

- [ ] T117 [US8] Create `packages/ludo/src/strategies.ts`: `chooseMove(state, difficulty, random)` implementing easy, normal and hard with the weights documented in `data-model.md`, exported from `packages/ludo/src/index.ts` (depends on T045)
- [ ] T118 [P] [US8] Create `apps/web/src/features/ludo/solo/soloStorage.ts`: keys `myarena-ludo-solo` (`{ savedAt, settings, state }`, discarded 30 minutes after `savedAt`, under about 10 KB) and `myarena-ludo-solo-setup` (`{ opponents, difficulty, theme }`); tolerate missing, invalid or blocked storage
- [ ] T119 [US8] Confirm `apps/web/src/features/ludo/match/MatchView.tsx` has no import of `useRoomGame`, room state or chat, and add `apps/web/tests/unit/match-view-solo.test.tsx` rendering it with a solo-shaped view (computer seats, no countdown or away banner) so online and solo share it (depends on T058, T083)
- [ ] T120 [US8] Create `apps/web/src/features/ludo/solo/soloRunner.ts`: drives the engine with `crypto.getRandomValues` dice and seeds and a random first seat, plays computer turns with the 700 to 1500 ms pause and the 2400 ms roll, emits the same events as the server so `rollPlayback.ts` and `animations.ts` are reused, and saves after every change (depends on T117, T118)
- [ ] T121 [P] [US8] Create `apps/web/src/features/ludo/solo/SoloSetup.tsx`: "Opponents" radio group (1, 2, 3), "Difficulty" radio group (Easy, Normal default, Hard), the theme picker from `settings/LudoSettings.tsx`, "Start game" and a "Back to games" link; remembers the last choices
- [ ] T122 [US8] Create `apps/web/src/features/ludo/solo/LudoSolo.tsx` (setup, then `MatchView` with no chat, countdown or away banner, then an end screen with "Play again" and "Back to games", a "Leave match" action, restore on open) and register it as the `ludo` loader in `apps/web/src/features/solo/registry.ts` (depends on T119, T120, T121)

**Checkpoint**: Solo play works end to end, locally and device-only, and shares every visual and accessibility feature with the online match.

---

## Phase 11: User Story 9 - Recognize Ludo at a glance on the games page (Priority: P2)

**Goal**: The Ludo tile and the options header show an attractive picture that clearly says "Ludo", without slowing the page or hiding the text, with the old icon art as the fallback.

**Independent Test**: Open the landing page on a laptop and phones in light and dark modes, on a fast and a slow connection. The picture is sharp, the text stays readable and the page stays quick; with the picture blocked the tile still looks complete.

### Tests first

- [X] T123 [P] [US9] Add `apps/web/tests/unit/art-image.test.tsx`: `GameArt` renders an `<img alt="">` in a fixed-aspect banner for `art.image = LUDO`; an `error` event swaps in the icon art; entries without `image` render exactly as in 002; the options header uses the small size; the tile's accessible name still comes from title, status and details and does not include the picture
- [X] T124 [P] [US9] Add `apps/server/tests/contract/catalog-art.contract.test.ts`: `GET /api/catalog` returns the Ludo entry as `PLAYABLE` with `art.image` `LUDO` and `modes` `SOLO_AI` and `ONLINE`, validated against the merged contract including `catalog-art-image.openapi.yaml`; no roadmap duplicate of `ludo` exists (depends on T006, T051)
- [X] T125 [US9] Add `apps/web/tests/e2e/ludo-tile.spec.ts`: the picture is visible and `naturalWidth` is above 0; the tile's box does not change when the picture arrives; with the image request delayed the text and details are visible first; with the image request blocked the icon art shows and no broken-image icon appears; axe is clean in light and dark; no overflow at 320 px; the tile's accessible name has no picture text (depends on T044)

### Implementation

- [X] T126 [P] [US9] Create the original illustration `apps/web/src/assets/ludo-tile.svg`: a four-colour Ludo board with pawns and a die on its own rounded card background, a fixed `viewBox`, no scripts, no external references or fonts, at most "100 KB", looking good on light and dark surfaces
- [X] T127 [US9] Create `apps/web/src/features/landing/art-images.ts` mapping `LUDO` to the imported asset URL, update `GameArt.tsx` to render the `<img>` banner (empty `alt`, decoded asynchronously, `error` swaps in the icon art), `GameTile.tsx` for the banner area at the top of the tile, `PlayOptions.tsx` for the small header image, and `apps/web/src/features/landing/landing.css` and `apps/web/src/styles/art.css` for the fixed aspect ratio and both colour modes (no inline styles) (depends on T126)
- [X] T128 [US9] Add a picture-size check to the bundle-budget plugin in `apps/web/vite.config.ts`: fail the build when an emitted asset named `ludo-tile*` exceeds "100 KB" (depends on T038, T126)

**Checkpoint**: The Ludo tile is attractive and fast, falls back cleanly, and the page meets its 002 loading target.

---

## Phase 12: Polish and Cross-Cutting Concerns

**Purpose**: Evidence, observability, load testing and the manual acceptance that automation cannot provide

- [ ] T129 [P] Add match lifecycle logging: an optional `onMatchLifecycle` callback in `apps/server/src/rooms/match.ts`, wired in `apps/server/src/http/app.ts` to the request logger, recording only start, end, seat count and duration; add `apps/server/tests/unit/ludo-logging.test.ts` asserting that log output never contains display names, roll values, board state, chat text or tokens
- [ ] T130 [P] Add a four-bot Ludo scenario to the load harness in `tools/load/src/ludo-bots.ts` (bots play full matches through the engine over real sockets at the platform's room capacity) and document it in the harness readme; report action latency and errors (quickstart scenario 27, SC-004 and SC-008 evidence)
- [ ] T131 [P] Add a short security review for this feature in `specs/003-ludo-game/acceptance/security-review.md` covering: server-only dice, seed and first player; strict action and settings validation; rate limiting; rejected actions changing nothing; the test-dice guard in production; no secrets or personal data in logs or storage; CSP unchanged; `WAITING` members receiving no board
- [ ] T132 Copy the acceptance template from `specs/002-games-landing-page/acceptance/TEMPLATE.md` to `specs/003-ludo-game/acceptance/TEMPLATE.md` and create `specs/003-ludo-game/acceptance/automated-results.md` listing the automated command, date and result for each success criterion with automated evidence (SC-002, SC-003, SC-004, SC-007, SC-008, SC-014 and the budget and picture checks)
- [ ] T133 [P] Add cross-reference notes: in `specs/002-games-landing-page/research.md` (tile art may now be a named shipped picture, see 003 R14) and in `specs/001-base-platform-experience/research.md` R9 (3D engine for Ludo is Three.js, see 003 R7)
- [ ] T134 Run `npm run lint`, `npm run format:check`, `npm test`, `npm run test:integration`, `npm run test:contract`, `npm run test:e2e` and `npm run build` with Node 24 from a clean install, confirm the 001 and 002 suites still pass, and record the outputs in `specs/003-ludo-game/acceptance/automated-results.md`
- [ ] T135 Verify the build budgets in the output of `npm run build`: initial JavaScript at or below "200 KB" gzipped, no 3D engine in the initial bundle, the Ludo lazy chunks together at or below "400 KB" gzipped, the tile picture at or below "100 KB"; record the numbers in `specs/003-ludo-game/acceptance/automated-results.md` (quickstart scenario 25)
- [ ] T136 Confirm a clean clone builds and starts on the Render settings (build command `npm ci --include=dev && npm run build`, start command `npm start`) with `LUDO_TEST_DICE` unset, and that start-up is refused when it is set with `NODE_ENV=production` (quickstart scenario 26)
- [ ] T137 [P] Add a short "Ludo" section to the project readme or `specs/003-ludo-game/quickstart.md` notes describing `LUDO_TEST_DICE` (test only, refused in production) so testers know it exists

### Manual evidence (cannot be satisfied by automation or emulation)

- [ ] T138 Run the real-device matrix of FR-038 on a laptop, an Android phone and an iPhone as host and as player in mixed-device rooms: 2, 3 and 4 player matches, a solo match at each difficulty, every theme once, reduced motion, keyboard-only, screen reader, colour-vision-difference simulation and lite quality; record each cell with device, OS, browser and version, tester, date and result in `specs/003-ludo-game/acceptance/` (SC-012, quickstart scenario 28)
- [ ] T139 Measure frame rate and start-up on the acceptance phones at the automatic quality: at least 30 frames per second for 95% of a 4-player match and a match screen ready within 5 seconds for 95% of starts on a typical mobile connection; record in `specs/003-ludo-game/acceptance/` (SC-006, quickstart scenario 24)
- [ ] T140 Run the outside review sessions and record the results in `specs/003-ludo-game/acceptance/`: friends groups completing a first roll and move within 1 minute (SC-001), at least 8 reviewers rating dice and board realism per theme at least 4 out of 5 (SC-005), first-time solo starts within 30 seconds (SC-013), easy versus hard (SC-015), a colour-vision-difference review of every theme (SC-009) and the tile picture rating in light and dark (SC-016); if SC-005 falls short, record the decision on the self-hosted model escape hatch (research R7)

---

## Dependencies and Execution Order

### Phase dependencies

- **Setup (Phase 1)**: no dependencies; T003 needs T002.
- **Foundational (Phase 2)**: needs Phase 1; blocks every story. Within it, tests first, then the platform channel (T016 to T031), with the engine foundations (T032 to T038) in parallel with it.
- **US1 (Phase 3)**: needs Phase 2. It is the MVP.
- **US2 (Phase 4)**: needs US1 (the runner and match screen).
- **US3 (Phase 5)**: needs US2 (the scene infrastructure and tray).
- **US4 (Phase 6)**: needs US1; independent of US2 and US3 apart from sharing `ludo.css`.
- **US5 (Phase 7)**: needs US1 for the settings component and US3 for the 3D theme generators.
- **US6 (Phase 8)**: needs US1 and US2 (the settle window); the settings group needs US5's component.
- **US7 (Phase 9)**: needs US2 and US3 for quality and context handling, and US4 for the layout in T113.
- **US8 (Phase 10)**: needs US1 and the engine; the visuals reuse US2, US3 and US5.
- **US9 (Phase 11)**: needs only Phase 2 and the Ludo registration (T051); it can run in parallel with every other story.
- **Polish (Phase 12)**: needs the stories it records evidence for; the manual tasks need a deployed build.

### Within a story

Tests first (confirm they fail), then engine, then server, then web. Files shared by several stories are edited in story order: `match-runner.ts` (US1, US2, US6), `LudoSettings.tsx` (US1, US5, US6), `StatusBar.tsx` (US1, US6), `BoardView3D.tsx` (US2, US3, US5, US7), `ludo.css` (US1, US4, US7).

### Parallel opportunities

- Phase 2: the test tasks T005 to T015 touch different files; the engine foundations T032 to T038 are independent of the platform channel.
- US1: T039 to T043 (tests), T046 to T048 (server modules), T053, T054, T055, T057 and T059 (web pieces) can each run in parallel.
- After US1: US4, US6 (server and engine parts) and US9 can run in parallel with US2.
- US3: T073, T074 and T075 are separate scene files.
- US5: T088, T089, T091 and T092 are separate files.
- US7: T109, T110 and T112 are separate files.
- Polish: T129 to T133 and T137 are independent.

### Parallel example: User Story 1

```text
Together: T039 (engine rule tests), T040 (view tests), T041 (runner tests), T042 (integration), T043 (web controls tests)
Then together: T046 (settings), T047 (dice), T048 (view projection)
Then together: T053 (Board2D), T054 (describe), T057 (Result and BoardView), T059 (CSS)
```

---

## Implementation Strategy

### MVP first (Phase 1, Phase 2, US1)

1. Finish Setup and Foundational; run the channel tests green.
2. Finish US1 and stop to validate: a 4-player match to a winner on the flat board, every rule scenario and every refusal. This is a complete, accessible, server-authoritative Ludo.
3. Deploy to a preview and try it with friends before adding visuals.

### Incremental delivery

1. US2 (the die and the scene infrastructure), then US3 (board and pawns): the headline visuals.
2. US4 and US6 in parallel: chat layout and reliability.
3. US5 themes, then US7 accessibility and quality tiers.
4. US8 solo play, then US9 the tile picture (which can ship at any point after Phase 2).
5. Polish, then the manual evidence tasks on real devices and with outside reviewers.

### Notes

- US9 is a small, self-contained win that can be shipped early without waiting for the match.
- If the review at the end of US3 shows realism below 4 out of 5, decide on the self-hosted model escape hatch (research R7) before investing in the other themes' props.
- Keep the 3D engine and all scene code in lazy chunks; the generalized budget check (T038) fails the build otherwise.

---

## Requirement Traceability

| Requirement | Tasks |
|-------------|-------|
| FR-001, FR-003 | T034, T050, T051 |
| FR-002 | T008, T028, T040, T041, T141, T142 |
| FR-004 | T090, T100 |
| FR-005 | T039, T045 |
| FR-006, FR-007 | T041, T047, T049 |
| FR-008, FR-009, FR-012 | T042, T048, T057 |
| FR-010, FR-011 | T094 to T102 |
| FR-013 to FR-016 | T060 to T070 |
| FR-017 to FR-020 | T071 to T077 |
| FR-021 to FR-025 | T084 to T093 |
| FR-026 | T104, T106, T109 to T111 |
| FR-027 to FR-030 | T078 to T083 |
| FR-031 to FR-036 | T103 to T113 |
| FR-037 | T007 |
| FR-038 | T138 |
| FR-039 to FR-046 | T114 to T122 |
| FR-047 to FR-050 | T123 to T128 |
| SC-001, SC-005, SC-013, SC-015, SC-016 | T140 |
| SC-002, SC-003 | T039, T041, T042 |
| SC-004 | T060, T063, T130 |
| SC-006 | T139 |
| SC-007 | T096 |
| SC-008 | T079, T130 |
| SC-009 | T084, T138, T140 |
| SC-010, SC-011 | T105, T106, T138 |
| SC-012 | T138 |
| SC-014 | T114, T115 |
