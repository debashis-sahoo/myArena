# Implementation Plan: Platform Core, Visual Hub & Room Engine

**Branch**: `001-platform-hub-rooms` | **Date**: 2026-11-01 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-platform-hub-rooms/spec.md`

## Summary

Build the myArena platform core as a single deployable web service: a hyper-colorful **myArena Hub** with four uniform game
cards, a Ludo launch modal (Play with AI / Play Online), a **private room engine** (unique room IDs, invite links, exactly
one host, 2 to 4 seats, real-time presence), **real-time chat**, and **Render-ready deployment** with a free-plan keepalive.

Technical approach (details in [research.md](research.md)):

- One TypeScript monorepo, one Node.js 22 web service serving a React (Vite) single-page app, a Socket.IO real-time channel,
  and `/healthz`, all on one origin so production uses `wss` and needs no CORS.
- The **server is authoritative** for rooms, seats, host, capacity, start rules, presence, and chat; clients send intents and
  render full `room:state` snapshots.
- Room state is **in memory only** (temporary rooms, free plan, single instance). Redeploys end rooms with a clear message.
- **Keepalive** relies on Socket.IO's short ping/pong heartbeat: Render counts WebSocket messages from open connections as
  traffic, so active rooms stay connected and awake while empty servers can sleep.
- Graphics are custom inline SVG and CSS with synthesized Web Audio sounds; the layout is responsive by viewport shape so
  the game stage uses the largest available space in portrait and landscape.
- A **platform-to-game contract** ([contracts/game-module.md](contracts/game-module.md)) and a placeholder game module let
  future games reuse all room capabilities without reimplementing them.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 22 LTS (server and tooling); React 19 in the browser

**Primary Dependencies**: Express, Socket.IO 4, zod (payload validation), helmet (security headers), pino (JSON logging);
React, react-router, Vite (client). No UI component library and no database client

**Storage**: In-memory only on the server (rooms, seats, chat ring buffers); guest profile in browser `localStorage`.
No persistent storage

**Testing**: Minimal by constitution. Manual verification scenarios in [quickstart.md](quickstart.md) plus one headless
two-client smoke script (`npm run smoke`). No unit or integration suites

**Target Platform**: Render.com Web Service (Free plan, single instance, Linux, Node 22) serving modern evergreen browsers
on phones, tablets, laptops, and desktops

**Project Type**: Web application, single deployable (npm workspaces: `shared`, `server`, `client`)

**Performance Goals**: Room code and invite link visible within 2 s of "Play Online" (SC-002); presence changes within 2 s,
abrupt disconnects within 10 s (SC-003); chat delivery within 1 s for 95% of sends (SC-004); animations at 60 fps on
mid-range phones

**Constraints**: Free plan: 750 instance hours per month, 512 MB RAM, 0.1 CPU, one instance, ephemeral disk, spin-down after
15 minutes without inbound traffic, roughly one-minute cold start; bind to `PORT` on `0.0.0.0`; `wss` only in production;
no secrets in source

**Scale/Scope**: At least 50 simultaneous rooms of up to 4 players (about 200 connections; hard cap 100 rooms); 4 Hub game
cards; 2 routes (`/`, `/room/:gameId/:roomId`)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design (below).*

Constitution: [.specify/memory/constitution.md](../../.specify/memory/constitution.md) v1.1.0.

| Principle / rule | Gate | Pre-research | Post-design evidence |
|------------------|------|--------------|----------------------|
| I. Repository and Render-ready hosting | Source is `https://github.com/debashis-sahoo/myArena.git`; Render Web Service with WebSocket; config works without source edits; zero-downtime builds | PASS (planned) | `render.yaml` Blueprint, `PORT` binding, `/healthz` readiness, graceful `SIGTERM` ([contracts/render-deployment.md](contracts/render-deployment.md), [contracts/http-routes.md](contracts/http-routes.md)) |
| Runtime: `PORT` on `0.0.0.0`, HTTPS/WSS, readiness before traffic, redeploy behaviour documented | Documented plan for active rooms across replacement | PASS (planned) | Rooms explicitly end on restart; clients reconnect and see "room ended" (research R4) |
| II. Graphics-first | Rich palette, tactile states, glowing turn/host indicators, animated dice/tokens contract, mobile/tablet/desktop, max screen use, safe areas, reduced motion | PASS (planned) | Custom SVG/CSS art, viewport-shape layouts, `dvh` and safe-area handling, reduced-motion substitutes (research R9, R10); dice and token effects specified in the game contract as responses to server events; dice animation, token movement, and glowing active-turn indicators have no subject until the Ludo feature adds dice and turns, so they are deferred to that feature and required by the game contract |
| III. Velocity and pragmatic verification | Minimal automated suites; manual smoke, deterministic checkpoints, visual checks with recorded evidence | PASS | No unit/integration suites; one cheap two-client script permitted by Principle III; quickstart scenarios record scenario, expected, observed (research R13) |
| IV. Platform and game decoupling | Platform owns Hub, presence, rooms, invites at `/room/{gameId}/{roomId}`, host controls, chat; games mount in universal room wrapper; explicit contract | PASS | [contracts/game-module.md](contracts/game-module.md); room shell owns lobby, chat, invites; placeholder module mounts in the game stage; chat and presence reused by every game |
| V. Server-authoritative real-time | WebSocket/Socket.IO; backend validates state, turns, winners; clients send intents; ordered broadcast; reconnect snapshot; bots validated like humans | PASS | Server owns all transitions with `rev` ordering, resume returns full snapshot, host-only events authorized on server ([contracts/realtime-events.md](contracts/realtime-events.md)); `GameEngine.onBotTurn` goes through the same validation |
| Workflow: spec/plan identify principles, ownership, Render implications, visual acceptance | Present in spec and this plan | PASS | This table; spec FR-033/FR-034 |
| Workflow: UI checks at phone/tablet/desktop in both orientations with evidence | Planned | PASS | Quickstart V1, V7 |
| Workflow: room-flow and multiplayer checks with at least two clients | Planned | PASS | Quickstart V2 to V5 and smoke script |
| Workflow: deployment verified on Render, local checks not presented as deployment verification | Planned | PASS | Quickstart "Render deployment verification" with pending recording |

