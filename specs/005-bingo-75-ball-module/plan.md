# Implementation Plan: Bingo (75-Ball) Visual-First Game Module

**Branch**: `005-bingo-75-ball-module` | **Date**: 2026-11-04 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/005-bingo-75-ball-module/spec.md`

## Summary

Add Bingo as the third real game on the Platform Core and the second user of its lobby channel: a host-configured room of 2 to 200 people, server-generated
5 by 5 cards on the standard 75-ball distribution with a FREE centre that the player must daub by hand, a server-authoritative caller (manual or 5/8/10 s
auto) that shows balls as letter-number spheres, manual daubing with a neon stamp effect, a single glowing BINGO! button whose claim the server decides
against every pattern in play, pure player chat with no system line at all, and a compact royal arcade screen for players and for the host (who may also
play).

Technical approach (details in [research.md](research.md)):

- **Rendering**: DOM and CSS with inline SVG; CSS sphere ball revealed with the Web Animations API; CSS neon dauber with a short stamp; SVG pattern pictures.
  No canvas or 3D library, no new dependencies.
- **Authority**: the server owns the shuffled deck, cards, daubs, the per-card FREE-tap flag, claim evaluation, caller timers and results. Clients send
  intents (`draw`, `auto`, `daubs`, `bingo`, lobby settings); the server broadcasts small public events and sends private snapshots and notices only to the
  person concerned.
- **Patterns**: one data-driven catalogue of nine patterns in `shared/`, each a list of alternative cell sets (`variants`), and one pure evaluator used by
  the server; the same catalogue draws the chooser and the tiles.
- **Claim**: `{ card }` only. The server evaluates the card against all open patterns, awards every one it completes in a single `claimed` event, or
  answers privately with `tooLate` or `bogus` (3 in a row lock claims for 1 minute).
- **Platform**: no new hook. Bingo reuses Housie's lobby channel, roster seating, quiet chat, private `emitTo`, `hostId()`, new round, coalesced state
  broadcasts and socket guard. Changes are configuration and registration only: Bingo becomes active, a per-game player ceiling (`BINGO_MAX_PLAYERS`),
  three new action intents, engine and screen registration, and one assertion in the smoke script. See
  [contracts/platform-integration.md](contracts/platform-integration.md).
- **Layout**: measured, space-filling regions (card fit with stack, row or tabs; dashboard fit; one-third and two-thirds right column) with no page scroll
  from 320 to 2560 px. See [contracts/match-screen-layout.md](contracts/match-screen-layout.md).
- **Verification**: direct browser play recorded as evidence with development-only deck and pace controls and scripted guests for large rooms and claim
  races; no new automated suites.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 22 LTS (server); React 19 + Vite (client). Same as the Platform Core, Ludo and Housie

**Primary Dependencies**: Existing only (Express, Socket.IO, zod, pino, React, react-router). **No new dependencies**: animation uses the Web Animations API
and CSS; randomness uses `node:crypto`

**Storage**: In-memory lobby and match state per room (like rooms, Ludo and Housie); one per-device preference (`myarena.bingo.card`) in `localStorage`. No
database

**Testing**: No new automated suites (user policy and constitution Principle III). Browser-based play recorded in `verification.md`; development-only
`BINGO_DEV_DECK`, `BINGO_DEV_BALLS`, `BINGO_DEV_CARD_AUDIT`, `BINGO_CLAIM_PACE_MS`; existing `npm run smoke` re-run as a regression check

**Target Platform**: Render.com web service (single instance, Linux, Node 22) serving modern browsers on phones, tablets and laptops

**Project Type**: Web application, one deployable (existing npm workspaces: `shared`, `server`, `client`)

**Performance Goals**: A ball reaches every screen within 1 s; auto draws within 0.5 s of the interval; claim decision within 1 s for 95 percent of
claims; `room:state` coalesced to about 4 per second above 12 seats (existing); ball roll-in 1.1 s and dauber stamp 140 ms at a smooth frame rate on a
mid-range phone; re-fit within 0.5 s of resize or rotation

**Constraints**: No page scrolling at any size from 320 to 2560 px; card cells at least 40 px; text at least 11 px; production ignores all development
variables; Render plan limits (one instance, 512 MB) unchanged; no new required environment variables (`BINGO_MAX_PLAYERS` is optional with a default)

**Scale/Scope**: Rooms of 2 to 200 people (configurable ceiling), up to 3 cards each (600 cards in the largest room); existing `MAX_ROOMS` 100 plus the
`MAX_SOCKETS` guard (default 1500); 9 patterns; one caller timer per match; about 100 bytes per ball event

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design (below).*

Constitution: [.specify/memory/constitution.md](../../.specify/memory/constitution.md) v1.1.0.

| Principle / rule | Gate | Pre-research | Post-design evidence |
|------------------|------|--------------|----------------------|
| I. Repository and Render-ready hosting | No new services; config repository-relative; zero-downtime and `PORT` rules unchanged | PASS | One optional env var with a default ([research.md](research.md) R6, R13); `render.yaml` unchanged |
| Runtime: restart behavior documented for active state | Active matches across restart are recovered or explicitly ended | PASS | Lobbies and matches are in memory and end through the existing reconnect then "room ended" flow (R13; quickstart V10) |
| II. Graphics-first | Saturated palette, tactile states, glowing indicators, smooth effects, max screen use, orientation, safe areas, reduced motion | PASS | R1, R9, R11; [contracts/match-screen-layout.md](contracts/match-screen-layout.md): royal arcade look, ball roll-in, neon dauber stamp, FREE tooltip, claim celebration, measured fit with no page scroll, safe areas, reduced-motion table; spec FR-033 to FR-038 |
| III. Velocity and pragmatic verification | Minimize automated suites; manual smoke, deterministic checkpoints, visual checks with recorded evidence; controlled outcomes only in a development-only context without client control | PASS | No new suites; [quickstart.md](quickstart.md) V1 to V10; the dev deck and pace controls are server-side, ignored in production and not reachable from any client message (R12) |
| IV. Platform and game decoupling | Reuse rooms, presence, invites, host controls, chat; game owns board, rules, turns; explicit contract; no duplicate chat | PASS | Bingo reuses `InviteBar`, `PlayerList`, `ChatPanel`, the lobby dialog and status screens and adds no platform hook ([contracts/platform-integration.md](contracts/platform-integration.md)); it owns cards, patterns, caller, daubs, claims and screens. Watch item below |
| V. Server-authoritative real-time play | Backend validates state, outcomes, turns, winners; clients send intents; ordered broadcast; reconnect snapshot | PASS | Deck, cards, daubs, claim evaluation, caller and results are server-only; the action schema has no field for a ball, card, pattern or result ([contracts/bingo-protocol.md](contracts/bingo-protocol.md)); private snapshot in join and resume acks; claims are decided in server arrival order (R4, R5, R7) |
| Workflow: plans identify ownership, authority, Render implications, visual acceptance | Present | PASS | This table, the contracts, SC-011 to SC-014 |
| Workflow: UI checked at phone, tablet, desktop in both orientations with evidence | Planned | PASS | V7 and `verification.md` |
| Workflow: room-flow and multiplayer checks with two clients and reproducible checkpoints | Planned | PASS | V1 to V8 with the dev deck and scripted guests |
| Workflow: deployment verified on Render; local checks not presented as deployment verification | Planned | PASS | V10 records Render results or marks them pending |

**Result**: No violations. Complexity Tracking is empty. One watch item: the shared changes touch Housie's neighbors (`roomStore` ceiling lookup, the strict
action union, `useRegionSize` moving to `state/viewport.ts` with a re-export, one smoke assertion). Each is behavior-neutral for Housie and Ludo, and V10
re-checks both.

## Project Structure

### Documentation (this feature)

```text
specs/005-bingo-75-ball-module/
├── plan.md                         # This file
├── research.md                     # Phase 0 decisions R1 to R15
├── data-model.md                   # Phase 1 entities, claim decision order, state machines, constants
├── quickstart.md                   # Phase 1 browser verification guide (V1 to V10)
├── contracts/
│   ├── bingo-protocol.md           # game:action intents, game:event, BingoView, guarantees
│   ├── platform-integration.md     # How Bingo uses existing hooks; configuration and registration changes
│   └── match-screen-layout.md      # Lobby and match screens, sizing rules, motion, accessibility
├── checklists/
│   └── requirements.md             # Spec quality checklist
├── verification.md                 # Created during implementation (evidence)
└── tasks.md                        # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root; additions and changes only)

