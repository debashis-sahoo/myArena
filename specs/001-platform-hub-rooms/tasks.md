---

description: "Task list for Platform Core, Visual Hub & Room Engine"
---

# Tasks: Platform Core, Visual Hub & Room Engine

**Input**: Design documents from `/specs/001-platform-hub-rooms/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md),
[contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: No automated test suites are requested; the constitution (Principle III) says to minimise them. Verification is
done through the manual scenarios in [quickstart.md](quickstart.md), recorded as evidence, plus one headless two-client smoke
script (T101) permitted by Principle III.

**Organization**: Tasks are grouped by user story so each story can be implemented and verified independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: Maps to the user story in [spec.md](spec.md) (US1 to US8)
- All paths are relative to the repository root `G:\Projects\MyArena`

## Path Conventions

Web application delivered as one service (see [plan.md](plan.md) Project Structure): `shared/src/`, `server/src/`,
`server/scripts/`, `client/src/`. Verification evidence is recorded in `specs/001-platform-hub-rooms/verification.md`
(created in T036, appended by each later verification task) with scenario, expected result, observed result, and
screenshots where visual.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and workspace structure

- [X] T001 Create root `package.json` with npm workspaces `["shared","server","client"]`, `engines.node` `>=22`, and scripts `dev` (server and client dev servers), `build` (shared, then server, then client), `start` (`node server/dist/index.js`), and `smoke` (`tsx server/scripts/smoke.ts`)
- [X] T002 Create `tsconfig.base.json` with strict TypeScript settings shared by all workspaces
- [X] T003 [P] Create `shared/package.json` and `shared/tsconfig.json` (types and constants only, no runtime dependencies); name the package `@myarena/shared`, make it an ES module (`"type": "module"`, `moduleResolution` NodeNext), build it with `tsc` to `dist/`, and point `main`, `types`, and `exports` at `dist/index.js` and `dist/index.d.ts` so the server can import it at runtime
- [X] T004 [P] Create `server/package.json` and `server/tsconfig.json` with dependencies express, socket.io, zod, helmet, pino and dev dependencies typescript, tsx, socket.io-client, @types/express, @types/node; depend on `@myarena/shared` via the workspace, use `"type": "module"`, and compile with `tsc` to `dist/`
- [X] T005 [P] Create `client/package.json`, `client/tsconfig.json`, `client/vite.config.ts` (dev proxy of the Socket.IO path to port 10000) and `client/index.html` with `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`; dependencies react, react-dom, react-router, socket.io-client, vite, @vitejs/plugin-react
- [X] T006 [P] Create `.gitignore` ignoring `node_modules/`, `dist/`, `.env*`, and log files, and ensure the git `origin` remote is `https://github.com/debashis-sahoo/myArena.git` (add it if missing)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared contracts, server skeleton, and client foundations that every user story needs

**CRITICAL**: No user story work can begin until this phase is complete

- [X] T007 [P] Create `shared/src/limits.ts` exporting constants: display name length 1 to 20 (after trimming), chat text length 1 to 500, chat history 50, reconnect window 60000 ms, removal cooldown 60000 ms, chat token bucket (burst 5, refill 1 per second), max live rooms 100, Socket.IO `pingInterval` 4000 ms and `pingTimeout` 4000 ms, room-ID alphabet `23456789ABCDEFGHJKMNPQRSTUVWXYZ` (31 characters) and length 8
- [X] T008 [P] Create `shared/src/games.ts` with the `GameDefinition` registry per [data-model.md](data-model.md): `ludo` (status `active`, min 2, max 4, default capacity 4, supportsAi true, seatColors red, green, yellow, blue), and `snakes-and-ladders`, `housie`, `bingo` (status `coming_soon`), each with `name` and `theme` accent colors
- [X] T009 [P] Create `shared/src/protocol.ts` with every event name, payload and ack type, `RoomState`, `Participant`, `Seat`, `ChatMessage`, and error codes exactly as in [contracts/realtime-events.md](contracts/realtime-events.md) (events `room:create`, `room:join`, `room:leave`, `room:setCapacity`, `room:kick`, `room:start`, `chat:send`, `room:state`, `chat:message`, `player:removed`, `room:closed`, `server:restarting`), plus the reserved `game:action` (client to server) and `game:state` (server to client) events from [contracts/game-module.md](contracts/game-module.md)
- [X] T010 Create `shared/src/index.ts` re-exporting `limits`, `games`, and `protocol` (depends on T007, T008, T009)
- [X] T011 [P] Create `server/src/config.ts` reading `PORT` (default 10000), `NODE_ENV`, `LOG_LEVEL`, `MAX_ROOMS` (default 100), `RECONNECT_WINDOW_MS` (default 60000), `REMOVAL_COOLDOWN_MS` (default 60000) per [contracts/render-deployment.md](contracts/render-deployment.md)
- [X] T012 [P] Create `server/src/logger.ts` exporting a pino JSON logger honouring `LOG_LEVEL` (never log `guestId`)
- [X] T013 [P] Create `server/src/serverState.ts` exporting a mutable state `starting | ready | draining` used by `/healthz` and shutdown
- [X] T014 Create `server/src/app.ts` building the Express app with `trust proxy` enabled, helmet with the Content Security Policy from [contracts/http-routes.md](contracts/http-routes.md), static serving of `client/dist` (hashed assets cached long-term), and an SPA fallback that serves `index.html` uncached for non-API paths; resolve the client bundle at `../../client/dist` relative to the compiled `server/dist` so it works from the repository root on Render (depends on T011, T012)
- [X] T015 Create `server/src/index.ts` that creates the HTTP server from the app, attaches Socket.IO on the same server with `pingInterval` and `pingTimeout` from `shared/src/limits.ts` and no CORS, listens on `config.PORT` bound to `0.0.0.0`, sets `serverState` to `ready` after listening, and logs startup (depends on T010, T013, T014)
- [X] T016 [P] Create `client/src/styles/tokens.css` defining the neon arcade palette (rich saturated colors, high contrast), spacing, radii, glow shadows, `dvh` height helper, and `env(safe-area-inset-*)` padding variables
- [X] T017 [P] Create `client/src/styles/animations.css` with entry, lift, pulse, glow, and bounce keyframes plus a `prefers-reduced-motion: reduce` block replacing motion with static equivalents (FR-008), and `client/src/styles/controls.css` with shared tactile button and interactive-control styles: pressed, hover, and visible focus states usable with touch, pointer, and keyboard (FR-034)
- [X] T018 [P] Create `client/src/state/guest.ts` that creates and persists in `localStorage` a `guestId` (UUID), `displayName` ("1 to 20 characters after trimming; control characters stripped; plain text only"; blank gets a generated friendly name such as "Swift Panda"), `avatar` key, and `soundOn`
- [X] T019 [P] Create `client/src/audio/sfx.ts` synthesizing short Web Audio effects (tap, join, message, error) that play only when `soundOn` is true and only after a user gesture
- [X] T020 Create `client/src/state/socket.ts` exposing a lazily connected Socket.IO client that connects relative to the page origin (so `wss` in production), a promise-based `emitWithAck` helper returning `{ ok, data | error }`, and an observable connection status (`idle`, `connecting`, `connected`, `reconnecting`); it must not connect until first use (depends on T010)

