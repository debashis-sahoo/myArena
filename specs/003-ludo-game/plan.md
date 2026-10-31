# Implementation Plan: Ludo

**Branch**: `003-ludo-game` | **Date**: 2026-10-30 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/003-ludo-game/spec.md`

## Summary

Add Ludo as the platform's first real game: 2 to 4 players in a private room, or alone against 1 to 3
computer opponents, with a realistic 3D board, pawns and a natural 3D die, five themes, room chat
beside the match, and an attractive picture on the games page tile.

Technical approach (decisions and alternatives in [research.md](research.md)):

- **Game channel (platform, generic)**: the platform has no path for game traffic today. Add one
  WebSocket intent (`game.action`), one server message (`game`) and an optional `game` field on the
  snapshot, plus four optional SDK hooks. Each update carries the recipient's complete state and a
  short event list, so reconnection and late arrival are repaired by the next message. No Ludo
  rules enter the platform. See [contracts/game-channel.md](contracts/game-channel.md).
- **One pure rules engine (`packages/ludo`)**: board geometry, the classic rules with blocks,
  auto-play, and the easy, normal and hard strategies, as pure functions with injected dice. The
  server's match runner (online) and the web's solo runner both use it.
- **Server module**: owns timers (turn limit, settle window, away), cryptographic dice, the first
  player and animation seeds, and the per-recipient view. Clients only send `roll`, `move` and
  `resume`. See [contracts/ludo-protocol.md](contracts/ludo-protocol.md).
- **Web**: a lazily loaded Ludo module with an online match screen, lobby settings (theme picker
  with static previews) and a solo screen. Rendering has two paths: Three.js scenes at high and
  standard quality, loaded only when a match starts, and a flat SVG board for lite quality, for
  devices without WebGL and for failures. The die throw is generated from a seed so every device
  draws the same throw ending on the decided face.
- **Games page**: a catalog entry can name one shipped picture (`art.image = LUDO`); the tile and
  the options header show an original SVG, with the old icon art as the fallback.

## Technical Context

**Language/Version**: TypeScript 5 (strict) on Node 24 (server, tooling); evergreen browsers (current Chrome, Edge, Firefox, Safari on laptop, Android and iPhone)

**Primary Dependencies**: Existing: React 19 and React Router, Vite, Fastify with websocket, helmet and rate-limit, Zod (shared in `packages/protocol`), `packages/game-sdk`, lucide-react. New: `three` (and its types) in the web app only, imported lazily by the Ludo scene; a new workspace package `@myarena/ludo` with no runtime dependencies. No physics library, no model, texture or font downloads.

**Storage**: Server: none new (rooms and the running match stay in memory; the match is freed when the room returns to the lobby or closes). Browser `localStorage`: `myarena-ludo-quality`, `myarena-ludo-view`, `myarena-ludo-solo-setup`, `myarena-ludo-solo` (30-minute expiry); 002 keys unchanged. Nothing stored identifies a person beyond what 002 already keeps.

**Testing**: Vitest (engine, runner with a fake clock, projection, reducers, solo, themes, budgets; server integration with real WebSocket clients; contract), Playwright with axe (landing tile, lobby, a four-context match in the lite renderer, one 3D readiness check, keyboard, reduced motion, overflow), a four-bot load scenario, and recorded real-device acceptance.

**Target Platform**: Browser clients on laptop, Android and iPhone; one Node 24 service on Render, unchanged.

**Project Type**: Web application in an npm workspace monorepo (`apps/server`, `apps/web`, `packages/protocol`, `packages/game-sdk`, `tools/load`), plus the new `packages/ludo`.

**Performance Goals**: Die settles within 3 s on every device (SC-004); match screen ready within 5 s for 95% of starts on a typical mobile connection (SC-006); at least 30 frames per second for 95% of a 4-player match at the automatic quality on the acceptance phones; chat within 1 s (SC-008); computer turn within 3 s excluding the roll animation (SC-014); landing page within the 002 target with the picture in place (SC-016).

**Constraints**: Production CSP stays self-only (no inline `style=` in markup, no remote assets, no `eval`, no workers, no WebAssembly). Initial JavaScript stays at or below 200 KB gzipped; no 3D engine in any non-lazy chunk; the Ludo lazy chunks together at most 400 KB gzipped; the tile picture at most 100 KB. Reduced motion forces animation off. Light and dark modes meet WCAG 2.2 AA. The server decides every roll, move, timeout and the first player. Client frames stay within 4 KB.

**Scale/Scope**: Up to 20 rooms of 4 players (existing room limits); a Ludo match holds under 10 KB of state; one active game timer per room.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

Constitution: `.specify/memory/constitution.md` v0.1.0-draft (not ratified).

| # | Principle | Before research | After design | Evidence or note |
|---|-----------|-----------------|--------------|------------------|
| I | Account-Free Play | Pass | Pass | Rooms and solo need only a display name or nothing. Solo state is local and device-only. |
| II | Browser-First, Mixed-Device | Pass | Pass | WebGL where available, flat SVG board otherwise; real-device matrix kept (FR-038, quickstart 28). |
| III | Two Room Roles | Pass | Pass | The host takes turns under the same rules; no spectator role; a late joiner waits with chat and holds no seat (R13). |
| IV | Server-Authoritative | Pass with risk | Pass with mitigation | The server draws every die value, seed and the first player with a cryptographic source, runs all timers, and validates every action; clients send only `roll`, `move`, `resume`. Solo runs locally, which the principle allows. The test-dice setting is refused in production. |
| V | Security and Privacy | Pass | Pass | Strict Zod validation of settings and actions, rate limit shared with other intents, rejected actions never change state, logs hold only seat counts and durations, `WAITING` members receive no board, CSP unchanged, no secrets added. |
| VI | Reliable Reconnection | Pass | Pass | Snapshot carries the game view; full-state updates and idempotent `clientActionId` give no lost or doubled roll or move (R2); a roll in progress is shown settled on return. |
| VII | Accessible, Responsive | Pass with risk | Pass with mitigation | Every action has a native control, a hidden board description and one live region; 44 px targets; reduced motion removes tumbling and camera motion; colour paired with shape marks; axe in three themes. The canvas is never the only way to play (R10). |
| VIII | Platform and Game Separation | Pass with risk | Pass | The platform gains a generic channel and SDK hooks only. Ludo's rules, timers, view and solo mode live in `packages/ludo`, the server game module and the web game module. |
| IX | Evidence-Based Delivery | Pass | Pass | Tasks will trace to FR and SC ids; scenarios in the quickstart map to requirements; device and review evidence is recorded, never claimed. |
| X | Simple, Maintainable | Pass with justification | Pass with justification | Each new piece is justified under Complexity Tracking; boundaries (rules, runner, transport, rendering) are independently testable. |
| XI | Clean, Intuitive Design | Pass with risk | Pass with mitigation | 3D is lazy, adaptive and optional (lite quality); effects follow reduced motion; both colour modes are first-class; the lobby loads no 3D code. |

**Governance notes**

- The constitution lists Ludo as delivery feature 2; this feature matches it. The platform changes
  (game channel, room size bounded by the game, optional catalog picture) amend features 001 and
  002 and are recorded in the spec's "Changes to Existing Requirements" and the contracts.
- 001 expected Babylon.js to be the 3D engine and wrote that into the bundle budget check. This
  plan chooses Three.js (research R7) and generalizes the check to any 3D engine. This is a
  design choice, not a constitutional departure; record it when the constitution is ratified.
- The real-device acceptance requirement applies in full. Nothing in this plan waives it.

**Gate result**: No unjustified violations. Proceed.

## Project Structure

### Documentation (this feature)

```text
specs/003-ludo-game/
├── plan.md              # This file
├── research.md          # Phase 0 decisions (R1 to R18)
├── data-model.md        # Phase 1 entities, rules, state changes, strategies
├── quickstart.md        # Phase 1 validation scenarios
├── contracts/
│   ├── game-channel.md                      # platform delta: intent, message, SDK hooks, room-size rule
│   ├── ludo-protocol.md                     # settings, actions, view, events, timing
│   ├── ui-contract.md                       # tile, lobby, match, solo, accessibility, storage, themes
│   └── catalog-art-image.openapi.yaml       # REST delta: optional catalog picture name
├── checklists/
│   └── requirements.md
└── tasks.md             # Created later by /speckit-tasks
```

### Source Code (repository root)

```text
packages/
├── ludo/                              # new: pure rules engine, no runtime dependencies
│   ├── src/
│   │   ├── board.ts                   # constants, steps, ring and lane maths, protected squares
│   │   ├── layout.ts                  # 15 by 15 grid table shared by both renderers
│   │   ├── seats.ts                   # colour assignment and turn order
│   │   ├── state.ts                   # types: seat, pawn, turn, log entry
│   │   ├── engine.ts                  # createMatch, roll, move, removeSeat, resume, legalPawns
│   │   ├── auto.ts                    # timeout and away choice
│   │   ├── strategies.ts              # easy, normal, hard
│   │   ├── view.ts                    # LudoView and event types, dependency-free action validator
│   │   ├── dice-animation.ts          # seeded throw path ending on a given face (math only)
│   │   └── index.ts
│   └── tests/unit/                    # rules, geometry, seats, auto, strategies, animation maths
├── game-sdk/src/
│   ├── lifecycle.ts                   # JsonValue, publish, participants, viewFor, onParticipantLeft, releaseMatch
│   └── presentation.ts                # ART_IMAGES = ['LUDO'], GameArt.image?
└── protocol/src/
    ├── messages.ts                    # game.action intent, game message, snapshot.game
    ├── errors.ts                      # GAME_ACTION_REJECTED
    └── catalog.ts                     # art.image enum

