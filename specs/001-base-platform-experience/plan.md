# Implementation Plan: Base Platform and Experience

**Branch**: `001-base-platform-experience` | **Date**: 2026-10-29 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-base-platform-experience/spec.md`

## Summary

Deliver the account-free room platform for myArena Hub: create or join a private room with a
display name and code or invite link, a shared lobby (members, readiness, game selection,
settings, chat), start and rematch, 10-minute seat recovery, host handoff, and role-based
authorization. Delivery is browser-native on laptop, Android, and iPhone.

Technical approach (details in [research.md](research.md)):

- A single Node.js (TypeScript) service on Render serves the REST API, the WebSocket endpoint,
  and the built React single-page app from one origin.
- The server is authoritative for membership, roles, lobby state, and recovery. Clients send
  idempotent intents and render server snapshots and events.
- Room state is held in memory behind a `RoomStore` port. PostgreSQL and Redis are not used
  in this feature (see Storage and Complexity Tracking).
- Membership is authenticated by a server-issued opaque credential in an HttpOnly cookie. It
  is never derived from display names or client-supplied IDs.
- Babylon.js and the richer Game SDK concepts (turns, timers, scores) are not needed for the
  platform scope. They are deferred to the game features. This feature only defines the
  platform-to-game contract (`game-sdk` descriptor and lifecycle) and keeps 3D code out of
  the base bundle.

## Technical Context

**Language/Version**: TypeScript 5.x (strict) on Node.js 24 LTS (server) and evergreen browsers (web)

**Primary Dependencies**:
- Web: React 19, React Router, Vite, Zod (shared protocol validation). Plain CSS with custom
  properties for light and dark themes. No UI kit.
- Server: Fastify with `@fastify/websocket` (built on `ws`), `@fastify/cookie`,
  `@fastify/helmet`, `@fastify/rate-limit`, `@fastify/static`, Zod, Pino (with redaction).
- Shared: `packages/protocol` (message and error schemas) and `packages/game-sdk` (game
  descriptor and lifecycle contract).
- Deferred to game features: Babylon.js. Not loaded by this feature.

**Storage**: In-memory room state behind a `RoomStore` port; no database in this feature.
PostgreSQL is deferred to the first feature that persists data (profiles, match history,
statistics). Redis is not introduced.

**Testing**: Vitest (unit and server integration with real WebSocket clients), React Testing
Library, Playwright with `@axe-core/playwright` (multi-context E2E and automated a11y; viewport
emulation is for development only), a Node load harness for capacity, and recorded manual
real-device acceptance.

**Target Platform**: Render web service (single always-on instance, Node.js) serving the SPA;
clients are current and previous major versions of Chrome, Edge, Firefox, and Safari on
Windows and macOS, Chrome on Android, and Safari on iOS (iPhone). The exact browser and OS
matrix is recorded during acceptance planning.

**Project Type**: Web application (React SPA + Node.js real-time service) in an npm workspaces monorepo

**Performance Goals**:
- At least 95% of accepted lobby changes visible to all connected members within 1 second
  (SC-010) at launch capacity.
- Room create and join complete within the 2-minute first-time user goal (SC-001); API p95
  under 300 ms at launch capacity.
- Initial JS for the entry and lobby routes under 200 KB gzipped (no 3D code).

**Constraints**:
- Room state, chat, and recovery data are deleted at room closure. Recovery data is deleted
  at closure or 10 minutes after disconnection, whichever is first (FR-024).
- No credentials, recovery data, or membership tokens in logs, errors, or other members'
  views.
- WCAG 2.2 AA contrast and focus; keyboard, touch, and reduced-motion support.
- Rooms are lost on a service restart or deploy (accepted limitation; clients receive a clear
  "room unavailable" result).
- One service instance only. A second instance requires Redis-backed shared state first.

**Scale/Scope**: Launch target of 20 concurrent rooms and 200 total connected participants,
with up to 100 participants in a single room (FR-019). Load acceptance runs both a
2 x 100 profile and a 20 x 10 profile. The target was chosen by the product owner on
2026-10-29 and is reflected in the spec.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The constitution is a draft (0.1.0-draft, not ratified); this check applies it as written.

| Principle | Gate | Pre-research | Post-design |
|-----------|------|--------------|-------------|
| I. Account-Free Play | Join with display name and code or link only; unguessable codes | Pass | Pass: 10-character code (about 50 bits) plus join rate limiting; no registration anywhere |
| II. Browser-First, Mixed-Device | Works in current browsers on laptop, Android, iPhone; mixed rooms | Pass | Pass: single SPA, browserslist for current and previous major versions, real-device acceptance matrix |
| III. Two Roles, No Global Admin | Only HOST and PLAYER; handoff on leave or loss | Pass | Pass: `RoomRole` has two values; handoff policy in [data-model.md](data-model.md); no admin endpoints |
| IV. Server-Authoritative | Server decides permissions and state; clients send intents | Pass | Pass: intent-only protocol in [contracts/realtime-protocol.md](contracts/realtime-protocol.md); identity from server session only |
| V. Security and Privacy | Secure auth, no secrets in logs, role-scoped views | Pass | Pass: hashed opaque tokens, HttpOnly cookie, projection per participant, Pino redaction, secrets via Render env vars |
| VI. Reliable Reconnection | Grace period, no loss or duplication | Pass | Pass: 10-minute recovery, `clientActionId` idempotency, versioned snapshots and resync |
| VII. Accessible, Responsive | Keyboard, touch, reduced motion, WCAG 2.2 AA, resume | Pass | Pass: accessibility tasks and automated axe checks planned; manual keyboard and reduced-motion acceptance |
| VIII. Platform/Game Separation | Platform has no game rules; games use platform contracts | Pass | Pass: `game-sdk` descriptor and lifecycle only; the server `rooms` module never imports a game |
| IX. Evidence-Based Delivery | Traceable tasks and evidence | Pass | Pass: acceptance record format defined in [quickstart.md](quickstart.md); nothing is claimed done |
| X. Simple Architecture | Simplest justified design | Pass with note | Pass with justification: in-memory store, single instance, no DB or Redis; see Complexity Tracking for the monorepo split |
| XI. Clean, Intuitive Design | Clean UI, light and dark, minimal 3D | Pass | Pass: no 3D in this feature; theme tokens for both modes |

No unjustified violations. Gate result: PASS.

## Project Structure

### Documentation (this feature)

```text
specs/001-base-platform-experience/
├── plan.md                              # This file
├── research.md                          # Phase 0 output
├── data-model.md                        # Phase 1 output
├── quickstart.md                        # Phase 1 output
├── contracts/
│   ├── rest-api.openapi.yaml            # Create, join, leave, preview, session probe, health
│   └── realtime-protocol.md             # WebSocket envelope, intents, events, close codes
├── checklists/
│   └── requirements.md
├── acceptance/                          # Created during acceptance; real-device records
└── tasks.md                             # Created later by /speckit-tasks
```

### Source Code (repository root)

```text
apps/
├── server/
│   ├── src/
│   │   ├── config/                      # Environment parsing and validation
│   │   ├── http/                        # REST routes, error mapping, security plugins, static hosting
│   │   ├── realtime/                    # WebSocket gateway, connection registry, heartbeat, broadcast
│   │   ├── rooms/                       # Domain: Room, Participant, roles, lobby rules, recovery, handoff
│   │   ├── auth/                        # Token issue, hash, verify; cookie handling
│   │   ├── games/                       # Game registry (reads game-sdk descriptors) and a test stub game
│   │   ├── store/                       # RoomStore port and in-memory implementation
│   │   └── observability/               # Structured logging with redaction, metrics counters
│   └── tests/
│       ├── unit/
│       ├── integration/                 # Real HTTP and WebSocket clients
│       └── contract/                    # Responses validated against contracts/
└── web/
    ├── src/
    │   ├── app/                         # Router, providers, theme, error boundary
    │   ├── features/
    │   │   ├── entry/                   # Create, join, invite preview
    │   │   ├── lobby/                   # Members, readiness, game selection, settings, start and rematch
    │   │   ├── chat/                    # Room chat
    │   │   └── recovery/                # Connection status, resume handling, expiry messaging
    │   ├── platform/                    # WebSocket client, resync, idempotent intent queue
    │   ├── a11y/                        # Live regions, focus management, reduced-motion hook
    │   └── styles/                      # Tokens, light and dark themes, layout primitives
    └── tests/
        ├── unit/
        └── e2e/                         # Playwright multi-context journeys and axe checks