**Checkpoint**: Foundation ready; user stories can now begin

---

## Phase 3: User Story 1 - Discover Games on the myArena Hub (Priority: P1) MVP

**Goal**: A vivid, responsive Hub with the "myArena Hub" header, guest profile, audio toggle, and four uniform glossy game cards.

**Independent Test**: Quickstart V1: open the Hub on desktop and phone viewports; verify header, uniform cards, badges, animations, hover/tap lift, unlaunchable coming-soon cards, and reduced-motion behaviour.

- [X] T021 [P] [US1] Create `client/src/art/Logo.tsx` rendering "myArena Hub" in vibrant gradient arcade typography with drop shadow and a glowing crown accent (FR-001)
- [X] T022 [P] [US1] Create `client/src/art/LudoArt.tsx`: inline SVG preview with the four colored quadrants, glossy pawns, and dice (FR-002)
- [X] T023 [P] [US1] Create `client/src/art/SnakesLaddersArt.tsx`: inline SVG colorful board with snakes and ladders
- [X] T024 [P] [US1] Create `client/src/art/HousieArt.tsx`: inline SVG overlapping tickets and number chips
- [X] T025 [P] [US1] Create `client/src/art/BingoArt.tsx`: inline SVG bingo card and balls
- [X] T026 [P] [US1] Create `client/src/art/Avatars.tsx` exporting a fixed set of 8 avatar badge keys and their SVG renderers
- [X] T027 [P] [US1] Create `client/src/components/common/Confetti.tsx`: decorative falling confetti that is disabled under reduced motion
- [X] T028 [P] [US1] Create `client/src/styles/hub.css`: Hub layout, card styles, frosted overlay, badge, glossy highlights, uniform card dimensions, and the grid rules (single column on phones, 2x2 on tablets and standard desktops, one row on very wide screens with identical card size, no horizontal scroll from 320 px to 2560 px, safe-area padding) (FR-007, FR-033)
- [X] T029 [US1] Create `client/src/components/hub/GuestProfile.tsx`: avatar badge picker and display-name input validated to "1 to 20 characters after trimming" and saved through `client/src/state/guest.ts` (FR-005, FR-006) (depends on T026)
- [X] T030 [P] [US1] Create `client/src/components/hub/SoundToggle.tsx`: accessible audio/SFX toggle persisted through `client/src/state/guest.ts` (FR-005)
- [X] T031 [US1] Create `client/src/components/hub/Header.tsx` combining `Logo`, `GuestProfile`, and `SoundToggle` with a responsive top bar (depends on T021, T029, T030)
- [X] T032 [P] [US1] Create `client/src/components/hub/GameCard.tsx`: uniform glossy card with vivid art, hover and tap lift, a pulsing "PLAY NOW" button for `active` games, and for `coming_soon` games a frosted overlay with an unmistakable "Coming Soon" badge that is non-interactive and never invokes launch (FR-002 to FR-004) (depends on T022 to T025)
- [X] T033 [US1] Create `client/src/components/hub/GameGrid.tsx` rendering one `GameCard` per entry of the registry in `shared/src/games.ts` (depends on T032)
- [X] T034 [US1] Create `client/src/routes/HubPage.tsx` assembling `Header`, `GameGrid`, and `Confetti` with the smooth staggered entry animation (depends on T031, T033)
- [X] T035 [US1] Create `client/src/main.tsx` and `client/src/App.tsx` with `react-router`, importing the style sheets, and registering the `/` route to `HubPage`
- [X] T036 [US1] Run quickstart scenario V1 on widths 320, 390, 768, 1024, 1440, 2560 px in portrait and landscape and with reduced motion; create `specs/001-platform-hub-rooms/verification.md` recording scenario, expected, observed, and screenshots

