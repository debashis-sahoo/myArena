# Implementation Plan: Responsive Ludo Game Module with Natural Dice & Hopping Pawn Animation

**Branch**: `002-ludo-game-module` | **Date**: 2026-11-01 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/002-ludo-game-module/spec.md`

## Summary

Add Ludo as the first real game on the Platform Core ([001-platform-hub-rooms](../001-platform-hub-rooms/plan.md)): a server-authoritative
match engine (rules, dice, turn timer, bots) and a full-screen match experience with a board that always fills the screen, a physical 3D-style
die, glossy 3D-style pawns that hop square by square, circular player bubbles, and chat and activity in the right place for each orientation.

Technical approach (details in [research.md](research.md)):

- **Rendering**: a 2D CSS grid board with pawns and the die built from CSS 3D transforms, inline SVG and the Web Animations API. No 3D
  library and no new dependencies, which keeps the bundle and phone battery use small on the free plan.
- **Authority**: the server owns dice, turn order, legality, captures, timers, bots, and winners. After each step it broadcasts a
  `game:event` carrying the exact hop path and a full state snapshot; clients animate events in order and jump straight to the latest
  snapshot when joining, reconnecting, or falling behind.
- **Layout**: measured, always-square board (largest square that fits its region) inside a two-column landscape layout (board left; dice, player bubbles and a minimizable chat dock right) and a stacked portrait layout with a peek drawer, with no page scroll.
- **Platform extensions** (small and game-agnostic): a game context (timers, events, bot chat, server-initiated seat release), colour
  assignment at match start, the `game:action` pipeline, game snapshots in join acknowledgements, and a per-game full-screen match screen
  hook. See [contracts/platform-extensions.md](contracts/platform-extensions.md).
- **Verification**: direct browser play recorded as evidence, using development-only controlled dice, a near-endgame scenario, and a short
  countdown so rule situations are repeatable; no new automated suites.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 22 LTS (server); React 19 + Vite (client). Same as the Platform Core

**Primary Dependencies**: Existing only (Express, Socket.IO, zod, pino, React, react-router). **No new dependencies**: animation uses the
Web Animations API and CSS 3D transforms

**Storage**: In-memory match state per room (like rooms); per-device layout preference in `localStorage`. No database

**Testing**: No new automated suites (user policy and constitution Principle III). Browser-based play recorded in `verification.md`;
development-only `LUDO_DEV_DICE`, `LUDO_DEV_SCENARIO`, `LUDO_TURN_MS`; existing `npm run smoke` re-run as a regression check

**Target Platform**: Render.com free web service (single instance, Linux, Node 22) serving modern browsers on phones, tablets, laptops

**Project Type**: Web application, one deployable (existing npm workspaces: `shared`, `server`, `client`)

**Performance Goals**: Board re-fit within 0.5 s of a resize or rotation; die tumble 1.4 s and hops 0.34 s each at a smooth frame rate on a
mid-range phone; all players within 1 s of each other; auto-play within 1 s of countdown expiry; event payloads under 2 KB

**Constraints**: No page scrolling at any size from 320 to 2560 px; die at least 96 px (desktop) and 64 px (mobile) with rounded edges; board never taller than
85% of the viewport in portrait; production ignores all development variables; Render free plan limits (sleep after 15 min of silence, one
instance, 512 MB) unchanged

**Scale/Scope**: Up to 50 concurrent rooms of up to 4 players (unchanged); 16 pawns, 1 die and about 225 board cells per match; one timer
per match; about 10 new events per turn at most

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design (below).*

Constitution: [.specify/memory/constitution.md](../../.specify/memory/constitution.md) v1.1.0.

| Principle / rule | Gate | Pre-research | Post-design evidence |
|------------------|------|--------------|----------------------|
| I. Repository and Render-ready hosting | No new services; config stays repository-relative; zero-downtime and `PORT` rules unchanged | PASS | No new env vars in production; development variables are ignored there ([research.md](research.md) R10, R16); `render.yaml` unchanged |
| Runtime: restart behaviour documented for active state | Active matches across restart are recovered or explicitly ended | PASS | Matches are in-memory like rooms and end with the existing "room ended" screen on restart (R16) |
| II. Graphics-first | Saturated palette, tactile states, glowing turn indicators, animated dice, smooth token movement, all screens, max screen use, orientation, safe areas, reduced motion | PASS | R1, R7 to R9, R14; [contracts/match-screen-layout.md](contracts/match-screen-layout.md): glowing active bubble and roll border, 3D-style die tumble, hop animation, measured always-square board, safe areas, reduced-motion path. The board stays 2D with CSS-3D tokens as the constitution describes |
| III. Velocity and pragmatic verification | Minimise automated suites; manual smoke, deterministic checkpoints, visual checks with recorded evidence; dice scenarios use controlled outcomes in a development-only context without client control | PASS | No new suites; [quickstart.md](quickstart.md) G1 to G11 with controlled dice (`LUDO_DEV_DICE`), scenario and short-timer switches that are ignored in production (R10, R15) |
| IV. Platform and game decoupling | Game reuses rooms, presence, invites, host controls and chat; owns board, rules, turns, bots; explicit contract; no duplicate chat | PASS | The match screen reuses the platform `ChatPanel`, lobby, invite, modal and status components; Ludo owns board, dice, panels, activity log, rules and bots; extensions are game-agnostic ([contracts/platform-extensions.md](contracts/platform-extensions.md)) |
| V. Server-authoritative real-time play | Backend validates state, dice outcomes, turns, winners; clients send intents; ordered broadcast; reconnect snapshot; bots validated like humans | PASS | Server-only dice and legality ([contracts/ludo-protocol.md](contracts/ludo-protocol.md)); full snapshots in every event and in join/resume acknowledgements; bots call the same internal roll and move functions as humans (R3, R5, R12) |
| Workflow: plans identify ownership, authority, Render implications, visual acceptance | Present | PASS | This table and the spec |
| Workflow: UI checked at phone, tablet, desktop in both orientations with evidence | Planned | PASS | G1, G10 and `verification.md` |
| Workflow: room-flow and multiplayer checks with two clients and reproducible checkpoints | Planned | PASS | G2 to G9 with controlled dice and two windows |
| Workflow: deployment verified on Render; local checks not presented as deployment verification | Planned | PASS | G11 records Render results or marks them pending |

**Result**: No violations. Complexity Tracking is empty. One watch item: the match screen replaces the generic room layout, which must not
fork the platform's lobby, invite, or chat logic. The plan keeps those components shared.

## Project Structure

### Documentation (this feature)

```text
specs/002-ludo-game-module/
├── plan.md                         # This file
├── research.md                     # Phase 0 decisions (rendering, geometry, authority, layout, dice, pawns, bots)
├── data-model.md                   # Phase 1 entities, validation rules, state machine, timing constants
├── quickstart.md                   # Phase 1 browser verification guide (G1 to G11)
├── contracts/
│   ├── ludo-protocol.md            # game:action / game:event, events, guarantees
│   ├── platform-extensions.md      # Game context, colour assignment, release, match screen hook
│   └── match-screen-layout.md      # Regions, layout modes, board fit rule, animation timings, accessibility
├── checklists/
│   └── requirements.md             # Spec quality checklist
├── verification.md                 # Created during implementation (evidence)
└── tasks.md                        # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root; additions and changes only)