```text
shared/src/
├── games.ts                        # CHANGE: bingo active, maxPlayers 200, defaultCapacity 10, roster, quietChat
├── index.ts                        # CHANGE: re-export ./bingo/*
└── bingo/                          # NEW
    ├── card.ts                     # BingoCard type, cell helpers (index <-> row/col, letter column), validateBingoCard
    ├── patterns.ts                 # 9-pattern catalogue (data), variants, illustrations
    ├── evaluate.ts                 # Pure evaluator over (pattern, card, daubs, called)
    ├── letters.ts                  # BINGO_BALLS, BINGO_LETTERS, column ranges, ballLetter(n)
    ├── timing.ts                   # BINGO_CARD_CEILING_MAX, defaults (neutral Housie timing constants reused)
    └── types.ts                    # BingoLobby, BingoView, BingoEvent, BingoAction, PatternState, result types

server/src/
├── config.ts                       # CHANGE: bingoMaxPlayers (BINGO_MAX_PLAYERS), rosterMaxPlayers lookup
├── games/
│   ├── registry.ts                 # CHANGE: register 'bingo'
│   └── bingo/                      # NEW
│       ├── cards.ts                # generation (R2), uniqueness set, audit
│       ├── deck.ts                 # Fisher-Yates deck of 1..75, dev deck controls (R5, R12)
│       ├── lobby.ts                # lobby state and actions, validateStart, lobbyView
│       ├── claims.ts               # claim decision (R7), pace, bogus streak and lock
│       ├── matchOps.ts             # publish, caller timers, draw, finish, views
│       ├── model.ts                # Match, PlayerEntry, PatternState types
│       └── engine.ts               # GameEngine wiring, daubs, caller intents, seat release
├── rooms/roomStore.ts              # CHANGE: roster ceiling by game id
└── sockets/schemas.ts              # CHANGE: union gains setCards, daubs, bingo
server/scripts/smoke.ts             # CHANGE: unavailable-game assertion uses snakes-and-ladders

client/src/
├── games/
│   ├── registry.ts                 # CHANGE: bingo match screen, lobby screen, store import
│   ├── housie/useFit.ts            # CHANGE: re-export useRegionSize from state/viewport (no behavior change)
│   └── bingo/                      # NEW
│       ├── BingoLobby.tsx          # setup column, pattern chooser, card count, roster column
│       ├── BingoScreen.tsx         # match layout (landscape, narrow, host variant), header, overlays
│       ├── CardArea.tsx            # card fit (stack, row, tabs), selection, FREE tooltip host
│       ├── CardGrid.tsx            # B-I-N-G-O header, 5 x 5 cell buttons, dauber, keyboard navigation
│       ├── PatternDashboard.tsx    # tiles (picture, name, badge), BINGO! button, bogus and lock states
│       ├── PatternPicture.tsx      # SVG 5 x 5 picture (chooser and tiles)
│       ├── BallConsole.tsx         # ball, count, history grid, view-all overlay
│       ├── Ball.tsx                # CSS 3D-style sphere with letter and number
│       ├── MasterBoard.tsx         # host board, five columns of 15 (rotated on short wide regions)
│       ├── CallerConsole.tsx       # host controls: draw, auto, pause, recent chips, countdown ring
│       ├── BingoChat.tsx           # landscape panel, narrow drawer with unread pill (wraps platform ChatPanel)
│       ├── ResultsOverlay.tsx      # results list, New round, Leave
│       ├── bingoStore.ts           # feed + external store: view, daub batching, selection, notices, lock
│       ├── useFit.ts               # planCards, planPatterns, board orientation
│       ├── anim/                   # ballRoll.ts, stamp.ts, celebrate.ts
│       └── bingo.css               # layout, cards, dauber, ball, tiles, tooltip, reduced motion (scope .bz)
└── state/viewport.ts               # CHANGE: add useRegionSize (moved verbatim from housie/useFit.ts)

README.md                           # CHANGE: Bingo section, BINGO_MAX_PLAYERS and dev variables
```