**Checkpoint**: The Hub is fully functional and independently verifiable (MVP slice for visuals)

---

## Phase 4: User Story 2 - Launch Ludo and Create a Private Room (Priority: P1)

**Goal**: Clicking Ludo opens the launch modal; "Play Online" creates a private room, shows the room code and invite link with one-click copy, and enters the creator as host.

**Independent Test**: Quickstart V2: Ludo, Play Online, see a unique code and invite URL within 2 seconds, copy it, and land in the room as the only host.

- [X] T037 [US2] Create `server/src/rooms/room.ts` with the `Room` model per [data-model.md](data-model.md): seats built from `capacity` with colors from the game's `seatColors`, `Participant` with `playerId`, `joinSeq`, private `guestId`/`socketId`, `hostPlayerId` set to the creator, `rev` incremented on every change, and a projection function that never exposes `guestId`, `socketId`, or timers
- [X] T038 [US2] Create `server/src/rooms/roomStore.ts`: live-room `Map`, room-ID generation using `crypto.randomInt` over "8 characters from a 31-character unambiguous alphabet" with collision retry, a cap of `config.MAX_ROOMS` returning `SERVER_BUSY`, lookup by `gameId` and `roomId`, and `closeRoom` (depends on T037)
- [X] T039 [P] [US2] Create `server/src/sockets/schemas.ts` with zod schemas for the `Guest` object (`guestId` UUID; `displayName` trimmed, 1 to 20 characters, control characters stripped; `avatar` from the allowed set) and the `room:create` payload (`gameId` must be an existing `active` game, `mode` `online`), rejecting unknown fields with `INVALID_PAYLOAD`
- [X] T040 [P] [US2] Create `server/src/sockets/rateLimit.ts` with a reusable token-bucket helper keyed per connection and per IP, and apply a limit to `room:create` (`RATE_LIMITED` with `retryAfterMs`)
- [X] T041 [US2] Create `server/src/sockets/registerHandlers.ts` handling `room:create` (online): validate, create the room with `capacity` equal to the game's default, seat the creator as the only host, join the Socket.IO room, ack `{ room, you, chat: [], invitePath }`, and emit `room:state`; register the handlers from `server/src/index.ts` (depends on T038, T039, T040)
- [X] T042 [P] [US2] Create `client/src/state/roomStore.ts` holding `RoomState`, `you`, and chat, applying `room:state` only when its `rev` is greater than the current one, and exposing `createRoom` and later actions via `emitWithAck` (depends on T020)
- [X] T043 [P] [US2] Create `client/src/components/common/Modal.tsx`: accessible modal with focus moved in on open and restored on close, focus trap, and dismissal by close button, outside click or tap, and the Escape key (FR-010)
- [X] T044 [US2] Create `client/src/components/launch/LaunchModal.tsx` showing the game name and two visually distinct primary actions, "Play with AI" and "Play Online"; "Play Online" calls `createRoom` and shows a loading state and a friendly error on failure; "Play with AI" is rendered and wired in T097 (depends on T043)
- [X] T045 [P] [US2] Create `client/src/components/room/InviteBar.tsx` showing the room code formatted `XXXX-XXXX` and the invite link `/room/{gameId}/{roomId}`, with a "Copy Invite Link" button that shows "Copied!" and falls back to a selectable read-only field with a manual-copy hint when the clipboard is unavailable or denied (FR-014)
- [X] T046 [P] [US2] Create `client/src/components/room/PlayerList.tsx` listing every seat with color tag, name, avatar, a glowing host marker, and open-seat placeholders (FR-017, FR-034)
- [X] T047 [P] [US2] Create `client/src/games/types.ts` defining `GameBoardProps` (`room`, `you`, `matchState`, `stageSize`, `send`, `reducedMotion`) per [contracts/game-module.md](contracts/game-module.md), and `client/src/games/placeholder/PlaceholderBoard.tsx` implementing it: polished placeholder showing the game art, the match state ("Lobby" or "Match in progress"), and seated players, scaling to the `stageSize` prop (FR-032)
- [X] T048 [US2] Create `client/src/components/room/GameStage.tsx` that measures the largest available square, creates `client/src/games/registry.ts` mapping each `gameId` to its board component (`ludo` maps to the placeholder board), and looks the board up by `gameId` and mounts it inside the stage, updating on resize and rotation (FR-023, FR-032, FR-033) (depends on T047)
- [X] T049 [US2] Create `client/src/components/room/RoomShell.tsx` with CSS grid areas that change by viewport shape (stage plus side panel in landscape and wide screens; stage over panels in portrait), respecting safe areas and `dvh`, with a reserved region for chat (depends on T045, T046, T048)
- [X] T050 [P] [US2] Create `client/src/styles/room.css` with room shell layout, lobby, player rows, color tags, invite bar, and glow styles (no horizontal scroll, no clipping from 320 px to 2560 px)
- [X] T051 [US2] Create `client/src/routes/RoomPage.tsx` rendering `RoomShell` from the room store; update `client/src/routes/HubPage.tsx` so activating the active Ludo card opens `LaunchModal`, and "Play Online" navigates to `/room/ludo/{roomId}`; register the `/room/:gameId/:roomId` route in `client/src/App.tsx` (depends on T044, T049)
- [X] T052 [US2] Run quickstart scenario V2 (modal dismissal, room code and invite link within 2 seconds, copy confirmation and clipboard-denied fallback, creator is the only host) and append evidence to `specs/001-platform-hub-rooms/verification.md`