```text
shared/src/
├── games.ts                        # CHANGE: Ludo seatColors -> yellow, green, blue, red
├── protocol.ts                     # CHANGE: GAME_EVENT, JoinedData.game?, RemovedData.reason?
└── ludo/                           # NEW
    ├── board.ts                    # ring[52], starts, safe squares, lanes, base spots, HOME (R2)
    ├── timing.ts                   # TURN_TIMER_MS, ROLL_TUMBLE_MS, HOP_MS, ... (data-model.md)
    └── types.ts                    # LudoState, PlayerState, LudoEvent, LudoAction, ActivityEntry

server/src/
├── games/
│   ├── registry.ts                 # CHANGE: GameEngine + GameContext, assignColors; register 'ludo'
│   ├── placeholderEngine.ts        # CHANGE: accept the new signatures (no behaviour change)
│   └── ludo/                       # NEW
│       ├── rules.ts                # pure rules: legal moves, apply move, capture, bonus, winner
│       ├── dice.ts                 # server dice + development-only controls (R10)
│       ├── bot.ts                  # pawn priority list, pacing, commentary phrase pool (R5)
│       └── engine.ts               # match state machine, timers, away handling, events
├── rooms/room.ts                   # CHANGE: ctx, colour assignment at start, game snapshot, inactive release
└── sockets/
    ├── schemas.ts                  # CHANGE: gameActionSchema
    └── registerHandlers.ts         # CHANGE: game:action handler, game snapshot in acks, player:removed reason

client/src/
├── games/
│   ├── registry.ts                 # CHANGE: getMatchScreen(gameId)
│   └── ludo/                       # NEW
│       ├── LudoScreen.tsx          # layout (landscape / portrait / compact), header, overlays
│       ├── Board.tsx               # 15 x 15 grid, bases, ring, lanes, stars, arrows, HOME
│       ├── Pawns.tsx               # pawn layer, eligibility, hit areas, stacking
│       ├── Pawn.tsx                # inline-SVG 3D-style pawn
│       ├── Die.tsx                 # CSS 3D cube
│       ├── DiceConsole.tsx         # title, turn text, countdown, die, ROLL DICE, tooltip
│       ├── PlayerPanels.tsx        # circular player bubbles (avatar ring, name, home badge)
│       ├── SidePanel.tsx           # Chat | Activity tabs for the column and the drawer
│       ├── ActivityLog.tsx         # game events list
│       ├── ResultsOverlay.tsx      # winner and standings
│       ├── useLudo.ts              # game slice hook: event queue, display state, actions
│       ├── useBoardFit.ts          # ResizeObserver sizing (R7)
│       ├── layoutPrefs.ts          # localStorage chat dock state (FR-006)
│       ├── MatchDialogs.tsx        # Lobby and Quit dialogs (FR-007)
│       ├── anim/                   # dice.ts (keyframes + face lookup), hop.ts, puff.ts, capture.ts
│       └── ludo.css                # board, pawns, die, console, panels, layout, reduced motion
├── state/roomStore.ts              # CHANGE: game slice, game:event handling, inactive removal
└── components/room/
    ├── RoomShell.tsx               # CHANGE: use the game's match screen while in progress
    └── RoomStatusScreen.tsx        # CHANGE: "removed for inactivity" copy
```