**Result**: No violations. Complexity Tracking is empty.

## Project Structure

### Documentation (this feature)

```text
specs/001-platform-hub-rooms/
├── plan.md                       # This file
├── research.md                   # Phase 0 decisions (stack, keepalive, state, security, testing)
├── data-model.md                 # Phase 1 entities, validation rules, state machines
├── quickstart.md                 # Phase 1 run and validation guide
├── verification.md               # Implementation evidence: scenario, expected, observed, screenshots
├── contracts/
│   ├── realtime-events.md        # Socket.IO events, acks, error codes, guarantees
│   ├── http-routes.md            # /healthz, static, SPA routes, security headers
│   ├── game-module.md            # Platform-to-game contract (server engine + client board)
│   └── render-deployment.md      # render.yaml, env vars, runtime behaviour on Render
├── checklists/
│   └── requirements.md           # Spec quality checklist
└── tasks.md                      # Phase 2 output (/speckit-tasks; not created here)
```

### Source Code (repository root)

```text
package.json                      # npm workspaces; scripts: dev, build, start, smoke
tsconfig.base.json
render.yaml                       # Render Blueprint (web service, free plan, /healthz)
.gitignore
README.md                         # run, deploy, and environment-variable notes

shared/
└── src/
    ├── games.ts                  # GameDefinition registry (ludo active; 3 coming soon)
    ├── protocol.ts               # Event names, payload and error-code types
    └── limits.ts                 # Name/chat lengths, timing defaults

server/
├── src/
│   ├── index.ts                  # Boot: config, HTTP + Socket.IO, readiness, SIGTERM
│   ├── app.ts                    # Express app: helmet, /healthz, static + SPA fallback
│   ├── config.ts                 # PORT and tunables from environment
│   ├── logger.ts                 # Structured JSON logging
│   ├── serverState.ts            # starting / ready / draining state for health and shutdown
│   ├── health.ts                 # GET /healthz handler
│   ├── shutdown.ts               # SIGTERM handling and graceful drain
│   ├── rooms/
│   │   ├── roomStore.ts          # Live rooms, id generation, room cap, closure
│   │   ├── room.ts               # Seats, host handover, reconnect timers, state projection
│   │   └── chat.ts               # Ring buffer, validation, system messages
│   ├── sockets/
│   │   ├── registerHandlers.ts   # Event handlers and acknowledgements
│   │   ├── schemas.ts            # zod payload schemas
│   │   └── rateLimit.ts          # Token buckets (chat, create, join)
│   └── games/
│       ├── registry.ts           # Maps gameId to GameEngine
│       └── placeholderEngine.ts  # Placeholder engine for this feature
└── scripts/
    └── smoke.ts                  # Headless two-client check

client/
├── index.html
├── vite.config.ts
└── src/
    ├── main.tsx
    ├── App.tsx                   # Router, connection banner, sound provider
    ├── routes/
    │   ├── HubPage.tsx
    │   └── RoomPage.tsx          # Handles join, errors, resume
    ├── components/
    │   ├── hub/                  # Header, GuestProfile, SoundToggle, GameCard, GameGrid
    │   ├── launch/               # LaunchModal, AiOpponentPicker
    │   ├── room/                 # RoomShell, Lobby, PlayerList, InviteBar, HostControls, ChatPanel, ChatDrawer, GameStage, JoinGate, RoomStatusScreen
    │   └── common/               # Modal, Toast, ConnectionBanner, Confetti
    ├── games/
    │   ├── types.ts              # GameBoardProps (platform-to-game board contract)
    │   ├── registry.ts           # Maps gameId to its board component
    │   └── placeholder/          # Placeholder board
    ├── art/                      # Inline SVG: card art, pawns, dice, avatars, logo
    ├── state/                    # socket client, room store, guest profile, preferences
    ├── audio/                    # Web Audio synthesized effects
    └── styles/                   # tokens, layout, animations, controls, reduced-motion
```