**Checkpoint**: Hub plus private room creation work end to end for a single host

---

## Phase 5: User Story 3 - Join via Invite Link with Live Presence (Priority: P1)

**Goal**: A guest opens the invite link, joins, and appears instantly in the host's lobby; disconnects and reconnects are reflected promptly.

**Independent Test**: Quickstart V3: create a room, open the link in a second incognito window, see the guest within 2 seconds, close it and see it marked disconnected, reopen within 60 seconds to resume, and check full, not-found, and match-in-progress messages.

- [X] T053 [US3] Extend `server/src/rooms/room.ts` with join rules: allowed only when `state = lobby`, a seat is open, and `mode = online` (else `ROOM_FULL`, `MATCH_IN_PROGRESS`, or `ROOM_NOT_FOUND`); one seat per `guestId` (a second tab takes over the same seat); resume by known `guestId` within the reconnect window always allowed; duplicate display names get a numeric suffix; each new participant gets the next `joinSeq`
- [X] T054 [US3] Extend `server/src/rooms/room.ts` and `server/src/rooms/roomStore.ts` with disconnect handling: mark the participant `disconnected` and start a `RECONNECT_WINDOW_MS` timer; on resume clear it; on expiry release the seat (a lobby seat reopens); close the room immediately when the last participant explicitly leaves and when the reconnect window ends with nobody connected (`emptyTimer`); remove closed rooms from the store so links answer `ROOM_NOT_FOUND`
- [X] T055 [P] [US3] Extend `server/src/sockets/schemas.ts` with the `room:join` payload (`gameId`, `roomId` of 8 characters from the allowed alphabet, `guest`) and the empty `room:leave` payload
- [X] T056 [US3] Extend `server/src/sockets/registerHandlers.ts` with `room:join` (ack `{ room, you, chat, resumed }`, apply a per-IP and per-connection rate limit, reject joining an AI room as anyone but its creator with `ROOM_NOT_FOUND`), `room:leave`, the Socket.IO `disconnect` handler, `room:state` broadcasts on every change, and `room:closed` with reasons `all_left` and `all_disconnected`; log lifecycle events with `server/src/logger.ts`
- [X] T057 [P] [US3] Create `client/src/components/room/JoinGate.tsx` letting a guest with no room in the store confirm or edit their display name and avatar before joining
- [X] T058 [P] [US3] Create `client/src/components/room/RoomStatusScreen.tsx` with friendly full-screen messages and a "Back to Hub" button for: room not found, room full, match in progress, removed (with remaining wait from `retryAfterMs`), and room ended
- [X] T059 [US3] Update `client/src/routes/RoomPage.tsx` so a direct load of `/room/:gameId/:roomId` shows `JoinGate`, calls `room:join`, maps error codes to `RoomStatusScreen`, and re-sends `room:join` with the same `guestId` automatically whenever the socket reconnects (depends on T057, T058)
- [X] T060 [US3] Update `client/src/components/room/PlayerList.tsx` and `client/src/styles/room.css` to show `connected` versus `disconnected` states (dimmed with a reconnecting indicator) and to animate joins and leaves
- [ ] T061 [US3] Run quickstart scenario V3 (join appears within 2 seconds, leave within 2 seconds, abrupt disconnect within 10 seconds, resume within 60 seconds, a phone screen locked for 30 seconds then unlocked resumes its seat, full, not-found) and append evidence to `specs/001-platform-hub-rooms/verification.md`

**Checkpoint**: Multiplayer rooms with live presence work; the spec smoke test steps 1 to 3 pass

---

## Phase 6: User Story 4 - Real-Time In-Room Chat (Priority: P2)

**Goal**: Instant room chat with bubbles, color tags, timestamps, system announcements, docked on desktop and a collapsible drawer on phones.

**Independent Test**: Quickstart V4: two windows exchange messages instantly; check bubbles, system lines, validation and rate limits, plain-text rendering, and the desktop versus phone layouts.