**Structure Decision**: Bingo is added as a module on both sides of the existing three workspaces. The catalogue, card rules and claim evaluator that must
agree between server and client live once in `shared/src/bingo/`; the server owns every decision; the client owns presentation, daub batching and animation.
Platform files change only for configuration and registration; no hook is added, keeping Principle IV intact.

## Phase Outputs

| Phase | Artifact | Status |
|-------|----------|--------|
| 0 | [research.md](research.md) | Complete, no open unknowns |
| 1 | [data-model.md](data-model.md) | Complete |
| 1 | [contracts/](contracts/) | Complete (3 contracts) |
| 1 | [quickstart.md](quickstart.md) | Complete |
| 2 | [tasks.md](tasks.md) | Complete (79 tasks) |

## Spec Coverage Map

| Spec area | Where addressed |
|-----------|-----------------|
| Room setup, limits, ceiling, host plays (FR-001 to FR-006, US1; SC-001, SC-003) | R6; data-model Lobby; platform-integration; `BingoLobby.tsx`, `lobby.ts`, `config.ts`, `roomStore.ts` |
| Card generation and uniqueness (FR-007, FR-008; SC-002) | R2; `cards.ts`, `card.ts` (`validateBingoCard`); quickstart V2 |
| Patterns (FR-009 to FR-011) | R3; `patterns.ts`, `PatternPicture.tsx`, chooser; `PatternDashboard.tsx` |
| Manual daubing and the FREE space (FR-012 to FR-016; SC-004) | R4; `CardGrid.tsx`, `bingoStore.ts` (batching), engine `daubs`, `freeTapped` |
| Caller and ball console (FR-017 to FR-022; SC-005 to SC-007) | R5; `deck.ts`, `matchOps.ts`, `BallConsole.tsx`, `Ball.tsx`, `CallerConsole.tsx`, `MasterBoard.tsx` |
| Claims (FR-023 to FR-030; SC-008, SC-009) | R7; `claims.ts`, `PatternDashboard.tsx`, `ResultsOverlay.tsx`; bingo-protocol |
| Chat (FR-031, FR-032; SC-010) | R6, R10; `quietChat`, `BingoChat.tsx` |
| Layout, visuals, space efficiency (FR-033 to FR-039; SC-011 to SC-014) | R1, R9, R11; match-screen-layout.md; `useFit.ts`, `bingo.css` |
| Platform integration and authority (FR-040 to FR-043; SC-015) | R6, R13; platform-integration.md; bingo-protocol.md |
| Out of scope | Money and prizes, bots as players, auto-daub, spectators, saved history, voice, 90-ball variants, automated chat lines, minimize-to-bar chat on wide screens, more than 3 cards (spec Assumptions) |

