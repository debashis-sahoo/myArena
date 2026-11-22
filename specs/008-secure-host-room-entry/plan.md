# Implementation Plan: Secure Host Access and Room Entry

**Branch**: `008-secure-host-room-entry` | **Date**: 2026-11-21 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/008-secure-host-room-entry/spec.md`

## Summary

Separate the current Hub into two experiences: `/host` for creating and controlling private rooms, and `/` for players to choose an identity and join an existing room by a six-character code. A normal invite URL remains a player path, and a room's host continues to be the participant who created it rather than anyone who opens that URL.

The design keeps host enforcement at the server boundary without adding accounts: production's server-handled `/host` GET route serves the built application and sets an HttpOnly, same-site, process-signed entry capability; `room:create` accepts the capability only from sockets that present a valid proof. During development, Vite proxies the exact `/host` request to Express; Express sets the cookie and relays Vite's own transformed root HTML so HMR works without a prebuilt `client/dist`. This follows the clarification that the URL is the current designation mechanism and is not represented as stronger identity authentication. The capability authorizes room creation only: a fresh code or invite join never inherits host eligibility, and only the authorized creator is host-eligible for that room.

Room IDs become six-character uppercase alphanumeric codes, generated from the existing unambiguous alphabet. The existing `room:join` acknowledgement supports the same join path with or without `gameId`; the Hub sends only the code, while shared URLs continue to include the game and room path. Invite surfaces expose the code and URL together.

A shared `ArenaAtmosphere` layer gives host, player, and room routes one vivid visual language with role- and game-specific accents. Host and player content remain visually distinct, all game screens inherit the common energy treatment, and existing game events remain the authority for turn, result, dice, and motion cues. No dependency, database, new deployable, or game-rule change is required.

## Technical Context

**Language/Version**: TypeScript 5.6 on Node.js 22; React 19 and Vite 6 on the client

**Primary Dependencies**: Existing Express, Socket.IO, zod, pino, React, and react-router; no new dependencies

**Storage**: Server room state remains in memory. The host entry capability is a short-lived, HttpOnly browser cookie signed by a process-local secret. Guest profile remains in `localStorage`; room rejoin markers remain in `sessionStorage`

**Testing**: Extend the existing `server/scripts/smoke.ts` two-client check for host-entry authorization, six-character codes, code-only joins, and blocked player promotion. Run `npm run build`. Record browser visual, responsive, reduced-motion, and Render checks in feature verification evidence rather than adding a broad automated suite

**Target Platform**: One Render.com Node web service serving the React application, HTTP entry routes, Socket.IO, and `/healthz` from the same origin

**Project Type**: Three-workspace web application (`shared`, `server`, `client`)

**Performance Goals**: Host and player primary actions remain visible and usable within 30 seconds for first-time users; valid code lookup and join complete in 2 seconds after the service is connected; room and invite copy feedback appears within 100 ms; layout re-fit completes within 500 ms after resize or rotation; visual motion remains smooth on representative mobile hardware

**Constraints**: `/host` is a designation-by-URL capability, not verified individual identity; the host experience cannot be reached from a player-facing action; a room code is exactly six uppercase alphanumeric characters; current rooms are temporary and end on process replacement; no new environment variables or third-party assets; reduced-motion, keyboard, touch, phone, tablet, desktop, portrait, and landscape paths remain complete

**Scale/Scope**: Existing 100-room server cap and existing per-game room capacities; four active games; platform-owned entry, room creation, joins, host controls, invites, chat, and atmosphere; game-owned boards and rules remain unchanged

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

Constitution: [.specify/memory/constitution.md](../../.specify/memory/constitution.md) v1.1.0.

| Principle / rule | Gate | Pre-research | Post-design evidence |
|------------------|------|--------------|----------------------|
| I. Render-ready hosting | Same service and repository-relative configuration, `PORT`, HTTPS/WSS, readiness, and shutdown behavior remain valid | PASS | No service, package, build command, or required environment variable is added; Express handles `/host` before the SPA fallback in production, development relays Vite's own root HTML with the Express cookie, and Socket.IO remains same-origin |
| Runtime: restart behavior | Active room state is recovered or explicitly ended | PASS | Rooms still end on restart; process-signed host capabilities also expire, and reopening `/host` can mint a new one ([research.md](research.md) R2) |
| II. Graphics-first | Rich, responsive, touch-friendly visuals with static reduced-motion equivalents | PASS | `ArenaAtmosphere`, role-specific landing layouts, invite/code emphasis, and game-screen accents are platform-owned; no gameplay state is inferred from decoration ([contracts/landing-game-visuals.md](contracts/landing-game-visuals.md)) |
| III. Pragmatic verification | Focused smoke, deterministic checkpoints, visual evidence, no heavy suite | PASS | Existing smoke script gains five focused scenarios; [quickstart.md](quickstart.md) covers two clients and responsive visual checks |
| IV. Platform and game decoupling | Shared entry, room, invite, host, and chat stay in platform; games keep local rules | PASS | Route, code lookup, entry capability, room host eligibility, invite surfaces, and atmosphere are platform changes; each game only receives a common visual contract |
| V. Server-authoritative real-time play | Client intent is validated; server owns membership, host powers, state, and ordered updates | PASS | `room:create` validates the server-issued capability and every host-only event continues to validate `hostPlayerId`; ordinary players cannot become host through join or invite handover ([contracts/entry-room.md](contracts/entry-room.md)) |
| Workflow: ownership, authority, Render, visuals, evidence identified | Required in plans before implementation | PASS | This plan and the Phase 1 contracts identify all four |

**Result**: PASS. No violations and no constitution exceptions. The intentional `/host` capability model is less secure than individual identity authentication and is recorded as a current-release limitation, not as full user authentication.

## Project Structure

### Documentation (this feature)

```text
specs/008-secure-host-room-entry/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── entry-room.md
│   └── landing-game-visuals.md
├── checklists/
│   └── requirements.md
├── verification.md              # created during implementation
└── tasks.md                     # created by /speckit-tasks
```

### Source Code (repository root; intended additions and changes)

```text
shared/src/
├── limits.ts                    # CHANGE: six-character room-code length remains in the shared constants
└── protocol.ts                  # CHANGE: display/normalize rules, optional join gameId, entry error code

