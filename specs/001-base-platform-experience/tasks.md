# Tasks: Base Platform and Experience

**Input**: Design documents from `/specs/001-base-platform-experience/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: Included. The constitution requires automated tests for server-authoritative rules, reconnection, and permissions where practicable (Development Quality Gates), and the plan defines a test stack. Real-device acceptance is manual and recorded as evidence (FR-021, FR-022).

**Organization**: Tasks are grouped by user story so each story can be implemented and tested independently. Nothing in this list is marked done until evidence exists (Principle IX).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: User story the task belongs to (US1 to US5)
- Paths follow the monorepo layout in plan.md: `apps/server`, `apps/web`, `packages/protocol`, `packages/game-sdk`, `tools/load`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Workspace scaffolding and tooling

- [X] T001 Create the npm workspaces root with `package.json` (workspaces `apps/*`, `packages/*`, `tools/*`), `tsconfig.base.json` (strict), and `.gitignore` (including `.env*`) at the repository root
- [X] T002 [P] Add ESLint and Prettier configuration in `eslint.config.js` and `.prettierrc` at the repository root
- [X] T003 [P] Scaffold `packages/protocol` (`package.json`, `tsconfig.json`, `src/index.ts`) with Zod as a dependency
- [X] T004 [P] Scaffold `packages/game-sdk` (`package.json`, `tsconfig.json`, `src/index.ts`) with no dependency on server or web code
- [X] T005 [P] Scaffold `apps/server` (`package.json`, `tsconfig.json`, `vitest.config.ts`, `src/main.ts`) with Fastify, `@fastify/websocket`, `@fastify/cookie`, `@fastify/helmet`, `@fastify/rate-limit`, `@fastify/static`, and Pino
- [X] T006 [P] Scaffold `apps/web` (`package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.tsx`) with React 19, React Router, Vitest, and React Testing Library, plus a `browserslist` entry in `apps/web/package.json` for the current and previous major versions of Chrome, Edge, Firefox, Safari, Chrome for Android, and iOS Safari
- [X] T007 [P] Add Playwright with `@axe-core/playwright` in `apps/web/playwright.config.ts` (multi-context helpers in `apps/web/tests/e2e/helpers.ts`; mark emulated projects as development-only)
- [X] T008 [P] Create the Render blueprint `render.yaml` at the repository root: one always-on paid web service, `/healthz` health check, build and start commands, and env var keys only (`PORT`, `NODE_ENV`, `ALLOWED_ORIGINS`; no secret values)
- [X] T009 [P] Scaffold the load harness package `tools/load/package.json` and `tools/load/src/index.ts` (uses `ws`)
- [X] T010 Add root scripts in `package.json`: `dev`, `build`, `start`, `test`, `test:integration`, `test:contract`, `test:e2e`, `load` as listed in quickstart.md

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared contracts, security primitives, and app shells that every story needs

**CRITICAL**: No user story work can begin until this phase is complete

- [X] T011 [P] Define error and rejection codes in `packages/protocol/src/errors.ts`: REST problem codes `VALIDATION_FAILED`, `INVITATION_UNAVAILABLE`, `ROOM_FULL`, `SERVICE_AT_CAPACITY`, `RECOVERY_EXPIRED`, `UNAUTHENTICATED`, `RATE_LIMITED`, `ORIGIN_NOT_ALLOWED` and ack codes from realtime-protocol.md (including `TARGET_NOT_FOUND` and `CANNOT_REMOVE_SELF`), each with a plain-language `detail` and `nextStep`
- [X] T012 [P] Implement the display-name schema in `packages/protocol/src/validation.ts`: trim; NFC normalize; "1 to 24 characters; letters, numbers, spaces, and `' - _ .`; no control, zero-width, or bidirectional override characters; no leading or trailing space"
- [X] T013 [P] Define client intent and server message schemas in `packages/protocol/src/messages.ts` per contracts/realtime-protocol.md: envelope `{ v: 1, type }`, `clientActionId` UUID on every intent, unknown fields rejected, frames at most 4 KB, chat `text` "1 to 500" characters, and the `member.remove` intent and `participant.removed` event
- [X] T014 [P] Define the lobby projection and event view types in `packages/protocol/src/views.ts` (participant `id`, `displayLabel`, `role`, `ready`, `connection`; `self`; no token or recovery fields)
- [X] T015 [P] Define `GameDescriptor` (`id`, `name`, `minParticipants`, `maxParticipants`, `settingsSchema`) in `packages/game-sdk/src/descriptor.ts` and the lifecycle contract in `packages/game-sdk/src/lifecycle.ts`: `onMatchStart(ctx: MatchContext)` where `MatchContext.endMatch()` lets the game report that its match is over, and `onMatchEnd`
- [X] T016 Implement environment parsing and validation in `apps/server/src/config/env.ts` (`PORT`, `NODE_ENV`, `ALLOWED_ORIGINS`, `MAX_ROOMS` default 20, `MAX_TOTAL_PARTICIPANTS` default 200, recovery window 10 minutes, heartbeat 20 seconds)
- [X] T017 [P] Implement structured logging with redaction of tokens, cookies, and invitation codes (by key name and in request-URL paths such as `/join/<code>` and `/api/invitations/<code>`) in `apps/server/src/observability/logger.ts`
- [X] T018 [P] Implement member-token issue, SHA-256 hashing, and constant-time verification (256-bit CSPRNG) in `apps/server/src/auth/tokens.ts`
- [X] T019 [P] Implement per-room cookie helpers (`mah_m_<roomId>`; `HttpOnly; Secure; SameSite=Strict; Path=/`; clear on leave or closure) in `apps/server/src/auth/cookies.ts`
- [X] T020 Define the `RoomStore` port in `apps/server/src/store/room-store.ts` and the in-memory implementation in `apps/server/src/store/memory-room-store.ts` (lookup by room id and by invitation code; bulk delete of a room and all its data)
- [X] T021 [P] Implement the game registry in `apps/server/src/games/registry.ts` and a test-only stub game in `apps/server/src/games/stub-game.ts` (descriptor plus start and end hooks; it calls `ctx.endMatch()` after its `durationSeconds` setting, "1 to 3600, default 30", using the injectable clock; no rules in the room module)
- [X] T022 Build the Fastify app in `apps/server/src/http/app.ts`: Helmet with strict CSP (self-only scripts), cookie and rate-limit plugins, `Origin` allow-list for state-changing requests, request size limits, `/healthz`, and static hosting of the built SPA with SPA fallback
- [X] T023 [P] Implement problem+json error mapping (clear message plus `nextStep`, never tokens, codes, or private room data) in `apps/server/src/http/problem.ts`
- [X] T024 Implement the WebSocket gateway skeleton in `apps/server/src/realtime/gateway.ts`: `/ws?room=<roomId>` upgrade with cookie authentication and `Origin` check, 4 KB frame limit, envelope validation via `packages/protocol`, connection registry in `apps/server/src/realtime/connections.ts`, and 20-second protocol pings
- [X] T025 [P] Create contract-test helpers that validate responses against `specs/001-base-platform-experience/contracts/rest-api.openapi.yaml` in `apps/server/tests/contract/helpers.ts`
- [X] T026 [P] Create integration-test helpers (start server on an ephemeral port, real HTTP client with cookie jar, real WebSocket client, controllable clock) in `apps/server/tests/integration/helpers.ts`
- [X] T027 [P] Create design tokens and light and dark themes (CSS custom properties; `prefers-color-scheme` default with manual override; WCAG 2.2 AA contrast) in `apps/web/src/styles/tokens.css` and `apps/web/src/styles/themes.css`
- [X] T028 [P] Create layout primitives (CSS grid, `dvh` units, safe-area insets, no fixed widths that overflow) in `apps/web/src/styles/layout.css`
- [X] T029 [P] Implement accessibility helpers (live-region announcer, focus-to-element helper, `useReducedMotion` hook) in `apps/web/src/a11y/announcer.tsx`, `apps/web/src/a11y/focus.ts`, and `apps/web/src/a11y/useReducedMotion.ts`
- [X] T030 Create the app shell with router (entry, `/join/:code`, `/room/:roomId`), providers, theme switch, and error boundary in `apps/web/src/app/App.tsx`, `apps/web/src/app/router.tsx`, and `apps/web/src/app/ErrorBoundary.tsx`
- [X] T031 [P] Implement the REST client (fetch with credentials, problem+json parsing, `Idempotency-Key` generation) in `apps/web/src/platform/api-client.ts`
- [X] T032 Implement the WebSocket client (connect, parse with shared schemas, snapshot and versioned event handling, gap detection that sends `resync`) in `apps/web/src/platform/ws-client.ts` and the room reducer in `apps/web/src/platform/room-state.ts`

**Checkpoint**: Foundation ready; user stories can begin

---

## Phase 3: User Story 1 - Create or Join a Private Room (Priority: P1) MVP

**Goal**: A visitor creates a private room with a display name and gets a code and invite link; others join with only a display name and the code or link; invalid and full rooms are explained.

**Independent Test**: One person creates a room and another joins from a separate browser using only the invitation; both see the same lobby and member list (spec US1; quickstart scenarios 1 to 3).

### Tests for User Story 1

- [X] T033 [P] [US1] Unit test the invitation code generator (10 characters from the 32-character alphabet `A-HJ-NP-Z2-9`, no repeats of the same code across 10,000 samples) in `apps/server/tests/unit/invitation.test.ts`
- [X] T034 [P] [US1] Unit test display-name validation and duplicate disambiguation (`Sam`, `Sam (2)`; names are never identity) in `apps/server/tests/unit/display-label.test.ts`
- [X] T035 [P] [US1] Contract tests for `POST /api/rooms`, `GET /api/invitations/{code}`, `POST /api/rooms/join`, and `GET /api/games` in `apps/server/tests/contract/entry.contract.test.ts`
- [X] T036 [P] [US1] Integration test: create, then join by code and by link, both members see the same member list in `apps/server/tests/integration/entry.test.ts`
- [X] T037 [P] [US1] Integration test: invalid, revoked, expired, and closed invitations return the same `INVITATION_UNAVAILABLE` body with no room data in `apps/server/tests/integration/invitation-privacy.test.ts`
- [X] T038 [P] [US1] Integration test: simultaneous joins on the last seat produce exactly one seat each and the loser gets `ROOM_FULL`; a room holds "at most 100 participants" and the service rejects beyond 20 rooms or 200 participants with `SERVICE_AT_CAPACITY` in `apps/server/tests/integration/capacity.test.ts`
- [X] T039 [P] [US1] Integration test: repeating create and join with the same `Idempotency-Key` returns the original result with no duplicate room or seat in `apps/server/tests/integration/idempotency.test.ts`
- [X] T040 [P] [US1] Integration test: join and preview are rate limited per IP (`RATE_LIMITED`) in `apps/server/tests/integration/rate-limit.test.ts`
- [X] T041 [P] [US1] E2E test: host creates a room and a second browser context joins via link with no account in `apps/web/tests/e2e/entry.spec.ts`

### Implementation for User Story 1

- [X] T042 [P] [US1] Implement invitation generation (CSPRNG, 10 characters from `A-HJ-NP-Z2-9`; status `ACTIVE` or `REVOKED`) in `apps/server/src/rooms/invitation.ts`
- [X] T043 [P] [US1] Implement display-label disambiguation (label only, never used for identity or authorization) in `apps/server/src/rooms/display-label.ts`
- [X] T044 [US1] Implement the `Room` and `Participant` models with roles `HOST` and `PLAYER` only, `version`, `status` (`LOBBY`, `IN_MATCH`, `CLOSED`), `matchStatus` (`NONE`, `IN_PROGRESS`, `ENDED`), and `settings.maxParticipants` "1 to 100, default 100" in `apps/server/src/rooms/room.ts` and `apps/server/src/rooms/participant.ts`
- [X] T045 [US1] Implement the lobby projection per recipient (no `tokenHash`, no recovery data; invitation only for HOST) in `apps/server/src/rooms/projection.ts`
- [X] T046 [US1] Implement `RoomService.createRoom` and `RoomService.joinRoom` (one seat and role per accepted join, capacity checks for room and service, `participant.joined` event with version increment) in `apps/server/src/rooms/room-service.ts`
- [X] T047 [P] [US1] Implement the idempotency-key store for create and join (bounded, expires with the room) in `apps/server/src/http/idempotency.ts`
- [X] T048 [US1] Implement routes `POST /api/rooms`, `GET /api/invitations/:code`, `POST /api/rooms/join` (setting the member cookie, uniform `INVITATION_UNAVAILABLE`, distinct `ROOM_FULL`, `Cache-Control: no-store` on invitation responses) in `apps/server/src/http/routes/rooms.ts` and `apps/server/src/http/routes/invitations.ts`
- [X] T049 [P] [US1] Implement `GET /api/games` from the registry in `apps/server/src/http/routes/games.ts`
- [X] T050 [US1] Complete the gateway connect flow: authenticate the session, attach the connection, send the first `snapshot`, and broadcast `participant.joined` in `apps/server/src/realtime/gateway.ts` and `apps/server/src/realtime/broadcast.ts`
- [X] T051 [US1] Build the entry screens: create-room form and join form with code entry in `apps/web/src/features/entry/EntryPage.tsx`, `apps/web/src/features/entry/CreateRoomForm.tsx`, and `apps/web/src/features/entry/JoinRoomForm.tsx`
- [X] T052 [US1] Build the invite-link join page (`/join/:code`, prefilled code, preview check, `ROOM_FULL` and unavailable messages with a safe retry) in `apps/web/src/features/entry/JoinRoutePage.tsx`
- [X] T053 [US1] Build the host invite panel (shows code and link, copy button, Web Share API where available) in `apps/web/src/features/lobby/InvitePanel.tsx`
- [X] T054 [US1] Build the accessible error summary (announced in a live region, focus moved on failure, plain language plus next step) in `apps/web/src/a11y/ErrorSummary.tsx` and use it in the entry forms
- [X] T055 [US1] Build the room page shell and member list (label, role, connection, readiness) wired to the WebSocket client in `apps/web/src/features/lobby/RoomPage.tsx` and `apps/web/src/features/lobby/MemberList.tsx`

**Checkpoint**: User Story 1 is independently testable and is the MVP

---

## Phase 4: User Story 2 - Manage the Lobby and Start a Match (Priority: P1)

**Goal**: The host selects a game, edits shared settings, regenerates the invitation, and starts or rematches; players control only their own readiness and chat; everyone sees consistent state.

**Independent Test**: In a room with a host and at least one player, verify lobby information, role-specific controls, readiness, host game and settings controls, chat, and start and rematch eligibility (spec US2; quickstart scenarios 4 and 5).

### Tests for User Story 2

- [X] T056 [P] [US2] Unit test start eligibility (game selected; participant count within the game's range; every PLAYER seat connected and ready; HOST counts as ready) and each rejection code in `apps/server/tests/unit/match-eligibility.test.ts`
- [X] T057 [P] [US2] Unit test settings validation (`maxParticipants` "1 to 100" and not below the current seat count; game settings via `settingsSchema`) in `apps/server/tests/unit/settings.test.ts`
- [X] T058 [P] [US2] Integration test: ready, game selection, settings, start, match end (stub game calls `ctx.endMatch()`), and rematch produce the same ordered `version` and state for all members in `apps/server/tests/integration/lobby.test.ts`
- [X] T059 [P] [US2] Integration test: a PLAYER attempting host-only intents or changing another member's readiness gets `NOT_HOST` or `FORBIDDEN_TARGET` and no state or version change in `apps/server/tests/integration/lobby-permissions.test.ts`
- [X] T060 [P] [US2] Integration test: chat from members only, sender taken from the session, text "1 to 500" characters, last 200 messages kept, 5 messages per 10 seconds per participant, and no chat visible to non-members in `apps/server/tests/integration/chat.test.ts`
- [X] T061 [P] [US2] Integration test: repeating an intent with the same `clientActionId` returns the original `ack` and applies it once in `apps/server/tests/integration/idempotent-intents.test.ts`
- [X] T062 [P] [US2] Contract test: all intents and events validate against `packages/protocol` schemas and unknown fields are rejected in `apps/server/tests/contract/realtime.contract.test.ts`
- [X] T063 [P] [US2] E2E test: multi-context lobby with ready, game select, start, and rematch in `apps/web/tests/e2e/lobby.spec.ts`

### Implementation for User Story 2

- [X] T064 [P] [US2] Implement the per-participant action log (last 100 results or 10 minutes, whichever is smaller; kept on the participant so it survives reconnect) for `clientActionId` idempotency in `apps/server/src/rooms/action-log.ts`
- [X] T065 [P] [US2] Implement the intent rate limiter (20 intents and 5 chat messages per 10 seconds per participant) in `apps/server/src/realtime/rate-limit.ts`
- [X] T066 [US2] Implement lobby rules (own readiness, game selection, settings update, invitation regeneration that revokes the old code) in `apps/server/src/rooms/lobby.ts`
- [X] T067 [US2] Implement start, match end (handle `ctx.endMatch()` by setting `matchStatus` `ENDED` and calling `onMatchEnd`), rematch, and return-to-lobby with eligibility reasons, calling the game lifecycle through `packages/game-sdk` only, in `apps/server/src/rooms/match.ts`
- [X] T068 [US2] Implement room chat (server-set sender, "1 to 500" characters, last 200 kept) in `apps/server/src/rooms/chat.ts`
- [X] T069 [US2] Implement the intent dispatcher: validate, authorize by session role, dedupe by `clientActionId`, apply atomically, increment `version`, send `ack`, broadcast `event` in `apps/server/src/realtime/intents.ts`
- [X] T070 [US2] Implement the `resync` intent and per-recipient snapshot refresh in `apps/server/src/realtime/gateway.ts`
- [X] T071 [P] [US2] Build the readiness toggle (own state only) in `apps/web/src/features/lobby/ReadyToggle.tsx`
- [X] T072 [P] [US2] Build the game selector and settings panel (host-only controls, read-only view for players) in `apps/web/src/features/lobby/GameSelect.tsx` and `apps/web/src/features/lobby/SettingsPanel.tsx`
- [X] T073 [P] [US2] Build start and rematch controls that show the specific blocking reason in `apps/web/src/features/lobby/MatchControls.tsx`
- [X] T074 [P] [US2] Build the chat panel (plain-text rendering, no HTML, accessible message log) in `apps/web/src/features/chat/ChatPanel.tsx`
- [X] T075 [US2] Add invitation regeneration to the host invite panel in `apps/web/src/features/lobby/InvitePanel.tsx`
- [X] T076 [US2] Send intents with `clientActionId` and handle `ack` states (pending, accepted, rejected with next step) in `apps/web/src/platform/intent-queue.ts`
- [X] T129 [P] [US2] Integration test: host `member.remove` releases the seat and deletes recovery data immediately, the removed socket closes with 4012, the host cannot remove themselves (`CANNOT_REMOVE_SELF`), a PLAYER gets `NOT_HOST`, an unknown target gets `TARGET_NOT_FOUND`, and the removed browser can only return as a new participant through a valid invitation (FR-005) in `apps/server/tests/integration/member-removal.test.ts`
- [X] T130 [US2] Implement member removal (`member.remove` intent, `participant.removed` event, seat and recovery release, close 4012, re-evaluate start eligibility) in `apps/server/src/rooms/lobby.ts` and `apps/server/src/realtime/intents.ts`
- [X] T131 [P] [US2] Build the host-only remove-member control with confirmation, and the removed-member notice that calls Leave to clear the credential, in `apps/web/src/features/lobby/RemoveMemberDialog.tsx` and `apps/web/src/features/lobby/MemberList.tsx`

**Checkpoint**: User Stories 1 and 2 work independently

---

## Phase 5: User Story 3 - Recover and Rejoin (Priority: P1)

**Goal**: A temporary disconnect keeps the seat, role, and state for 10 minutes; reconnect restores them with no duplicate actions; Leave is distinct; after 10 minutes rejoining the same room is rejected.

**Independent Test**: Interrupt a participant's connection, restore it within 10 minutes, and verify the same seat, role, state, and no duplicated action; return after 10 minutes and verify rejection (spec US3; quickstart scenarios 7 to 9).

### Tests for User Story 3

- [X] T077 [P] [US3] Integration test: socket loss or two missed 20-second pings marks the participant `DISCONNECTED` and not departed, and reconnect inside the "10 minutes" window restores seat, role, and readiness with a fresh `snapshot` in `apps/server/tests/integration/recovery.test.ts`
- [X] T078 [P] [US3] Integration test (controllable clock): after the 10-minute window the seat and recovery record are deleted, the upgrade is refused with HTTP 410 `RECOVERY_EXPIRED`, and a `POST /api/rooms/join` carrying that room's cookie is rejected the same way; nothing is restored in `apps/server/tests/integration/recovery-expiry.test.ts`
- [X] T079 [P] [US3] Integration test: unacknowledged intents resent after reconnect are applied once and return the original `ack` in `apps/server/tests/integration/recovery-idempotency.test.ts`
- [X] T080 [P] [US3] Integration test: explicit Leave releases the seat immediately, deletes the recovery record, and clears the cookie, and a repeated Leave is a no-op `204` in `apps/server/tests/integration/leave.test.ts`
- [X] T081 [P] [US3] Integration test: a newer connection supersedes the older one (close code 4009) in `apps/server/tests/integration/supersede.test.ts`
- [X] T082 [P] [US3] Contract tests for `GET /api/rooms/{roomId}/session` and `POST /api/rooms/{roomId}/leave` in `apps/server/tests/contract/session.contract.test.ts`
- [X] T083 [P] [US3] E2E test: offline and online toggle plus page refresh restores the seat without losing or doubling accepted actions in `apps/web/tests/e2e/recovery.spec.ts`

### Implementation for User Story 3

- [X] T084 [US3] Implement the recovery manager (start the 10-minute window on disconnect, clear on reconnect, expire and delete the seat and recovery record at expiry, never serialize recovery data) in `apps/server/src/rooms/recovery.ts`
- [X] T085 [US3] Implement heartbeat-based disconnect detection and the supersede rule (4009) in `apps/server/src/realtime/connections.ts` and `apps/server/src/realtime/gateway.ts`
- [X] T086 [US3] Implement reconnect handling: reattach the existing participant, send `snapshot`, broadcast `participant.connection` in `apps/server/src/realtime/gateway.ts`
- [X] T087 [US3] Implement `RoomService.leaveRoom` (immediate seat release, `participant.left`, idempotent) in `apps/server/src/rooms/room-service.ts`
- [X] T088 [US3] Implement `GET /api/rooms/:roomId/session` (200, 401, 410 `RECOVERY_EXPIRED`) and `POST /api/rooms/:roomId/leave` (204, clears cookie) in `apps/server/src/http/routes/session.ts`
- [X] T089 [US3] Reject join requests that carry the cookie of a room the caller no longer holds a seat in with `RECOVERY_EXPIRED` in `apps/server/src/http/routes/rooms.ts`
- [X] T090 [US3] Implement the reconnect manager (reconnect on `visibilitychange` to visible, `pageshow`, `online`, and socket close with exponential backoff and jitter capped at 15 seconds; no auto-reconnect after 4009 or 4010) in `apps/web/src/platform/reconnect.ts`
- [X] T091 [US3] Resend unacknowledged intents after reconnect in `apps/web/src/platform/intent-queue.ts`
- [X] T092 [P] [US3] Build the connection status banner ("Reconnecting", "Back online", announced politely, never implies departure) in `apps/web/src/features/recovery/ConnectionBanner.tsx`
- [X] T093 [P] [US3] Build the recovery-expired and room-unavailable screens (clear explanation plus safe next step) in `apps/web/src/features/recovery/RecoveryExpired.tsx`
- [X] T094 [US3] Build the Leave control with confirmation that calls the leave endpoint and returns to entry in `apps/web/src/features/lobby/LeaveButton.tsx`

**Checkpoint**: User Stories 1 to 3 work independently

---

## Phase 6: User Story 4 - Transfer Host and Protect Room Authority (Priority: P1)

**Goal**: The host can hand off management; authority comes only from server-recognized membership and role; the host stays subject to game rules; host loss follows the published handoff policy; closing a room deletes its data.

**Independent Test**: Transfer the host role, attempt host-only actions from the new host and a player, and check game actions follow normal game rules (spec US4; quickstart scenarios 5, 6, 10, and 11).

### Tests for User Story 4

- [X] T095 [P] [US4] Integration test: messages with forged or stale user, host, or role identifiers are rejected, protected state is unchanged, and no field in a body ever affects authorization in `apps/server/tests/integration/authority.test.ts`
- [X] T096 [P] [US4] Integration test: explicit `host.transfer` makes the target HOST and the former host PLAYER, with exactly one HOST at every observed version, including when it races with another room action in `apps/server/tests/integration/handoff.test.ts`
- [X] T097 [P] [US4] Unit test auto-handoff ordering (seat holders, connected first, then earliest `joinedAt`) and closure when none is eligible in `apps/server/tests/unit/handoff-policy.test.ts`
- [X] T098 [P] [US4] Integration test: host leaves, or stays disconnected past the 10-minute window, and the room continues with a single new HOST and no global admin in `apps/server/tests/integration/host-loss.test.ts`
- [X] T099 [P] [US4] Integration test: the host's game action passes through the same game-rule check as a PLAYER's, using the stub game, in `apps/server/tests/integration/host-game-rules.test.ts`
- [X] T100 [P] [US4] Integration test: `room.close`, no remaining seat holders, and no handoff possible each delete chat, recovery records, participants, and the invitation, close sockets with 4010, and leave nothing retrievable in `apps/server/tests/integration/closure.test.ts`
- [X] T101 [P] [US4] Integration test: no response, event, error, or log line for another member contains tokens, cookies, invitation codes (for non-hosts), or recovery data in `apps/server/tests/integration/privacy.test.ts`
- [X] T102 [P] [US4] E2E test: host transfer and room close across two browser contexts in `apps/web/tests/e2e/host.spec.ts`

### Implementation for User Story 4

- [X] T103 [US4] Implement the handoff policy (explicit transfer and automatic handoff; atomic with a `version` increment; stale host rejected with `NOT_HOST`; `TARGET_NOT_ELIGIBLE` for non-seat-holders) in `apps/server/src/rooms/handoff.ts`
- [X] T104 [US4] Trigger automatic handoff from Leave and recovery expiry of the host in `apps/server/src/rooms/room-service.ts` and `apps/server/src/rooms/recovery.ts`
- [X] T105 [US4] Implement room closure that deletes all room, chat, participant, invitation, and recovery data and closes sockets (4010) in `apps/server/src/rooms/closure.ts`
- [X] T106 [US4] Wire `host.transfer` and `room.close` intents and the `host.changed` and `room.closed` events in `apps/server/src/realtime/intents.ts`
- [X] T107 [US4] Enforce that authorization reads only the session participant and role, and strip or reject any identity field from message bodies, in `apps/server/src/realtime/authorize.ts`
- [X] T108 [US4] Route host game actions through the same game-rule path as player actions via the game lifecycle in `apps/server/src/rooms/match.ts` and `apps/server/src/games/stub-game.ts`
- [X] T109 [P] [US4] Build the host-transfer dialog (select an eligible member) and the close-room confirmation in `apps/web/src/features/lobby/HostTransferDialog.tsx` and `apps/web/src/features/lobby/CloseRoomDialog.tsx`
- [X] T110 [P] [US4] Announce `host.changed` and room closure to all members through the live region and show the closed-room screen in `apps/web/src/features/lobby/RoomPage.tsx` and `apps/web/src/features/recovery/RecoveryExpired.tsx`

**Checkpoint**: All P1 stories work independently

---

## Phase 7: User Story 5 - Use the Platform Accessibly Across Devices (Priority: P2)

**Goal**: The shared experience works on laptop, Android, and iPhone browsers in portrait and landscape, with mouse, trackpad, keyboard, and touch, light and dark modes, reduced motion, and accessible errors.

**Independent Test**: Complete host and player journeys on real laptop, Android, and iPhone devices, including mixed-device rooms and orientation changes (spec US5; quickstart scenario 13).

### Tests for User Story 5

- [X] T111 [P] [US5] Automated axe scan of entry, join, and room screens in light and dark themes in `apps/web/tests/e2e/a11y.spec.ts`
- [X] T112 [P] [US5] Keyboard-only E2E of create, join, lobby, ready, chat, and leave with visible focus checks in `apps/web/tests/e2e/keyboard.spec.ts`
- [X] T113 [P] [US5] E2E with `prefers-reduced-motion` verifying no non-essential motion, and development-only emulated portrait and landscape checks for no horizontal overflow in `apps/web/tests/e2e/responsive.spec.ts`
- [X] T114 [P] [US5] Component tests that every error state renders a live-region message with a next step in `apps/web/tests/unit/errors.test.tsx`

### Implementation for User Story 5

- [X] T115 [US5] Apply the responsive room layout (single column on phones, multi-pane on laptops; no horizontal overflow at 320 CSS pixels and at increased text size) in `apps/web/src/features/lobby/RoomPage.css` and `apps/web/src/styles/layout.css`
- [X] T116 [P] [US5] Add visible focus styles on every interactive element and touch targets of at least 44 by 44 CSS pixels in `apps/web/src/styles/focus.css`
- [X] T117 [P] [US5] Implement the theme switch (system default, manual light and dark, persisted locally) in `apps/web/src/app/ThemeSwitch.tsx`
- [X] T118 [P] [US5] Honor `prefers-reduced-motion` across all transitions and animations in `apps/web/src/styles/motion.css`
- [X] T119 [US5] Audit entry, lobby, chat, and banner components for semantic roles, labels, and logical tab order, and fix findings in `apps/web/src/features/`

**Checkpoint**: All user stories are functionally complete

---

## Phase 8: Polish and Cross-Cutting Concerns

**Purpose**: Capacity, security, release evidence, and spec alignment

- [X] T120 Implement the load harness profiles `2x100` and `20x10` measuring state consistency and lobby change latency in `tools/load/src/index.ts`
- [X] T121 Run the load profiles and record results (SC-009: no lost or misrepresented state; SC-010: at least 95% of changes visible within 1 second) in `specs/001-base-platform-experience/acceptance/load-results.md`
- [X] T122 [P] Add a build-time budget check for entry and lobby route JS under 200 KB gzipped and confirm no Babylon.js code is bundled in `apps/web/vite.config.ts`
- [X] T123 [P] Security review against the constitution (Principle V) and OWASP Top 10: CSP, origin checks, cookie flags, rate limits, log redaction, dependency audit; record findings in `specs/001-base-platform-experience/acceptance/security-review.md`
- [X] T124 [P] Create the acceptance record template (device, OS and version, browser and version, tester, date, role, scenario, outcome) in `specs/001-base-platform-experience/acceptance/TEMPLATE.md`
- [ ] T125 Record the supported browser and OS release matrix (current and previous major versions) in `specs/001-base-platform-experience/acceptance/browser-matrix.md`
- [x] T126 Update the spec "Overall capacity" open decision to 20 concurrent rooms and 200 total connected participants, add host member removal (FR-005), and confirm the FR-025 cookie-based interpretation, in `specs/001-base-platform-experience/spec.md` (done 2026-10-29)
- [ ] T127 Execute real-device acceptance on a real laptop, Android phone, and iPhone as HOST and PLAYER, in mixed-device rooms with the host role rotated across device classes, covering quickstart scenarios 1, 4, 5, 7, 9, 10, and 13, portrait and landscape, background and resume, and screen-reader checks (VoiceOver on iPhone, TalkBack on Android) that errors and status changes are announced; record each run in `specs/001-base-platform-experience/acceptance/` (manual; emulation does not count)
- [ ] T128 Walk through every scenario in `specs/001-base-platform-experience/quickstart.md` and record the outcome in `specs/001-base-platform-experience/acceptance/quickstart-run.md`
- [ ] T132 Run moderated first-time-user sessions and record that at least 90% of participants create or join a room without assistance within two minutes using only a display name and an invitation (SC-001) in `specs/001-base-platform-experience/acceptance/usability-sessions.md` (manual)
- [ ] T133 Deploy a preview to Render, verify WebSocket connections, cookies, and heartbeats work through Render's proxy, and record the result in `specs/001-base-platform-experience/acceptance/render-preview.md` (required before T127)
- [X] T134 Implement graceful shutdown that closes sockets with code 1001 and stops accepting new rooms in `apps/server/src/main.ts`, with an integration test in `apps/server/tests/integration/shutdown.test.ts`
- [X] T135 [P] Add a dependency-boundary lint rule or test that fails when `apps/server/src/rooms` imports `apps/server/src/games` implementations or when `packages/game-sdk` imports from `apps/` in `eslint.config.js` and `apps/server/tests/unit/boundaries.test.ts` (Principles VIII and X)

---

## Dependencies and Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Setup; blocks all stories
- **User Stories (Phases 3 to 7)**: Depend on Foundational
- **Polish (Phase 8)**: Depends on the stories it covers; T127 needs all P1 stories, US5, and T133

### User Story Dependencies

- **US1 (P1)**: After Foundational; no dependency on other stories. MVP.
- **US2 (P1)**: After Foundational; uses the room and join flow from US1 (T044 to T050).
- **US3 (P1)**: After Foundational; uses the room and gateway from US1 and the action log from US2 (T064) for resend idempotency.
- **US4 (P1)**: After US1; uses intents from US2 (T069) and the recovery manager from US3 (T084) for host-expiry handoff, so start it after US2 and US3.
- **US5 (P2)**: After Foundational; its UI tasks refine screens from US1 to US4, so complete it after those screens exist.

```text
Setup -> Foundational -> US1 -> US2 -> US3 -> US4 -> Polish
                          \-----------------------> US5 -/
```

### Within Each User Story

- Write the tests first and confirm they fail before implementing
- Models and rules, then services, then routes and gateway, then UI
- Complete a story and its checkpoint before treating it as releasable

### Parallel Opportunities

- Setup T002 to T009 run in parallel after T001
- Foundational T011 to T015, T017 to T019, T021, T023, T025 to T029, and T031 run in parallel; T020, T022, T024, T030, and T032 follow their inputs
- Within each story, all `[P]` test tasks run in parallel, and `[P]` UI tasks run in parallel with server work once the contract is fixed
- With several developers: after Foundational, one takes US1, and US2 and US3 server work can start together once US1's room service (T046) lands

## Parallel Example: User Story 1

```text
Tests in parallel:
  T033 apps/server/tests/unit/invitation.test.ts
  T034 apps/server/tests/unit/display-label.test.ts
  T035 apps/server/tests/contract/entry.contract.test.ts
  T036 apps/server/tests/integration/entry.test.ts
  T037 apps/server/tests/integration/invitation-privacy.test.ts
Models in parallel:
  T042 apps/server/src/rooms/invitation.ts
  T043 apps/server/src/rooms/display-label.ts
  T047 apps/server/src/http/idempotency.ts
```

## Implementation Strategy

### MVP First (User Story 1 only)

1. Complete Phase 1 and Phase 2
2. Complete Phase 3 (US1)
3. Stop and validate quickstart scenarios 1 to 3 with two real browsers
4. Deploy a Render preview and demo

### Incremental Delivery

1. Foundation, then US1: rooms and invitations
2. Add US2: lobby, chat, start and rematch
3. Add US3: recovery and Leave
4. Add US4: host handoff, authority hardening, and closure
5. Add US5: accessibility and device polish
6. Run Phase 8 load, security, and real-device acceptance; the feature is releasable only with device evidence for all required devices and roles (constitution)

## Notes

- Tasks are traceable to spec stories and FRs through the story label, the traceability table below, and the test names; task IDs run T001 to T135 (T129 to T135 were added after analysis, so they appear out of numeric order)
- Commit after each task or logical group, and never commit secrets or `.env` files
- Do not mark acceptance tasks (T121, T127, T128, T132, T133) complete without recorded evidence

## Traceability

| Requirement | Tasks |
|---|---|
| FR-001 | T046, T048, T051 |
| FR-002 | T037, T042, T048, T052 |
| FR-003 | T044 |
| FR-004 | T095, T107 |
| FR-005 | T066, T067, T075, T103, T129 to T131 |
| FR-006 | T059, T066 |
| FR-007 | T099, T108 |
| FR-008 | T045, T055 |
| FR-009 | T058, T069 |
| FR-010 | T077, T084 |
| FR-011 | T079, T086, T091 |
| FR-012 | T090, T093 |
| FR-013 | T098, T103, T104 |
| FR-014 | T006, T125, T127 |
| FR-015 | T112, T116, T118 |
| FR-016 | T027, T117 |
| FR-017 | T011, T054, T114 |
| FR-018 | T045, T101 |
| FR-019 | T038, T120 |
| FR-020 | T015, T021, T135 |
| FR-021, FR-022 | T124, T127 |
| FR-023 | T018, T019, T095 |
| FR-024 | T100, T105 |
| FR-025 | T078, T089 |
| SC-001 | T132 |
| SC-002 | T036, T058, T127 |
| SC-003 | T127 |
| SC-004 | T077, T079 |
| SC-005 | T059, T095 |
| SC-006 | T113, T127 |
| SC-007 | T054, T114, T127 |
| SC-008 | T112, T113 |
| SC-009, SC-010 | T120, T121 |
| SC-011 | T100 |
| SC-012 | T078 |