- [X] T062 [P] [US4] Create `server/src/rooms/chat.ts` with a per-room ring buffer of the last 50 messages (`CHAT_HISTORY`), message ids increasing per room, validation ("trimmed, non-empty, at most 500 characters"; control characters removed), and a factory for system messages with codes `joined`, `left`, `disconnected`, `reconnected`, `removed`, `host_changed`, `capacity_changed`, `match_started`, `seat_released`
- [X] T063 [US4] Update `server/src/rooms/room.ts` to own a chat buffer, emit the matching system message on join, leave, disconnect, and reconnect, and return the buffered history in create and join acks (depends on T062)
- [X] T064 [US4] Extend `server/src/sockets/schemas.ts` and `server/src/sockets/registerHandlers.ts` with `chat:send`: sender must be a connected participant, apply the token bucket ("rate limit 5-message burst and 1 per second sustained") returning `RATE_LIMITED` with `retryAfterMs`, store, then broadcast `chat:message` with name and color snapshots (depends on T063)
- [X] T065 [P] [US4] Create `client/src/components/room/ChatPanel.tsx`: message bubbles with sender name, color tag, and local-time timestamp; own messages visually distinct; visually distinct centered system announcements; auto-scroll; input with 500-character limit counter, empty-message block, and inline rate-limit and error feedback; all text rendered as text only, never as HTML (FR-026 to FR-030)
- [X] T066 [P] [US4] Create `client/src/components/room/ChatDrawer.tsx`: collapsible bottom drawer wrapping `ChatPanel` with an unread-message badge while collapsed and a toggle button
- [X] T067 [US4] Update `client/src/state/roomStore.ts` to hold chat messages (seeded from the ack history, appended from `chat:message`), track an unread count while the drawer is collapsed, and expose `sendChat`
- [X] T068 [US4] Update `client/src/components/room/RoomShell.tsx` to dock `ChatPanel` beside the stage on wide and landscape viewports and to use `ChatDrawer` on phone portrait, preserving typed text across rotation and resize (depends on T065, T066, T067)
- [X] T069 [P] [US4] Create `client/src/styles/chat.css` for bubbles, system lines, drawer, and badge, with no clipping on small landscape phones
- [X] T070 [US4] Run quickstart scenario V4 (bidirectional delivery within 1 second, system announcements, empty, long, and burst messages, `<img src=x onerror=alert(1)>` shown as plain text, desktop docked and phone drawer layouts) and append evidence to `specs/001-platform-hub-rooms/verification.md`

**Checkpoint**: Chat works in every room; the spec smoke test step 4 passes

---

## Phase 7: User Story 5 - Host Lobby Controls (Priority: P2)

**Goal**: Exactly one host who can set capacity (2 to 4 for Ludo), remove players, and start the match; handover when the host leaves.

**Independent Test**: Quickstart V5: change capacity, hit blocked cases, start the match, remove a guest with cooldown, and watch host handover without ever showing two hosts.

- [X] T071 [P] [US5] Create `server/src/games/placeholderEngine.ts` implementing the `GameEngine` hooks from [contracts/game-module.md](contracts/game-module.md) (`createMatch` returns a placeholder state with the seat list, `getView`, `onSeatReleased` no-op, `onAction` ignored, `onBotTurn` no-op, `dispose`)
- [X] T072 [P] [US5] Create `server/src/games/registry.ts` mapping each `gameId` to its `GameEngine` (Ludo to the placeholder engine) and defining the `GameEngine` interface
- [X] T073 [US5] Extend `server/src/rooms/room.ts` with host operations, each authorized against `hostPlayerId` and allowed only in `lobby` unless noted: `setCapacity` (integer "within game limits and >= occupied seats", else `CAPACITY_OUT_OF_RANGE` or `CAPACITY_BELOW_PLAYERS`, online rooms only), `kick` (host cannot kick self; record a SHA-256 hash of the target `guestId` in `removed` with `blockedUntil` of now plus `REMOVAL_COOLDOWN_MS`, and make `join` return `REMOVED_COOLDOWN` with `retryAfterMs`), and `start` (only when seated players are at least the game's `minPlayers`, bots counting, else `NOT_ENOUGH_PLAYERS`; set `state` to `in_progress`; call the engine's `createMatch`; lock joins) (depends on T071, T072; requires the chat buffer and system messages from T062 and T063)
- [X] T074 [US5] Extend `server/src/rooms/room.ts` with host handover and in-match release: when the host is released, in the same synchronous step make the connected human with the lowest `joinSeq` the host (so exactly one host exists at all times) or close the room if none; a returning former host rejoins as a regular player; releasing a seat during `in_progress` must announce `seat_released`, call `engine.onSeatReleased`, keep the match running, and block that guest from rejoining (depends on T073)
- [X] T075 [P] [US5] Extend `server/src/sockets/schemas.ts` with the `room:setCapacity`, `room:kick`, and `room:start` payloads
- [X] T076 [US5] Extend `server/src/sockets/registerHandlers.ts` with `room:setCapacity`, `room:kick`, and `room:start`: answer `NOT_HOST` to non-hosts, emit `player:removed` with `{ cooldownMs }` to the removed player and detach their socket, broadcast `room:state`, and post system messages `capacity_changed`, `removed`, `host_changed`, `match_started` (depends on T074, T075)
- [X] T077 [P] [US5] Create `client/src/components/room/HostControls.tsx` (visible only to the host in a lobby): capacity stepper limited to the game's range, Start button disabled with a visible explanation when below the minimum player count, and an explanation when a capacity change is blocked
- [X] T078 [US5] Update `client/src/components/room/PlayerList.tsx` and `client/src/styles/room.css` with host-only remove buttons and a glowing host marker, and ensure only one host marker can ever render
- [X] T079 [US5] Update `client/src/games/placeholder/PlaceholderBoard.tsx` and `client/src/components/room/GameStage.tsx` so every participant switches together to the "Match in progress" state and the room shows a locked-lobby notice to late joiners via `MATCH_IN_PROGRESS`
- [X] T080 [US5] Update `client/src/state/roomStore.ts` and `client/src/routes/RoomPage.tsx` to handle `player:removed` by showing the removed screen with the 60-second remaining wait, and to render `HostControls` inside `RoomShell`
- [X] T081 [US5] Run quickstart scenario V5 (capacity changes and blocks, start rules, guest sees no host controls, removal and 60-second cooldown, host handover with exactly one host at every moment) and append evidence to `specs/001-platform-hub-rooms/verification.md`