server/src/
├── app.ts                       # CHANGE: serve /host and set the host-entry capability before SPA fallback
├── index.ts                     # CHANGE: share the entry verifier with HTTP and Socket.IO
├── sockets/
│   ├── entryCapability.ts       # NEW: issue/verify signed host-entry cookies
│   ├── registerHandlers.ts      # CHANGE: authorize creation, code-only join, and keep fresh joins host-ineligible
│   └── schemas.ts               # CHANGE: optional join gameId and six-character normalized code shape
└── rooms/
    ├── room.ts                  # CHANGE: host eligibility and safe host handover/closure
    └── roomStore.ts             # CHANGE: create six-character codes and find a room by code alone

server/scripts/
└── smoke.ts                     # CHANGE: host capability and player-boundary scenarios

client/
├── vite.config.ts               # CHANGE: forward /host Set-Cookie while Vite serves the SPA, and proxy Socket.IO
└── src/
    ├── App.tsx                  # CHANGE: /host route, fallback stays player
    ├── routes/
    │   └── HubPage.tsx          # CHANGE: host or player mode, join-by-code for players
    ├── components/
    │   ├── common/
    │   │   └── ArenaAtmosphere.tsx  # NEW: role- and game-aware decorative energy layer
    │   ├── hub/
    │   │   ├── Header.tsx       # CHANGE: visible host/player role identity
    │   │   ├── GameGrid.tsx     # CHANGE: host launch or player showcase behavior
    │   │   ├── GameCard.tsx     # CHANGE: role-aware calls to action
    │   │   └── JoinRoomPanel.tsx  # NEW: six-character room-code entry and errors
    │   ├── room/
    │   │   ├── InviteBar.tsx    # CHANGE: prominent code plus separate link-copy action
    │   │   └── RoomShell.tsx    # CHANGE: common invite and energy integration
    │   └── launch/
    │       └── LaunchModal.tsx  # CHANGE: host-page-only launch
    ├── games/
    │   ├── ludo/LudoScreen.tsx  # CHANGE: shared code/link invite actions in the custom match header
    │   ├── uno/UnoScreen.tsx    # CHANGE: shared code/link invite actions in the custom match header
    │   ├── housie/HousieLobby.tsx # CHANGE: shared invite contract
    │   └── bingo/BingoLobby.tsx # CHANGE: shared invite contract
    ├── state/
    │   └── roomStore.ts         # CHANGE: code-only player join and host/player error handling
    └── styles/
        ├── tokens.css           # CHANGE: role/game energy variables and safe-area additions
        ├── hub.css              # CHANGE: host/player/join panel layouts
        ├── room.css             # CHANGE: invite, shared room energy treatment
        └── animations.css       # CHANGE: atmosphere motion plus reduced-motion equivalents
```

The custom Ludo, Housie, Bingo, and UNO screens inherit the atmosphere through `App`. Because custom match screens bypass `RoomShell`, each match-header invite surface must render the shared invite contract directly. Existing game event-specific glows and results remain local.

**Structure Decision**: Keep the existing single deployable and three npm workspaces. Express owns capability issuance on `/host`, Socket.IO owns action-time validation, and reusable player behavior and visual chrome remain in the client platform. No new service or game module is introduced.

## Complexity Tracking

> No Constitution Check violations require justification.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | n/a | n/a |