**Structure Decision**: Ludo is added as a module on both sides of the existing three workspaces. Rules and geometry that must agree between
server and client live once in `shared/src/ludo/`; the server owns every decision; the client owns presentation and animation. Platform files
change only to expose game-agnostic hooks, keeping Principle IV intact.

## Phase Outputs

| Phase | Artifact | Status |
|-------|----------|--------|
| 0 | [research.md](research.md) | Complete, no open unknowns |
| 1 | [data-model.md](data-model.md) | Complete |
| 1 | [contracts/](contracts/) | Complete (3 contracts) |
| 1 | [quickstart.md](quickstart.md) | Complete |
| 2 | `tasks.md` | Complete (71 tasks) |

## Spec Coverage Map

| Spec area | Where addressed |
|-----------|-----------------|
| Board, layout, fit (FR-001 to FR-008, SC-001 to SC-003) | R2, R7; match-screen-layout.md; `Board.tsx`, `useBoardFit.ts`, `LudoScreen.tsx` |
| Player bubbles (FR-009, FR-010) | match-screen-layout.md; `PlayerPanels.tsx` |
| Turn system and dice (FR-011 to FR-017, SC-005, SC-007, SC-010) | R4, R8; `DiceConsole.tsx`, `Die.tsx`, `anim/dice.ts`; `engine.ts` timers |
| Pawn movement (FR-018 to FR-024, SC-004) | R9; `Pawns.tsx`, `Pawn.tsx`, `anim/hop.ts`, `anim/puff.ts`, `anim/capture.ts` |
| Rules and authority (FR-025 to FR-032, SC-006, SC-009, SC-012) | R2, R3; data-model.md; `rules.ts`, `engine.ts`; ludo-protocol.md |
| Bots (FR-033 to FR-035, SC-008) | R5; `bot.ts`, `ctx.say` |
| Chat, activity, platform use (FR-036 to FR-039) | R6, R11; platform-extensions.md; `SidePanel.tsx`, `ActivityLog.tsx` |
| Accessibility, motion, quality (FR-040 to FR-043, SC-013, SC-014) | R8, R9, R13, R14; match-screen-layout.md |
| Out of scope | Rematch, spectators, advanced bot strategy, extra sounds (spec Assumptions) |

## Complexity Tracking

No constitution violations to justify.
