# Tasks: Secure Host Access and Room Entry

**Input**: Design documents from `specs/008-secure-host-room-entry/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: No new standalone test suite is requested. Extend the existing focused smoke script and use the manual browser/Render checks in `quickstart.md`.

**Organization**: Tasks are grouped by user story so each priority can be implemented, verified, and delivered independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Runs in parallel with other `[P]` tasks in the same phase when different files are involved
- **[Story]**: Maps to a user story (`US1`, `US2`, `US3`)
- Every task includes an exact repository-relative file path

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish the feature evidence file and a verified baseline before changing room behavior.

- [X] T001 Create `specs/008-secure-host-room-entry/verification.md` with scenario, prerequisite, expected result, observed result, status, and evidence-path fields for quickstart V1-V11
- [X] T002 Run the existing `npm run build` and `npm run smoke` commands, record the baseline outcome in `specs/008-secure-host-room-entry/verification.md`, and stop if either fails before feature work begins

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared protocol, error, signing, and route primitives required before any story can complete.

- [X] T003 Update `shared/src/protocol.ts` to add `HOST_ENTRY_REQUIRED` to `ErrorCode`, `host_left` to `ClosedReason`, and an optional `gameId` on `JoinRoomPayload` while preserving existing acknowledgements and event names
- [X] T004 Update `shared/src/limits.ts` to set `ROOM_ID_LENGTH` to exactly six and retain the `23456789ABCDEFGHJKMNPQRSTUVWXYZ` alphabet, with a clear comment that the stored room code is unique among live rooms
- [X] T005 [P] Create `server/src/sockets/entryCapability.ts` with process-local signing, issue, cookie parsing, expiry of at most 12 hours, and verification for the exact role `host` while keeping the payload and signature inaccessible to client code
- [X] T006 [P] Update `client/vite.config.ts` to proxy the exact `/host` development request to Express, preserve Vite's `/socket.io` proxy, and make Express relay Vite's transformed root HTML with the host cookie rather than serving `client/dist`
- [X] T007 Update `shared/src/protocol.ts` so `formatRoomCode` returns one contiguous uppercase six-character code and `normalizeRoomCode` removes spaces and dashes, converts letters to uppercase, and rejects inputs that cannot normalize to six characters from the room alphabet

**Checkpoint**: Shared contracts and the route-bound entry capability helper are ready. User Story 1 can begin; User Story 2 remains dependent on T003-T004 and T007.

---

## Phase 3: User Story 1 - Separate Host and Player Entry (Priority: P1) 🎯 MVP

**Goal**: A server-handled `/host` GET grants a room-creation capability, while `/`, invite URLs, and fresh room joiners cannot gain host authority.

**Independent Test**: In a fresh browser, verify `room:create` without first navigating to `/host` returns `HOST_ENTRY_REQUIRED`; visit `/host`, create a room, join from a second browser, switch between player and host routes, and verify fresh invite/code joiners cannot call host actions or become host when the creator leaves.

### Server authorization and room host lifecycle

- [X] T008 [P] [US1] Handle production `GET /host` in `server/src/app.ts`, serve the built SPA response, and set an HttpOnly, `Path=/`, `SameSite=Lax` capability cookie that is `Secure` in production; do not add a standalone capability API and keep development HTML serving with Vite per T006
- [X] T009 [US1] Instantiate one entry-capability issuer/verifier in `server/src/index.ts`, pass it to `buildApp` and `createRealtime`, and keep the process-local secret outside configuration and source control
- [X] T010 [US1] Extend `SocketData` in `server/src/sockets/registerHandlers.ts` to derive `entryCapability` from the `/host` handshake cookie and reject `room:create` with `HOST_ENTRY_REQUIRED` when the capability is missing, expired, invalid, or from an old process
- [X] T011 [US1] Add a private `hostEligible` boolean to participants in `server/src/rooms/room.ts`; initialize authorized room creators as `true`, bots and every fresh join as `false`, preserve it only during resume, and never project it in `RoomState`
- [X] T012 [US1] Update `RoomStore.create` and `Room.seedCreator` in `server/src/rooms/roomStore.ts` and `server/src/rooms/room.ts` so only a successfully authorized creation makes the creator the host and marks that participant host-eligible
- [X] T013 [US1] Update `room:join` in `server/src/sockets/registerHandlers.ts` and `Room.join` in `server/src/rooms/room.ts` so a fresh join never derives host eligibility from a current `/host` cookie, while an existing participant resume preserves its stored host role and eligibility
- [X] T014 [US1] Change host release behavior in `server/src/rooms/room.ts` to allow the existing host to resume before the seat-release deadline, then close the room with `host_left` after release; never hand host authority to an ordinary code or invite joiner
- [X] T015 [US1] Keep `requireHost` authoritative in `server/src/rooms/room.ts` and ensure existing start, capacity, kick, fill-AI, reset, and host-semantic game actions continue to reject unauthorized sockets with `NOT_HOST`

### Client host and player entry

- [X] T016 [P] [US1] Add an explicit `/host` route and player fallback route behavior in `client/src/App.tsx`, passing `entryMode` into `HubPage` and ensuring wildcard routes remain player-facing
- [X] T017 [US1] Refactor `client/src/routes/HubPage.tsx` so host mode presents room creation after the server-hosted route loads, while player mode never presents room creation or a `/host` link
- [X] T018 [P] [US1] Update `client/src/components/hub/Header.tsx` to show a persistent `Host` or `Player` role label without implying that `/host` verifies a personal identity
- [X] T019 [US1] Update `client/src/components/hub/GameGrid.tsx` to support host-launch and player-showcase modes and prevent player-mode cards from invoking `onPlay`
- [X] T020 [US1] Update `client/src/components/hub/GameCard.tsx` to keep saturated game art in both modes, use create-room calls to action only in host mode, and show a player-safe invitation explanation in player mode
- [X] T021 [US1] Update `client/src/components/launch/LaunchModal.tsx` so it cannot launch unless explicit host mode is supplied; leave existing game choices and capacities unchanged

### US1 integration and verification

- [X] T022 [P] [US1] Map `host_left` to a clear ended-room state and Hub action in `client/src/state/roomStore.ts` and `client/src/components/room/RoomStatusScreen.tsx` without treating the next player as host
- [X] T023 [US1] Extend `server/scripts/smoke.ts` with focused scenarios for unauthorised create, server-route-authorized create, ordinary-player host-action refusal, fresh join remaining ineligible despite a host cookie, host-left closure, and host reconnect preservation
- [X] T024 [US1] Execute quickstart V1, V4, V5, and V10 locally, including a clean `npm run dev` check where Vite serves `/host` from its own development index while forwarding the Express cookie; record route-switch, issuance, resume, closure, and direct-action evidence in `specs/008-secure-host-room-entry/verification.md`

**Checkpoint**: `/host` can create rooms under server enforcement, player and invite routes have no host controls, fresh joins never inherit room host eligibility, and creator departure closes the room safely. This is the MVP.

---

## Phase 4: User Story 2 - Join a Private Room by Code or Shared URL (Priority: P2)

**Goal**: A player can join an active game by a six-character uppercase alphanumeric code from the Hub or by the existing shared URL, with safe inline errors and equivalent invite surfaces.

**Independent Test**: Create a room from `/host`, join it from `/` using only its code, join it in another browser from its shared URL, verify both paths resolve the same room, and verify malformed, missing, expired, suspended, full, started, or closed codes remain recoverable on the Hub.

### Server code-only join

- [X] T025 [US2] Update `server/src/rooms/roomStore.ts` to allocate six-character codes, collision-check them against live rooms, and resolve a room by code alone without creating a second identifier
- [X] T026 [US2] Update `server/src/sockets/schemas.ts` so `gameId` is optional for `room:join`, `roomId` allows normalized six-character input only, and unknown payload fields remain rejected
- [X] T027 [US2] Update `server/src/sockets/registerHandlers.ts` to resolve `room:join` by normalized code alone when `gameId` is absent, by code plus game when present, and return the room's authoritative `gameId` in the existing `JoinedData`
- [X] T028 [US2] Map expired and suspended room references to the existing safe `ROOM_NOT_FOUND` behavior in `server/src/sockets/registerHandlers.ts` and `server/src/rooms/room.ts`, while preserving `ROOM_FULL`, `MATCH_IN_PROGRESS`, `REMOVED_COOLDOWN`, `GAME_UNAVAILABLE`, `RATE_LIMITED`, and `INVALID_PAYLOAD`

### Client code entry and navigation

- [X] T029 [US2] Add a code-only join result API in `client/src/state/roomStore.ts` that applies the successful authoritative snapshot, returns a user-safe error without switching the Hub to a terminal status screen, and exposes the resolved `gameId`
- [X] T030 [US2] Create `client/src/components/hub/JoinRoomPanel.tsx` with the label `Private room code`, exactly six visible character positions, uppercase normalization, lower-case acceptance, surrounding-space tolerance, Enter-to-submit, loading state, inline error, retry, and retained input after failure
- [X] T031 [US2] Integrate `client/src/components/hub/JoinRoomPanel.tsx` into player mode in `client/src/routes/HubPage.tsx` and navigate only successful joins to `/room/{resolvedGameId}/{canonicalRoomCode}`
- [X] T032 [US2] Keep direct invite joins in `client/src/routes/RoomPage.tsx` and `client/src/components/room/JoinGate.tsx` game-qualified, ensure the canonical six-character code is displayed, and preserve refresh/resume behavior for existing guests
- [X] T033 [US2] Add code-join client error mapping in `client/src/state/roomStore.ts` so malformed, missing, expired, suspended, full, started, removed, closed, busy, and rate-limited states produce corrective messages beside the field rather than losing the Hub

### Invite representation

- [X] T034 [US2] Refactor `client/src/components/room/InviteBar.tsx` to accept the authoritative room code and invite path, display the code prominently, render the full URL in a selectable field, and provide separate `Copy code` and `Copy invite link` actions with clipboard/manual-copy fallbacks
- [X] T035 [P] [US2] Update generic invite use in `client/src/components/room/Lobby.tsx` and `client/src/components/room/RoomShell.tsx` so default rooms use the refactored `InviteBar` without adding game-specific joining
- [X] T036 [P] [US2] Replace custom match-header invite buttons in `client/src/games/ludo/LudoScreen.tsx` and `client/src/games/uno/UnoScreen.tsx` with the shared `InviteBar` code/link contract while preserving their compact header layouts
- [X] T037 [P] [US2] Verify and adjust `client/src/games/ludo/MatchDialogs.tsx`, `client/src/games/housie/HousieLobby.tsx`, and `client/src/games/bingo/BingoLobby.tsx` so each passes the authoritative room code and invite path to `InviteBar`

### US2 verification

- [X] T038 [US2] Extend `server/scripts/smoke.ts` with six-character format/uniqueness, normalized lower-case/space/dash lookup, code-only join resolution, wrong-game rejection, and expired/suspended/missing/full/in-progress join failure scenarios
- [ ] T039 [US2] Execute quickstart V2, V3, V6, and V7, including active Ludo and UNO custom screens, and record copied-code/link checks plus recoverable Hub errors in `specs/008-secure-host-room-entry/verification.md`

**Checkpoint**: A player can join by a room code or invite URL, the Hub retains errors, and host/custom/default game surfaces expose equivalent code and URL representations.

---

## Phase 5: User Story 3 - Present a High-Energy Arrival and Play Experience (Priority: P3)

**Goal**: Host and player landings plus Ludo, Housie, Bingo, and UNO share a vivid platform atmosphere while state clarity, responsiveness, keyboard access, touch, and reduced motion remain intact.

**Independent Test**: Inspect `/host`, `/`, invite joining, and each supported game at the quickstart device matrix; verify primary actions are identifiable, decorative motion never controls state, no controls are clipped, and normal/reduced-motion states remain understandable.

### Shared atmosphere and role surfaces

- [X] T040 [P] [US3] Create `client/src/components/common/ArenaAtmosphere.tsx` as `aria-hidden`, `pointer-events: none` decoration with `host`, `player`, and `room` variants derived only from route/authoritative room game accents
- [X] T041 [US3] Mount one `ArenaAtmosphere` instance in `client/src/App.tsx`, provide role/game accent state to it, and keep it outside room/game event and game-state authority
- [X] T042 [P] [US3] Extend `client/src/styles/tokens.css` with role accents and shared high-energy surface, glow, depth, and safe-area tokens without changing existing game colors
- [X] T043 [P] [US3] Add atmosphere reveal, shimmer, drift, and active-glow effects in `client/src/styles/animations.css`, with equivalent static borders and labels when `prefers-reduced-motion: reduce`
- [X] T044 [US3] Redesign host and player landing layout in `client/src/styles/hub.css` so the host launch grid and player code-entry panel use saturated accents, distinct role identity, clear hierarchy, and responsive phone/tablet/desktop layouts
- [X] T045 [US3] Refine the role-aware visuals in `client/src/components/hub/Header.tsx`, `client/src/components/hub/GameGrid.tsx`, and `client/src/components/hub/GameCard.tsx` so primary actions are visually obvious without obscuring profile, audio, or code entry
- [X] T046 [US3] Style the six-character code input, inline error, submit button, loading state, and focus treatment in `client/src/components/hub/JoinRoomPanel.tsx` and `client/src/styles/hub.css`

### Room and game energy

- [X] T047 [US3] Refine `client/src/styles/room.css` to integrate the shared atmosphere, larger room code treatment, separate invite actions, saturated active-turn/host states, and non-overlapping responsive room shell layouts
- [X] T048 [P] [US3] Strengthen platform-compatible active-state, result, and board-edge energy treatments in `client/src/games/ludo/ludo.css` while preserving server-authoritative dice, turn, token, and result timing
- [X] T049 [P] [US3] Strengthen ticket, caller, active-call, and result energy treatments in `client/src/games/housie/housie.css` without changing ticket selection or claims
- [X] T050 [P] [US3] Strengthen card, caller, active-card, and result energy treatments in `client/src/games/bingo/bingo.css` without changing mark or bingo authority
- [X] T051 [P] [US3] Strengthen table, hand, active-seat, and result energy treatments in `client/src/games/uno/uno.css` without moving card, turn, or winner state ahead of server events
- [X] T052 [US3] Verify and adjust every new animation in `client/src/styles/animations.css`, `client/src/styles/hub.css`, and `client/src/styles/room.css` so reduced-motion mode communicates the same host/player, code, active-turn, movement, and result states without decorative motion

### US3 accessibility and visual verification

- [ ] T053 [US3] Run quickstart V8 and V9 at 320x568, 390x844, 640x360, 844x390, 768x1024, 1024x768, 1366x768, 1920x1080, and 2560x1440 and record no clipping, overlap, unintended scrolling, hidden controls, or unresolved focus/touch failures in `specs/008-secure-host-room-entry/verification.md`
- [ ] T054 [US3] Capture host, player, Ludo, Housie, Bingo, and UNO screenshots for normal and reduced motion under `specs/008-secure-host-room-entry/evidence/` and link each scenario from `specs/008-secure-host-room-entry/verification.md`
- [ ] T055 [US3] Confirm with representative reviewers that at least 90% identify primary actions within 10 seconds and at least 80% rate the experience energetic; record the sample and outcome in `specs/008-secure-host-room-entry/verification.md`

**Checkpoint**: Both landing experiences and all supported game screens have a consistent energetic identity with responsive, accessible, reduced-motion-safe behavior.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Complete regression validation, deployment checks, and feature evidence across all stories.

- [X] T056 Run `npm run build` and `npm run smoke`, then record pass/fail, changed smoke scenarios, and any follow-up in `specs/008-secure-host-room-entry/verification.md`
- [X] T057 Review `client/src/App.tsx`, `client/src/routes/HubPage.tsx`, `client/src/components/hub/`, and `client/src/components/room/` to confirm the player experience contains no `/host` link, room-create action, public capability request, or client-supplied host claim
- [X] T058 Review `server/src/sockets/entryCapability.ts`, `server/src/app.ts`, `server/src/sockets/registerHandlers.ts`, and `server/src/rooms/room.ts` to confirm `/host` alone issues the HttpOnly capability, fresh joins remain host-ineligible, room actions remain authoritative, and no secret or user-identifying data is logged
- [X] T059 Execute quickstart V10 reconnect, route-switch, fresh-join, and direct forged-action scenarios, then record two-client expected/observed checkpoints in `specs/008-secure-host-room-entry/verification.md`
- [ ] T060 Deploy the completed branch to Render and execute quickstart V11; record HTTPS Secure-cookie behavior, WSS connectivity, host/player joins, restart invalidation, and fresh capability issuance in `specs/008-secure-host-room-entry/verification.md`
- [ ] T061 Re-open `specs/008-secure-host-room-entry/checklists/requirements.md`, verify every requirement against the recorded implementation evidence, and mark only resolved checklist items in that file

**Checkpoint**: Build, focused smoke, browser evidence, and Render evidence are complete, or Render verification is explicitly recorded as pending rather than presented as passed.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Starts immediately; T001 precedes T002 because T002 records into the new evidence file.
- **Foundational (Phase 2)**: Depends on T001-T002. Blocks all story implementation because every story uses the shared protocol; T005 and the Vite exact-`/host` proxy/Express HTML relay in T006 can run in parallel after T003-T004 are understood.
- **User Story 1 (Phase 3)**: Depends on Phase 2. It is the MVP and should be completed before User Story 2 for the safest incremental delivery.
- **User Story 2 (Phase 4)**: Depends on Phase 2 and uses the authorized room-creation result from US1 for end-to-end validation. It does not require US3.
- **User Story 3 (Phase 5)**: Depends on Phase 2 and is easiest after US1-US2 surfaces exist, but atmosphere primitives T040-T043 can begin in parallel once route modes are stable.
- **Polish (Phase 6)**: Depends on all desired story phases and their checkpoints.

### User Story Dependency Graph

```text
Setup
  -> Foundational
       -> US1 (MVP: /host boundary and host lifecycle)
            -> US2 (room code and invite URL joining)
                 -> US3 (final host/player/game visual energy)
                      -> Polish
