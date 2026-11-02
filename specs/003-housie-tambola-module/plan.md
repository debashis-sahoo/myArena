# Implementation Plan: Housie (Tambola) Visual-First Game Module

**Branch**: `003-housie-tambola-module` | **Date**: 2026-11-02 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/003-housie-tambola-module/spec.md`

## Summary

Add Housie as the second real game on the Platform Core: a host-configured room of 2 to 200 people, server-generated valid tickets, a
server-authoritative caller (manual or 5/8/10 s auto), manual dabbing with ink crosses, per-tile CLAIM buttons checked by the server
against called numbers and the player's crosses, quiet player-only chat plus accepted-win lines, and a compact, space-efficient royal
arcade screen for players and for the host (who may also play).

Technical approach (details in [research.md](research.md)):

- **Rendering**: DOM and CSS with inline SVG; CSS sphere ball revealed with the Web Animations API; SVG ink cross and pattern pictures.
  No canvas or 3D library, no new dependencies.
- **Authority**: the server owns the shuffled deck, tickets, marks, claim validation, caller timers and results. Clients send intents
  (`draw`, `auto`, `marks`, `claim`, lobby settings); the server broadcasts small public events and sends private snapshots and notices
  only to the person concerned.
- **Patterns**: one data-driven catalogue of 40 patterns in `shared/`, one pure evaluator on the server; the same catalogue drives the host
  chooser, tiles, popover illustrations and validation.
- **Platform extensions** (game-agnostic, optional hooks): a game lobby channel (setup before start, `room:reset` for a new round),
  roster seating and a configurable player ceiling (200), coalesced state broadcasts and a socket guard for large rooms, quiet chat with
  a `notice` channel, private `emitTo`, `hostId()`. See [contracts/platform-extensions.md](contracts/platform-extensions.md).
- **Layout**: measured, space-filling regions (ticket fit with stack, 2 x 2 or tabs; density tiers for combination tiles; one-third and
  two-thirds right column) with no page scroll from 320 to 2560 px. See [contracts/match-screen-layout.md](contracts/match-screen-layout.md).
- **Verification**: direct browser play recorded as evidence with development-only deck and pace controls and scripted guests for large
  rooms and claim races; no new automated suites.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 22 LTS (server); React 19 + Vite (client). Same as the Platform Core and Ludo

**Primary Dependencies**: Existing only (Express, Socket.IO, zod, pino, React, react-router). **No new dependencies**: animation uses the
Web Animations API and CSS; randomness uses `node:crypto`

**Storage**: In-memory lobby and match state per room (like rooms and Ludo); per-device chat dock and ticket selection in `localStorage`.
No database

**Testing**: No new automated suites (user policy and constitution Principle III). Browser-based play recorded in `verification.md`;
development-only `HOUSIE_DEV_DECK`, `HOUSIE_DEV_BALLS`, `HOUSIE_DEV_TICKET_AUDIT`, `HOUSIE_CLAIM_PACE_MS`; existing `npm run smoke` re-run
as a regression check

**Target Platform**: Render.com free web service (single instance, Linux, Node 22) serving modern browsers on phones, tablets, laptops

**Project Type**: Web application, one deployable (existing npm workspaces: `shared`, `server`, `client`)

**Performance Goals**: A ball reaches every screen within 1 s; auto draws within 0.5 s of the interval; claim decision within 1 s for 95
percent of claims; `room:state` coalesced to about 4 per second above 12 seats; ball roll-in 1.1 s and ink stamp 120 ms at a smooth frame
rate on a mid-range phone; re-fit within 0.5 s of resize or rotation

**Constraints**: No page scrolling at any size from 320 to 2560 px; ticket cells at least 32 px; tap targets at least 40 px; production
ignores all development variables; Render free plan limits (sleep after 15 min of silence, one instance, 512 MB) unchanged; no new
required environment variables (`HOUSIE_MAX_PLAYERS` and `MAX_SOCKETS` are optional with defaults)

**Scale/Scope**: Rooms of 2 to 200 people (configurable ceiling), up to 4 tickets each (800 tickets in the largest room); existing
`MAX_ROOMS` 100 plus a `MAX_SOCKETS` guard (default 1500); 40 patterns; one caller timer per match; about 100 bytes per ball event

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design (below).*

Constitution: [.specify/memory/constitution.md](../../.specify/memory/constitution.md) v1.1.0.

| Principle / rule | Gate | Pre-research | Post-design evidence |
|------------------|------|--------------|----------------------|
| I. Repository and Render-ready hosting | No new services; config repository-relative; zero-downtime and `PORT` rules unchanged | PASS | No required env vars; two optional ones with defaults ([research.md](research.md) R7, R16); `render.yaml` unchanged |
| Runtime: restart behaviour documented for active state | Active matches across restart are recovered or explicitly ended | PASS | Lobbies and matches are in memory and end with the existing reconnect then "room ended" flow (R16; quickstart H10) |
| II. Graphics-first | Saturated palette, tactile states, glowing indicators, smooth effects, max screen use, orientation, safe areas, reduced motion | PASS | R1, R11, R13, R14; [contracts/match-screen-layout.md](contracts/match-screen-layout.md): royal arcade look, ball roll-in, ink stamp, claim celebration, measured fit with no page scroll, safe areas, reduced-motion path; spec FR-034a on compactness |
| III. Velocity and pragmatic verification | Minimise automated suites; manual smoke, deterministic checkpoints, visual checks with recorded evidence; controlled outcomes only in a development-only context without client control | PASS | No new suites; [quickstart.md](quickstart.md) H1 to H13; the dev deck and pace controls are server-side, ignored in production, and not reachable from any client message (R15) |
| IV. Platform and game decoupling | Reuse rooms, presence, invites, host controls, chat; game owns board, rules, turns; explicit contract; no duplicate chat | PASS | Housie reuses `InviteBar`, `PlayerList`, `ChatPanel`, the lobby dialog and status screens; it owns tickets, patterns, caller, claims and screens; every platform change is game-agnostic and optional ([contracts/platform-extensions.md](contracts/platform-extensions.md)). Watch item below |
| V. Server-authoritative real-time play | Backend validates state, outcomes, turns, winners; clients send intents; ordered broadcast; reconnect snapshot | PASS | Deck, tickets, marks, claim evaluation, caller and results are server-only; the action schema has no field for a ball, ticket or result ([contracts/housie-protocol.md](contracts/housie-protocol.md)); private snapshot in join/resume acks; claims are decided in server arrival order (R4, R5, R9) |
| Workflow: plans identify ownership, authority, Render implications, visual acceptance | Present | PASS | This table, the contracts, SC-012 to SC-015 |
| Workflow: UI checked at phone, tablet, desktop in both orientations with evidence | Planned | PASS | H8 and `verification.md` |
| Workflow: room-flow and multiplayer checks with two clients and reproducible checkpoints | Planned | PASS | H1 to H11 with the dev deck and scripted guests |
| Workflow: deployment verified on Render; local checks not presented as deployment verification | Planned | PASS | H13 records Render results or marks them pending |

**Result**: No violations. Complexity Tracking is empty. Two watch items: (1) the platform changes are the largest part of this
feature (lobby channel, roster seating, quiet chat, large-room guards); each is optional and defaults to off so Ludo's behaviour must
remain unchanged, which H12 checks. (2) The platform's room store still carries Ludo-typed state; Housie uses a feed registered per
game and does not touch it (R10).

## Project Structure

### Documentation (this feature)

```text
specs/003-housie-tambola-module/
├── plan.md                         # This file
├── research.md                     # Phase 0 decisions R1 to R17
├── data-model.md                   # Phase 1 entities, validation rules, state machines, timing constants
├── quickstart.md                   # Phase 1 browser verification guide (H1 to H13)
├── mockups/                        # Player and host view references (SVG and PNG)
├── contracts/
│   ├── housie-protocol.md          # game:action intents, game:event, snapshots, guarantees
│   ├── platform-extensions.md      # Lobby channel, roster seating, quiet chat, emitTo, reset, large-room guards
│   └── match-screen-layout.md      # Lobby and match screens, sizing rules, motion, accessibility
├── checklists/
│   └── requirements.md             # Spec quality checklist
├── verification.md                 # Created during implementation (evidence)
└── tasks.md                        # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root; additions and changes only)