apps/server/src/
├── games/
│   ├── ludo/
│   │   ├── ludo-game.ts               # GameLifecycle: descriptor, onMatchStart, onAction, viewFor, hooks
│   │   ├── match-runner.ts            # timers, settle window, auto-play, away, publishing
│   │   ├── settings.ts                # strict settings schema
│   │   ├── view.ts                    # projection (MATCH or WAITING)
│   │   └── dice.ts                    # cryptographic dice and seeds, scripted source for tests
│   ├── registry.ts                    # validate art.image
│   └── roadmap.ts                     # remove the ludo entry
├── config/env.ts                      # LUDO_TEST_DICE, refused when NODE_ENV=production
├── realtime/                          # authorize, intents (route game.action), snapshot game
├── rooms/
│   ├── match.ts                       # call hooks, matchId and seq, releaseMatch
│   ├── lobby.ts                       # bound maxParticipants by the game on update and select
│   ├── projection.ts                  # unchanged lobby projection
│   └── room-service.ts                # publishGame, snapshot game, participantLeft forwarding
├── http/app.ts                        # wire publishGame to connections
└── main.ts                            # register the Ludo game

apps/web/src/
├── platform/room-state.ts             # game state, matchId and seq rules
├── features/
│   ├── games/registry.ts              # new: online game module registry (Settings, Match)
│   ├── lobby/RoomPage.tsx             # use the registry for settings and the match area
│   ├── landing/                       # GameArt image support, tile banner, options header, art-images.ts
│   ├── solo/registry.ts               # add the lazily loaded ludo entry
│   └── ludo/
│       ├── index.ts                   # lazy module entries
│       ├── themes/                    # theme data, previews (SVG), generators selected by id
│       ├── settings/                  # LudoSettings (theme picker, turn limit)
│       ├── match/                     # LudoMatch, useRoomGame, event queue, announcements
│       ├── view/                      # BoardView, Board2D (SVG), controls, status bar, log, result, away banner
│       ├── scene/                     # Three.js: renderer, board, pawns, die, environment, textures, camera, loop
│       ├── quality/                   # detection, persistence, adaptive downgrade, context loss
│       ├── solo/                      # LudoSolo, setup, runner, save and expiry
│       └── a11y/                      # board description and announcement text
├── assets/ludo-tile.svg               # new: original picture for the games page
└── styles/                            # ludo.css (layout, sheets, board wrapper)