```

US2 is functionally independent of US3. US3 can begin after US1 route semantics are stable, but final integration waits for the US2 join and invite surfaces.

### Within Each Story

- Shared models/contracts before server and client consumers
- Server authorization/state transitions before client-only presentation claims
- Core behavior before visual refinement
- Focused smoke or manual checkpoint after each independently usable increment

### Parallel Opportunities

- **Foundational**: T005 `entryCapability.ts` and T006 Vite `/host` proxy plus Express HTML relay can proceed in parallel once contract decisions are fixed.
- **US1 server/client split**: T008 server route and T018 role label can proceed in parallel; T011-T015 room lifecycle work can proceed while T016-T021 route UI is built.
- **US1 verification**: T022 status handling and T023 smoke scenarios can proceed once their prerequisites are stable.
- **US2 UI/server split**: T030 JoinRoomPanel can be built while T025-T028 implement server lookup and validation; T035-T037 can proceed in parallel across generic, Ludo/UNO custom, and Housie/Bingo invite surfaces.
- **US3**: T040 atmosphere component, T042 tokens, T043 animations, and each game CSS task T048-T051 can run independently after shared route/game-accent contracts are fixed.

## Parallel Example: User Story 1

```text
Track A: T008 route issuance -> T009 wiring -> T010-T015 server authority/lifecycle
Track B: T016-T021 host/player UI
Track C after integration: T022 status UI + T023 smoke scenarios
```

## Parallel Example: User Story 2

```text
Track A: T025-T028 server code-only resolution
Track B: T029 room-store result API -> T030 JoinRoomPanel -> T031-T033 Hub integration
Track C: T034 InviteBar -> T035 generic + T036 custom matches + T037 game lobbies
```

## Parallel Example: User Story 3

```text
Track A: T040 atmosphere -> T041 App mount
Track B: T042 tokens + T043 animations
Track C: T048 Ludo + T049 Housie + T050 Bingo + T051 UNO
Then: T044-T047 integration -> T052-T055 responsive/accessibility evidence
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete T001-T007 setup and foundational work.
2. Complete US1 T008-T024.
3. Validate that ordinary player routes cannot create rooms or become host.
4. Stop and demo the `/host`/player boundary before adding room-code joining or the full visual redesign.

### Incremental Delivery

1. Foundation ready: protocol, errors, capability helper, six-character constants, Vite `/host` proxy and Express HTML relay.
2. US1 delivered: protected host entry and safe host lifecycle.
3. US2 delivered: code-only joins and equivalent invite code/URL surfaces.
4. US3 delivered: shared high-energy atmosphere and responsive game polish.
5. Polish: regression, security review, local evidence, and Render verification.

## Notes

- `[P]` marks parallelizable work only; dependencies still apply.
- `[US1]`, `[US2]`, and `[US3]` labels preserve story traceability.
- `/host` is the current access designation, but it authorizes only room creation—not fresh joins or room authority.
- No task may make a decoration, route flag, or client payload authoritative for room host status.
- The room code is exactly six uppercase alphanumeric characters from the shared alphabet.
- Run browser checks from `quickstart.md` and retain evidence before declaring a story complete.