**Checkpoint**: Full lobby management with a single authoritative host

---

## Phase 8: User Story 7 - Production-Ready Deployment (Priority: P2)

**Goal**: One production start command, `PORT` binding, `/healthz`, graceful shutdown, and a Render Blueprint, so the project deploys with no source edits.

**Independent Test**: Quickstart V8 plus the Render deployment checks: start with only `PORT`, call `/healthz`, deploy from the repository.

- [X] T082 [P] [US7] Create `server/src/health.ts` exposing the `GET /healthz` handler: 200 `{ "status": "ok", "uptimeSec", "rooms", "connections" }` when `serverState` is `ready`, 503 `{ "status": "starting" }` or `{ "status": "draining" }` otherwise, no session or cookies, logged at debug level only (FR-036)
- [X] T083 [US7] Register the `/healthz` route in `server/src/app.ts` before the SPA fallback (depends on T082)
- [X] T084 [US7] Create `server/src/shutdown.ts` and wire it in `server/src/index.ts`: on `SIGTERM` set `serverState` to `draining`, emit `server:restarting` to all sockets, close Socket.IO and the HTTP server, and exit before Render's 30-second window; rooms end with the process (depends on T083)
- [X] T085 [P] [US7] Create `render.yaml` with one `web` service: runtime `node`, `plan: free`, `buildCommand: npm ci && npm run build`, `startCommand: npm start`, `healthCheckPath: /healthz`, `NODE_ENV=production`, and `NODE_VERSION` pinned to Node 22 (FR-035, FR-037)
- [X] T086 [P] [US7] Create `README.md` documenting local run, build, the smoke script, deployment to Render from `https://github.com/debashis-sahoo/myArena.git`, and every environment variable from [contracts/render-deployment.md](contracts/render-deployment.md)
- [X] T087 [US7] Run quickstart scenario V8 locally (listens on `PORT=12345`, defaults to 10000, `/healthz` 200 then 503 during startup and after `SIGTERM`) and append evidence to `specs/001-platform-hub-rooms/verification.md`
- [ ] T088 [US7] Deploy to Render from the Blueprint and verify a successful build, a healthy `/healthz`, and a working WebSocket connection over `wss` (quickstart Render item 1 and the connectivity part of item 2); record results, marking anything not yet possible as pending, in `specs/001-platform-hub-rooms/verification.md`. Confirm the Render service is connected to `https://github.com/debashis-sahoo/myArena.git`.

**Checkpoint**: The service is deployable to Render without source changes

---

## Phase 9: User Story 8 - Stay Connected While a Game Is Active (Priority: P2)

**Goal**: Active rooms stay connected and awake on Render's free plan; the service may sleep when empty; the UI handles waking and reconnecting gracefully.

**Independent Test**: Quickstart Render checks 3 to 5: 30 idle minutes with two participants and no disconnects, spin-down and wake, and redeploy with clients reconnecting to a clear "room ended" screen.

- [X] T089 [P] [US8] Create `client/src/components/common/ConnectionBanner.tsx` showing "Waking up the arena" on first-connect attempts and "Reconnecting..." mid-session, with a manual retry button after about 90 seconds of failed attempts (FR-042)
- [X] T090 [US8] Update `client/src/state/socket.ts` to connect on the first `room:create` or `room:join`, and, when the user leaves a room or returns to the Hub, to send `room:leave` and then disconnect, so no traffic is generated when no room has a connected participant (FR-041); configure reconnection with exponential backoff from 1 second up to 10 seconds with jitter, and expose the retry count and elapsed time for the banner
- [X] T091 [US8] Update `client/src/App.tsx` to mount `ConnectionBanner` and handle `server:restarting`, showing "reconnecting" and, once the reconnect finds the room gone (`ROOM_NOT_FOUND`), the "room ended" screen from `client/src/components/room/RoomStatusScreen.tsx` (depends on T089, T090)
- [X] T092 [US8] Confirm `server/src/index.ts` takes the heartbeat values only from `shared/src/limits.ts` (4000 ms interval, 4000 ms timeout) so abrupt disconnects are detected within 10 seconds (SC-003) and the heartbeat doubles as the keepalive (FR-039, FR-040); add a log line when a connection times out
- [ ] T093 [US8] On the deployed Render URL repeat V2 to V4 over HTTPS (quickstart Render item 2), then run the 30-minute idle-room test (SC-011), the over-15-minute spin-down then wake check, and the redeploy-with-clients check; record results in `specs/001-platform-hub-rooms/verification.md`. If the free-plan service still sleeps or drops connections, add the fallback from [research.md](research.md) R3: a client-to-server `heartbeat` event every 20 seconds while in a room, handled in `server/src/sockets/registerHandlers.ts` and sent from `client/src/state/socket.ts`. During the redeploy, also confirm the previous instance keeps serving until the new one reports healthy (constitution zero-downtime rule) and record the result; if the Free plan does not provide this, record it in `verification.md` as a limitation that needs explicit maintainer approval as a constitution exception