## Decisions needing your review

These details were left open by the spec; the plan picks a default so tasks can proceed. Change the spec or plan if you disagree.

1. **Per-game player ceiling**: Bingo gets its own optional `BINGO_MAX_PLAYERS` (default 200) instead of sharing `HOUSIE_MAX_PLAYERS`, so changing one game's limit
   never moves the other (R6). The spec's assumption was reworded to "starts at the same value Housie uses and has its own operator setting".
2. **FREE tooltip behavior**: the callout is centered over the FREE cell, ignores pointer input and may overlap neighboring cells, instead of the earlier
   "without covering any number", which cannot fit a readable message on a 40 px cell. Spec FR-015 and User Story 3 scenario 5 were reworded to "without
   blocking taps on any cell".
3. **Tooltip memory is server-held**: a private `freeTapped` flag per card keeps the tooltip gone across reloads and devices (R4); the alternative is
   per-device storage, which would show it again on another device.
4. **Master board orientation**: five B-I-N-G-O columns of 15 numbers is the default (FR-022); on a short, wide region it is drawn rotated (five rows of 15)
   when 15 rows would push numbers below 11 px (R9). Spec FR-022 was reworded to allow this fallback; remove the rotation (and that wording) if you want the
   orientation fixed.
5. **Shared action union**: `setCeiling` stays `1..4` in the shared schema (Housie's range) and the Bingo engine rejects 4, rather than splitting the
   schema by game (R6).
6. **Small Housie-folder edit**: `useRegionSize` moves to `state/viewport.ts` and Housie's `useFit.ts` re-exports it, so Bingo does not import that hook from
   another game's folder (R15); no behavior change.
7. **One cross-game import**: the match screen reuses `LobbyDialog` from `client/src/games/ludo/MatchDialogs.tsx`, as Housie does; moving it to a platform
   folder is left as a later clean-up (R15).

## Complexity Tracking

No constitution violations to justify.