**Structure Decision**: A web application delivered as one service. `shared/` holds only types and constants so the
event contract cannot drift between client and server. `server/` owns all authoritative state, `client/` owns presentation,
and the built client is served by the server so Render runs one process (constitution Principle I, FR-035). Games add a
registry entry plus a server engine and a client board without touching room, presence, or chat code (Principle IV).

## Phase Outputs

| Phase | Artifact | Status |
|-------|----------|--------|
| 0 | [research.md](research.md) | Complete, no open unknowns |
| 1 | [data-model.md](data-model.md) | Complete |
| 1 | [contracts/](contracts/) | Complete (4 contracts) |
| 1 | [quickstart.md](quickstart.md) | Complete |
| 2 | `tasks.md` | Not created here; run `/speckit-tasks` |

## Spec Coverage Map

| Spec area | Where addressed |
|-----------|-----------------|
| Hub, cards, modal, guest profile (FR-001 to FR-012) | Client `hub/`, `launch/`; research R9, R10; quickstart V1, V2, V6 |
| Rooms, invite, host, capacity, presence (FR-013 to FR-024) | Server `rooms/`; data-model; realtime-events; quickstart V2, V3, V5 |
| Chat (FR-025 to FR-031) | Server `rooms/chat.ts`; client `room/ChatPanel`, `ChatDrawer`; research R8; quickstart V4 |
| Game stage placeholder (FR-032) | Client `games/placeholder/`; game-module contract |
| Layout and visual quality (FR-033, FR-034) | Research R9, R10; quickstart V1, V7 |
| Deployment readiness (FR-035 to FR-038) | render-deployment, http-routes; quickstart V8 and Render checks |
| Keepalive (FR-039 to FR-042) | Research R3, R4; render-deployment; quickstart Render checks |

## Complexity Tracking

No constitution violations to justify.