**Checkpoint**: Active rooms survive quiet periods on the free plan

---

## Phase 10: User Story 6 - Play with AI (Priority: P3)

**Goal**: "Play with AI" asks for 1 to 3 opponents (3 preselected) and creates a single-human room with that many bots and no invite step.

**Independent Test**: Quickstart V6: Ludo, Play with AI, pick opponents, enter a room with bot seats, chat available, no invite link, leaving ends the room.

- [X] T094 [US6] Extend `server/src/sockets/schemas.ts` so `room:create` accepts `mode: "ai"` with required `botCount` from 1 to `maxPlayers - 1` (default 3 from the UI) and ignores `botCount` for `online`
- [X] T095 [US6] Extend `server/src/rooms/room.ts` and `server/src/sockets/registerHandlers.ts` for AI rooms: `capacity = 1 + botCount`, bots seated as `kind: "bot"` participants that are always `connected` and never host, `inviteEnabled` false and `invitePath` null, `setCapacity` rejected (`INVALID_STATE`), joins by anyone but the creator answered `ROOM_NOT_FOUND`, and the room closes with reason `ai_owner_left` when the human leaves or after the reconnect window; the host may start with bots counting toward the minimum
- [X] T096 [P] [US6] Create `client/src/components/launch/AiOpponentPicker.tsx`: choose 1 to 3 opponents with 3 preselected and a single confirm button
- [X] T097 [US6] Update `client/src/components/launch/LaunchModal.tsx` so "Play with AI" opens the opponent step; confirming calls `room:create` with `mode: "ai"` and `botCount`, and dismissing or going back creates no room (depends on T096)
- [X] T098 [US6] Update `client/src/routes/HubPage.tsx` to navigate to the new AI room after confirmation
- [X] T099 [US6] Update `client/src/components/room/RoomShell.tsx`, `client/src/components/room/InviteBar.tsx`, `client/src/components/room/HostControls.tsx`, and `client/src/components/room/PlayerList.tsx` to hide the invite bar and capacity stepper when `inviteEnabled` is false and to show a "Bot" badge on bot seats
- [X] T100 [US6] Run quickstart scenario V6 (opponent step, bot seats, chat available, no invite link, leaving ends the room, dismissing creates no room) and append evidence to `specs/001-platform-hub-rooms/verification.md`

**Checkpoint**: All user stories are independently functional

---

## Phase 11: Polish & Cross-Cutting Concerns

**Purpose**: Cross-story verification, responsiveness, accessibility, security, and documentation

- [X] T101 [P] Create `server/scripts/smoke.ts`: a headless script using `socket.io-client` against a running server that checks create, join, presence, chat in both directions, capacity bounds, start rules, `NOT_HOST` for guest host-only events, removal cooldown, host handover with exactly one host, reconnect resume, and room closure, printing PASS or FAIL per check and exiting non-zero on any failure (research R13; set `RECONNECT_WINDOW_MS` and `REMOVAL_COOLDOWN_MS` to 3000 for the run); add an optional load mode, `npm run smoke -- --rooms 50`, that opens 50 rooms with up to 4 clients each (about 200 sockets) and checks that create and join acknowledgements arrive within 2 seconds and chat is delivered within 1 second for at least 95% of sends (SC-009); it is not part of the default run
- [X] T102 Run quickstart scenario V7 (rotate a phone or emulate; resize a desktop window) across the Hub and rooms from 320 to 2560 px in portrait and landscape; fix any clipping, overlap, unused space, or lost chat text and lobby state in `client/src/styles/room.css`, `client/src/styles/hub.css`, and `client/src/styles/chat.css`; append evidence to `specs/001-platform-hub-rooms/verification.md`
- [X] T103 [P] Audit accessibility and reduced motion in `client/src/`: keyboard operation of the Hub, modal, lobby, and chat; visible focus states; `aria-live` for incoming chat and system messages; color contrast of text on neon backgrounds; confirm SC-008 (all information and controls stay available with reduced motion)
- [X] T104 [P] Review security in `server/src/`: every inbound event schema-validated, unknown fields rejected, host-only events authorized on the server, rate limits active for create, join, and chat, `guestId` never logged or broadcast, the CSP in `server/src/app.ts` matches [contracts/http-routes.md](contracts/http-routes.md), and chat is only ever rendered as text
- [ ] T105 Run `npm run smoke`, `npm run smoke -- --rooms 50` once, and the full [quickstart.md](quickstart.md) pass on desktop and a phone-sized viewport; time a first-time launch from Hub load to the open launch modal (SC-001), obtain a reviewer sign-off comparing the Hub with the reference image (SC-010), confirm SC-001 to SC-012 and update `specs/001-platform-hub-rooms/verification.md`
- [X] T106 Record a constitution compliance review in `specs/001-platform-hub-rooms/verification.md` covering Principles I to V, the Runtime and Deployment Constraints, and the Development Workflow and Quality Gates, listing any pending Render verification

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies; start immediately
- **Foundational (Phase 2)**: depends on Setup; **blocks all user stories**
- **User stories (Phases 3 to 10)**: all depend on Foundational completion; follow the priority order below
- **Polish (Phase 11)**: depends on the stories being verified