packages/
├── protocol/                            # Zod schemas: messages, errors, view models (shared by web and server)
└── game-sdk/                            # GameDescriptor and lifecycle contract only

tools/
└── load/                                # WebSocket load harness for SC-009 and SC-010

render.yaml                              # Render blueprint: one web service, health check, env var keys
```

**Structure Decision**: Web application layout in an npm workspaces monorepo. `apps/server`
owns authority, `apps/web` owns presentation, `packages/protocol` is the single source of
truth for wire shapes, and `packages/game-sdk` is the only surface game features may depend
on. The server `rooms` module has no dependency on `games` implementations, which preserves
Principle VIII. A single Render web service serves the built SPA, so cookies are same-origin
and no CORS is needed.

## Complexity Tracking

| Item | Why Needed | Simpler Alternative Rejected Because |
|------|------------|-------------------------------------|
| Four workspaces (`web`, `server`, `protocol`, `game-sdk`) | Web and server must share validated wire schemas; games must depend on a narrow contract, not on platform internals (Principle VIII) | A single package lets games and the web client import server internals, and duplicated schemas drift |
| In-memory store behind a `RoomStore` port instead of PostgreSQL | The spec requires deleting all room, chat, and recovery data at closure and persists no profiles or history; 200 participants fit in one process | A database adds migrations and deletion jobs for data that must not outlive the room; the port keeps a later move to PostgreSQL or Redis possible |
| Single instance, no Redis | Launch target of 200 participants and 20 rooms is well within one Node process | Redis adds an operational dependency and pub/sub complexity with no present need; the trigger to add it is documented in [research.md](research.md) |