```text
shared/src/
├── games.ts                        # CHANGE: Housie active, maxPlayers 200, roster, quietChat; GameDefinition flags
├── limits.ts                       # CHANGE: ROSTER_COLORS, STATE_COALESCE_MS, COALESCE_ABOVE, MAX_SOCKETS default
├── protocol.ts                     # CHANGE: RoomState.gameLobby, SystemCode game_notice, EVENTS.ROOM_RESET, JoinedData.game unknown
└── housie/                         # NEW
    ├── patterns.ts                 # 40-pattern catalogue (data), rule kinds, illustrations (R3)
    ├── ticket.ts                   # Ticket type, cell helpers, validateTicket
    ├── evaluate.ts                 # Pure claim evaluator over (ticket, marks, called, pattern); the server uses it
    ├── timing.ts                   # AUTO_INTERVALS_MS, CLAIM_PACE_MS, BALL_ROLL_MS, MARK_FLUSH_MS, ...
    └── types.ts                    # HousieLobby, HousieView, HousieEvent, HousieAction

server/src/
├── config.ts                       # CHANGE: housieMaxPlayers, maxSockets (optional env)
├── games/
│   ├── registry.ts                 # CHANGE: GameEngine lobby hooks, GameContext emitTo/hostId/notice; register 'housie'
│   └── housie/                     # NEW
│       ├── tickets.ts              # generation (R2), uniqueness set, audit
│       ├── deck.ts                 # Fisher-Yates deck, dev deck controls (R5, R15)
│       ├── lobby.ts                # lobby state, lobby actions, validateStart, lobbyView
│       ├── claims.ts               # claim handling, pace, Full House ordering, race
│       └── engine.ts               # match state machine, caller timers, marks, events, results
├── rooms/
│   ├── room.ts                     # CHANGE: roster seats, quietChat, coalescing, lobby routing, resetToLobby, new context members
│   └── roomStore.ts                # CHANGE: gameEventTo passthrough, socket guard, per-game maxPlayers
└── sockets/
    ├── schemas.ts                  # CHANGE: gameActionSchema union gains Housie intents
    └── registerHandlers.ts         # CHANGE: gameEventTo, room:reset handler, socket count guard

client/src/
├── games/
│   ├── registry.ts                 # CHANGE: getLobbyScreen, getGameFeed
│   └── housie/                     # NEW
│       ├── HousieLobby.tsx         # setup column, combination chooser, ticket count, people column
│       ├── HousieScreen.tsx        # match layout (landscape, portrait, host variant), header, overlays
│       ├── TicketArea.tsx          # ticket fit planner (stack, 2 x 2, tabs), selection
│       ├── Ticket.tsx              # grid of cell buttons, ink cross, keyboard navigation
│       ├── CombinationTiles.tsx    # density tiers, CLAIM buttons, locked/claimed/bogus states, popover trigger
│       ├── PatternPicture.tsx      # SVG sample ticket with highlighted cells (chooser and popover)
│       ├── PatternPopover.tsx      # anchored popover or bottom sheet
│       ├── BallConsole.tsx         # ball, count, mini-grid, view-all overlay
│       ├── Ball.tsx                # CSS 3D-style sphere
│       ├── MasterBoard.tsx         # host 1 to 90 board
│       ├── CallerConsole.tsx       # host controls: draw, auto, pause, recent chips, countdown ring
│       ├── ChatDock.tsx            # minimizable dock + unread pill (wraps platform ChatPanel)
│       ├── ResultsOverlay.tsx      # results list, New round, Leave
│       ├── housieStore.ts          # feed + external store: view, marks batching, selection
│       ├── useFit.ts               # ResizeObserver region sizing, ticket and tile planners
│       ├── anim/                   # ballRoll.ts, stamp.ts, celebrate.ts
│       └── housie.css              # layout, tickets, ball, tiles, popover, reduced motion
├── state/roomStore.ts              # CHANGE: createRoom(gameId), feed dispatch, resetRoom, widened game types
├── audio/sfx.ts                    # CHANGE: ball, stamp, win chime sounds
└── components/
    ├── room/RoomShell.tsx          # CHANGE: use the game's lobby screen in the lobby
    ├── room/HostControls.tsx       # CHANGE: roster capacity field with presets
    ├── room/PlayerList.tsx         # CHANGE: optional per-person badge slot (ticket count)
    └── launch/LaunchModal.tsx      # CHANGE: gameId prop, hide AI for games without AI
```