apps/web/vite.config.ts, apps/web/build/budget.ts   # generalize to "no 3D engine in non-lazy chunks", add lazy and picture limits
apps/web/tests/                                      # unit and e2e (see Testing); Ludo "Coming soon" e2e checks move to Tambola
apps/server/tests/                                   # unit, integration, contract
tools/load/                                          # four-bot Ludo scenario
package.json                                         # build:shared builds packages/ludo
```

**Structure Decision**: Keep the 001 monorepo layout. Platform contracts stay in
`packages/protocol` and `packages/game-sdk`. One new package, `packages/ludo`, holds the pure rules
so the server and solo share them. The server owns the match runner and authority; the web app
owns every Ludo screen and renderer in one feature folder. No new app or service is added.

## Delivery Phases (input to /speckit-tasks)

| Phase | Scope | Depends on |
|-------|-------|------------|
| 1 | Game channel: protocol schemas and rejection code, SDK hooks, server routing, snapshot `game`, `matchId` and `seq`, participant-left forwarding, room size bounded by the game, web reducer and online game registry, contract tests | none |
| 2 | Engine `packages/ludo`: geometry and layout table, seats, rules with blocks, auto choice, strategies, view types and action schemas, seeded throw maths, full unit tests | none (parallel with 1) |
| 3 | Server Ludo module: settings, dice source, runner and timers, view projection, registration, roadmap removal, test-dice guard, integration tests with real sockets | 1, 2 |
| 4 | Web online match without 3D: lobby settings and theme previews, match screen, status bar, controls and pawn chooser, flat SVG board, log and chat sheets, announcements, reduced motion; a complete playable and accessible match | 1, 2, 3 |
| 5 | 3D scene and themes: Three.js renderer, procedural materials and studio lighting, board, pawns, die with seeded throw, five themes, views, quality levels, adaptive downgrade, context-loss fallback | 4 |
| 6 | Solo: runner and pacing, setup, save and 30-minute expiry, solo registry entry, play again | 2, 4 (5 for visuals) |
| 7 | Games page picture: `art.image` in schemas, the SVG, tile banner, options header, fallback, size check | none (parallel) |
| 8 | Tests and budgets: e2e migration and new specs, axe in three themes, overflow and touch targets, bundle and lazy-size checks, four-bot load scenario | 3 to 7 |
| 9 | Acceptance and docs: acceptance records and template use, security review addendum, review sessions, cross-links from 001 and 002 | 8 |

**Risks**

- **Realism**: procedural art may miss the 4 out of 5 review target (SC-005). Mitigation: early
  review after phase 5; the escape hatch is self-hosted compressed models under the same CSP and
  budget (R7).
- **Mobile 3D performance and context loss** on low-powered phones and iOS Safari. Mitigation:
  adaptive quality, render on demand, restore once then lite, and the lite renderer is a complete
  game (R8).
- **Platform changes touch shared code** (protocol, snapshot, lobby limits). Mitigation: additive
  messages, contract tests first, and the existing 001 and 002 suites kept green in phase 1.
- **Existing e2e specs** treat Ludo as "Coming soon" and break when it becomes playable; they move
  to Tambola in phase 8.
- **Idle timers and no turn limit**: a disconnected player with no limit stalls the match until the
  recovery window ends. Accepted and documented (R4).
- **Bundle growth**: `three` and the scene must stay in lazy chunks; the generalized budget check
  fails the build otherwise.

## Complexity Tracking

| Addition | Why needed | Simpler alternative rejected because |
|----------|------------|--------------------------------------|
| Generic game channel (intent, message, four SDK hooks) | The platform has no path for game traffic; Principle IV needs the server to receive intents and send state | A Ludo-only endpoint would duplicate authentication and recovery and force the next two games to repeat it (R1). |
| New package `packages/ludo` | Online authority and local solo must apply identical rules | Rules in the server only forces solo through the network; rules copied into the web drift (R3). |
| Three.js (lazy) | Realistic lighting, materials and shadows are the headline request | CSS 3D cannot light or shadow realistically; raw WebGL costs far more for the same result (R7). |
| Server match runner with timers | Turn limit, away handling and settle window must be authoritative | Client-side timers can be skipped or faked, breaking FR-006 and FR-010 (R4). |
| Second renderer (flat SVG, lite) | Required by FR-026; also the fallback when WebGL is missing or lost | A single 3D renderer would exclude low-powered phones and break SC-011 (R8). |
| Seeded throw instead of physics | Same throw on every device that always ends on the decided face | Per-device physics disagrees and needs a correction step; a physics library adds size (R6). |
| Optional `art.image` and one shipped picture | FR-047 asks for an attractive picture, which generated icon art cannot give | A server-provided URL widens the CSP and injection surface; a raster file is larger and blurry on dense screens (R14). |
| `LUDO_TEST_DICE` setting | Scenario tests need repeatable rolls | Mocking inside the server bundle would leave production code untested; the setting is refused in production (R5). |