### User Story Dependencies

| Story | Priority | Depends on | Notes |
|-------|----------|------------|-------|
| US1 Hub | P1 | Foundational | Fully independent; MVP visual slice |
| US2 Create room | P1 | Foundational, US1 (Hub page and card) | Introduces server room model, store, and shell |
| US3 Join and presence | P1 | US2 | Needs rooms and the shell |
| US4 Chat | P2 | US3 (presence events feed system messages) | Adds chat buffer and panel |
| US5 Host controls | P2 | US3, US4 (T062 to T064: chat buffer and system messages) | Adds capacity, kick, start, handover |
| US7 Deployment | P2 | Foundational (server skeleton) | Can run in parallel with US4 or US5 after Foundational; T088 can run right after T087, and the full V2 to V4 checks on Render move to T093 (after US4) |
| US8 Keepalive | P2 | US3 (socket lifecycle), US7 (Render deployment) | Verification needs a deployed instance |
| US6 AI | P3 | US2, US5 (start rules, capacity) | Last; wires the "Play with AI" button |

### Within Each User Story

- Server model tasks, then schemas, then handlers; client state, then components, then page wiring; verification task last
- Tasks touching the same file are sequential (for example `server/src/rooms/room.ts` across T037, T053, T054, T063, T073, T074, T095)

### Parallel Opportunities

- Setup: T003, T004, T005, T006
- Foundational: T007, T008, T009 together; then T011, T012, T013, T016, T017, T018, T019
- US1: all art tasks T021 to T027 and T028 and T030 in parallel
- US2: T039, T040, T042, T043, T045, T046, T047, T050 in parallel
- US3: T055, T057, T058 in parallel
- US4: T062 with T065, T066, T069 in parallel
- US5: T071, T072, T075, T077 in parallel
- US7: T082, T085, T086 in parallel; US7 can proceed alongside US4 or US5 with a second developer
- Polish: T101, T103, T104 in parallel

---

## Parallel Example: User Story 1

```text
# After Foundational, launch together (different files):
T021 client/src/art/Logo.tsx
T022 client/src/art/LudoArt.tsx
T023 client/src/art/SnakesLaddersArt.tsx
T024 client/src/art/HousieArt.tsx
T025 client/src/art/BingoArt.tsx
T026 client/src/art/Avatars.tsx
T027 client/src/components/common/Confetti.tsx
T028 client/src/styles/hub.css
T030 client/src/components/hub/SoundToggle.tsx
```

## Parallel Example: User Story 2

```text
# Server and client work can proceed together once T037/T038 exist:
T039 server/src/sockets/schemas.ts
T040 server/src/sockets/rateLimit.ts
T042 client/src/state/roomStore.ts
T043 client/src/components/common/Modal.tsx
T045 client/src/components/room/InviteBar.tsx
T046 client/src/components/room/PlayerList.tsx
T047 client/src/games/placeholder/PlaceholderBoard.tsx
```

---

## Implementation Strategy

### MVP First

1. Complete Phase 1 (Setup) and Phase 2 (Foundational).
2. Complete Phase 3 (US1) and verify V1: the colorful Hub is the first demonstrable slice.
3. Complete Phases 4 and 5 (US2, US3): a host can create a room, share the link, and see a guest join. This is the minimum
   multiplayer platform and covers smoke-test steps 1 to 3.
4. Add US4 (chat) to complete the full spec smoke test (step 4).

### Incremental Delivery

1. US1: Hub visuals, demo.
2. US2 and US3: rooms and presence, demo with two browsers.
3. US4: chat; US5: host controls; US7: Render deployment (deploy early so Render behaviour is learned sooner).
4. US8: keepalive checks on the deployed instance.
5. US6: Play with AI; then Polish.

Because Render behaviour (idle limits, cold start) is the riskiest assumption, deploy as soon as US3 is verified (T085 to T088
can be done right after US3) and re-run the idle checks (T093) once chat and host controls exist.

### Notes

- [P] tasks touch different files and have no unmet dependency.
- Each user story ends with a verification task that records evidence; screenshots are required for visual checks.
- Per the constitution, do not add heavy test suites or mock harnesses; extend `server/scripts/smoke.ts` only when it is
  cheaper than repeating a manual two-client check.
- Commit after each task or logical group. Stop at any checkpoint to validate the story independently.