**Structure Decision**: Housie is added as a module on both sides of the existing three workspaces. The catalogue, ticket rules and
claim evaluator that must agree between server and client live once in `shared/src/housie/`; the server owns every decision; the client
owns presentation, marks batching and animation. Platform files change only to expose game-agnostic optional hooks, keeping Principle
IV intact.

## Phase Outputs

| Phase | Artifact | Status |
|-------|----------|--------|
| 0 | [research.md](research.md) | Complete, no open unknowns |
| 1 | [data-model.md](data-model.md) | Complete |
| 1 | [contracts/](contracts/) | Complete (3 contracts) |
| 1 | [quickstart.md](quickstart.md) | Complete |
| 2 | `tasks.md` | Complete (85 tasks) |

## Spec Coverage Map

| Spec area | Where addressed |
|-----------|-----------------|
| Room setup, limits, ceiling, host plays (FR-001 to FR-008, US1; SC-001, SC-003) | R6, R7; data-model Lobby; platform-extensions; `HousieLobby.tsx`, `lobby.ts`, `HostControls.tsx` |
| Ticket generation and uniqueness (FR-004, FR-005; SC-002) | R2; `tickets.ts`, `ticket.ts` (`validateTicket`); quickstart H2 |
| Patterns and combinations (FR-009 to FR-012) | R3; `patterns.ts`, `PatternPicture.tsx`, chooser; `CombinationTiles.tsx` |
| Manual dabbing (FR-013 to FR-016; SC-004) | R4; `Ticket.tsx`, `housieStore.ts` (batching), engine `marks` |
| Caller and ball console (FR-017 to FR-021; SC-005 to SC-007) | R5; `deck.ts`, `engine.ts`, `BallConsole.tsx`, `CallerConsole.tsx`, `MasterBoard.tsx` |
| Claims and illustration popover (FR-022, FR-022a to FR-028; SC-008, SC-009) | R3, R4, R13; `claims.ts`, `CombinationTiles.tsx`, `PatternPopover.tsx`; housie-protocol |
| Chat (FR-029 to FR-031; SC-010, SC-011) | R8, R12; `quietChat`, `ctx.notice`, `ChatDock.tsx` |
| Layout, visuals, space efficiency (FR-032 to FR-037, FR-034a; SC-012 to SC-015) | R1, R11, R14; match-screen-layout.md; `useFit.ts`, `housie.css` |
| Platform integration and authority (FR-038 to FR-041) | R6 to R10; platform-extensions.md; housie-protocol.md |
| Out of scope | Money and prizes, bots as players, auto-dab, spectators, saved history, voice, more than 4 tickets, rematch beyond New round (spec Assumptions) |

## Decisions needing your review (small additions to the spec)

These details were left open by the spec; the plan picks a default so tasks can proceed. Change the spec if you disagree.

1. **Full House order**: 2nd and 3rd can be claimed only after the previous one is claimed, and one ticket can win only one Full House (R3).
2. **New round**: the host can send everyone back to the lobby after a match (`room:reset`), resetting all lobby settings to defaults and ticket choices to 1, keeping the room's player limit (spec User Story 8, scenario 4).
3. **Chat in the lobby**: join and leave lines stay in the lobby chat (owner decision) and stop once the match starts, because `quietChat` applies only while a match is in progress.

## Complexity Tracking

No constitution violations to justify.
