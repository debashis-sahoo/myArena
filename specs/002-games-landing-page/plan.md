# Implementation Plan: Games Landing Page and Game-First Room Setup

**Branch**: `002-games-landing-page` (name reported by the setup script; no git branch was created) | **Date**: 2026-10-30 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/002-games-landing-page/spec.md`

## Summary

Replace the side-by-side entry screen with a games landing page in a whole-app royal purple and
gold identity (light and dark). Visitors see "Playable Games" and a "Future Arena Catalog" as
tiles. Only after a playable tile is chosen does the page show "Play against AI" and/or "Create
private room", the latter with a display name and a player-count control bounded by the game's
range. Joining by code stays available at all times.

Technical approach (details in [research.md](research.md)):

- **Catalog**: games describe their own presentation through an extended `GameDescriptor`
  (`packages/game-sdk`). A new `GET /api/catalog` merges registered playable games with a static
  roadmap of planned games. `GET /api/games` is unchanged, so the lobby is untouched.
- **Room setup**: `POST /api/rooms` stays backward compatible and gains optional `gameId` and
  `maxParticipants`. The room is created already holding the selected game and the seat limit.
- **Web**: `/` becomes `features/landing`. Tiles are toggle buttons, the selected game lives in
  `?game=`, and the options panel sits below the grid. Artwork is drawn in code from a fixed
  icon and palette vocabulary, so there are no image files and the CSP is unchanged.
- **Solo**: a lazy web registry and `/play/:gameId/solo` give games a way in. This feature ships
  only a test module.
- **Preview-only test game**: `DEPLOY_TARGET=preview` is the only way `TEST_GAME_SECONDS` is
  accepted in production mode. It is off by default and the game is labelled "Test game".

## Technical Context

**Language/Version**: TypeScript 5 (strict) on Node 24 (server, tooling); evergreen browsers (current Chrome, Edge, Firefox, Safari on laptop, Android and iPhone)

**Primary Dependencies**: Unchanged: React 19 and React Router, Vite, Fastify with helmet and rate-limit, Zod (shared in `packages/protocol`), `packages/game-sdk`. No new runtime dependency. Icons reuse the existing icon library, imported per icon.

**Storage**: Server: none new (rooms stay in memory as in 001). Browser: `localStorage` keys `myarena-name`, `myarena-effects`, `myarena-sound`, `myarena-last-room` (the existing `myarena-theme` is kept). No credentials are stored there; the member cookie is unchanged.

**Testing**: Vitest (server unit, contract and integration; web unit), Playwright (landing e2e plus rewritten entry flows), axe in three themes, overflow and touch-target checks, bundle-size check. Real-device acceptance is recorded separately.

**Target Platform**: Browser clients on laptop, Android and iPhone; Node 24 service on a single Render instance.

**Project Type**: Web application in an npm workspace monorepo (`apps/server`, `apps/web`, `packages/protocol`, `packages/game-sdk`, `tools/load`).

**Performance Goals**: Tiles readable and selectable within 3 seconds on a typical mobile connection (spec SC-006). No layout shift when artwork appears, because it is drawn in code.

**Constraints**: Production CSP stays self-only (no inline `style=`, no remote fonts or images). Gzipped app bundle stays at or below 200 KB (about 138 KB now); solo modules are lazy and excluded. Reduced motion forces animation off. Light and dark themes meet WCAG 2.2 AA. No game rules in the landing page.

**Scale/Scope**: 7 catalog entries today (3 near-term game features plus 4 placeholders); the layout and API are sized for a few dozen. Room limit stays 100 seats; product limits (20 rooms, 200 participants) are unchanged.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

Constitution: `.specify/memory/constitution.md` v0.1.0-draft (not ratified).

| # | Principle | Before research | After design | Evidence or note |
|---|-----------|-----------------|--------------|------------------|
| I | Account-Free Play | Pass | Pass | Only a display name and local preferences; nothing requires sign-in. |
| II | Browser-First, Mixed-Device | Pass | Pass | Responsive one-to-many column layout; real-device matrix kept (spec FR-030, quickstart S12). |
| III | Two Room Roles | Pass | Pass | The creator is the host as in 001; no new role. |
| IV | Server-Authoritative | Pass | Pass | The server validates game id, availability and player count; the client only sends intent. Solo runs locally, which the principle allows. |
| V | Security and Privacy | Pass with risk | Pass with mitigation | The preview test-game relaxation is guarded by an explicit, off-by-default setting, labelled in the UI, and covered by an addendum to the security review. Only a display name is stored locally. Room ids in storage are not credentials. |
| VI | Reliable Reconnection | Pass | Pass | Return-to-room banner uses the existing `/session` probe; recovery rules are untouched. |
| VII | Accessible, Responsive | Pass | Pass | Toggle-button tiles, announced status and selection, focus management, reduced motion, 320 px and 200% text checks, axe in three themes. |
| VIII | Platform and Game Separation | Pass | Pass | Games supply their own presentation and modes; the page and catalog endpoint hold no rules. Roadmap entries are inert metadata. |
| IX | Evidence-Based Delivery | Pass | Pass | Tasks will trace to FR and SC ids; the acceptance record extends the 001 template. |
| X | Simple, Maintainable | Pass with justification | Pass | New endpoint, static roadmap, and DEPLOY_TARGET guard are justified under Complexity Tracking. |
| XI | Clean, Intuitive Design | Pass | Pass | Pure CSS effects only (no 3D library); effects can be turned off and are off under reduced motion. Both themes are first-class. |

**Governance notes**

- The constitution's Delivery Features list names four features. This feature is an additional
  platform feature that amends feature 1's entry screen. It is not a violation; recommend
  recording it when the constitution is ratified.
- The real-device acceptance requirement applies in full. Nothing in this plan waives it.

**Gate result**: No unjustified violations. Proceed.

## Project Structure

### Documentation (this feature)

```text
specs/002-games-landing-page/
├── plan.md              # This file
├── research.md          # Phase 0 decisions
├── data-model.md        # Phase 1 entities, validation, state
├── quickstart.md        # Phase 1 validation scenarios
├── contracts/
│   ├── catalog-and-room-setup.openapi.yaml   # REST delta over 001
│   ├── game-module-contract.md               # descriptor extension, solo module, preferences
│   └── ui-contract.md                        # landing states, semantics, URL and storage
├── checklists/
│   └── requirements.md
└── tasks.md             # Created later by /speckit-tasks
```

### Source Code (repository root)

```text
packages/
├── game-sdk/src/
│   ├── descriptor.ts            # extend GameDescriptor with presentation fields
│   └── presentation.ts          # new: art icon and palette vocabularies, ways-to-play type
└── protocol/src/
    ├── catalog.ts               # new: CatalogEntry schema and CatalogResponse
    ├── errors.ts                # GAME_UNAVAILABLE as an HTTP problem
    └── index.ts                 # export catalog

apps/server/src/
├── config/env.ts                # DEPLOY_TARGET and the preview-only test-game rule
├── games/
│   ├── registry.ts              # validate new descriptor fields
│   ├── roadmap.ts               # new: static planned games
│   ├── catalog.ts               # new: merge playable games and roadmap
│   └── stub-game.ts             # labelled "Test game", plus a second online-only test game
├── http/routes/
│   ├── catalog.ts               # new: GET /api/catalog
│   └── rooms.ts                 # POST /api/rooms: optional gameId and maxParticipants
├── http/app.ts                  # register catalog route
├── rooms/
│   ├── room-setup.ts            # new: pure validation of game and player count
│   └── room-service.ts          # createRoom accepts setup choices
└── main.ts                      # register test games under the preview rule
render.yaml                      # add DEPLOY_TARGET and TEST_GAME_SECONDS keys without values

apps/web/src/
├── app/                         # router (`/` to landing), App, HeaderControls, ThemeSwitch
├── features/
│   ├── landing/                 # new: LandingPage, Hero, GameGrid, GameTile, GameArt,
│   │                            #       PlayOptions, CreateRoomPanel, PlayerCountField,
│   │                            #       JoinWithCode, ReturnToRoom, useCatalog, selection
│   ├── entry/                   # keep JoinRoomForm and JoinRoutePage; extract the shared
│   │                            # submit and retry-key hook; remove EntryPage and CreateRoomForm
│   ├── solo/                    # new: SoloPage, registry (lazy), test solo module
│   └── lobby/                   # restyle only; behavior unchanged
├── platform/                    # catalog-client, preferences, last-room
└── styles/                      # retint tokens and themes; landing.css, art.css

apps/web/tests/e2e/              # new landing spec; helpers.ts createRoom and joinByCode rewritten;
                                 # entry, a11y, keyboard, responsive, lobby, host, recovery updated
apps/web/tests/unit/             # tile semantics, PlayerCountField, preferences, hero guidance, banner
apps/server/tests/               # catalog merge, env guard, room body, GAME_UNAVAILABLE, counts,
                                 # full room at chosen count, idempotency
```

**Structure Decision**: Keep the 001 monorepo layout. Platform contracts live in
`packages/protocol` and `packages/game-sdk`, the server owns catalog assembly and validation, and
the web app owns the landing feature folder. No new package or project is added.

## Delivery Phases (input to /speckit-tasks)

| Phase | Scope | Depends on |
|-------|-------|------------|
| 1 | Catalog contracts: SDK descriptor, protocol schema, registry validation, roadmap, `GET /api/catalog`, env guard, `render.yaml`, second test game | none |
| 2 | Room setup API: `room-setup.ts`, `createRoom` options, `GAME_UNAVAILABLE`, idempotency fingerprint | 1 |
| 3 | Design system retint of tokens, themes, components and lobby; effects flag; AA contrast | none (parallel with 1 and 2) |
| 4 | Landing UI, header controls, preferences, return banner, shared submit hook | 1 to 3 |
| 5 | Solo launch: lazy registry, SoloPage, test module | 4 |
| 6 | Tests: server, web, new landing e2e, rewritten e2e helpers, a11y, overflow, budgets | 2 to 5 |
| 7 | Docs, acceptance template for landing scenarios, security addendum, 001 spec cross-links | 6 |

**Risks**

- On the real service every tile is "Coming soon" until a game feature ships; the empty state
  must still look intentional.
- Many 001 e2e specs use the old "Create a room" region and need migration (phase 6).
- Bundle headroom is about 60 KB; keep tile art in CSS and icons per-import.
- The preview test-game relaxation changes a security guard; covered by tests and the addendum.

## Complexity Tracking

| Addition | Why needed | Simpler alternative rejected because |
|----------|------------|--------------------------------------|
| New `GET /api/catalog` endpoint | The page must show playable and planned games; planned games have no registered lifecycle | Extending `GET /api/games` would change what the lobby lists and risks showing unplayable games as selectable. |
| Static roadmap data on the server | Planned games need names, descriptions and art before their features exist | Hard-coding in the web app would put game knowledge in the page (Principle VIII) and hide it from contract tests. |
| `DEPLOY_TARGET` preview guard | Real-device acceptance needs a playable game before real games ship | Allowing `TEST_GAME_SECONDS` in production unconditionally removes an existing safety check; a build-time flag would need separate builds. |
| Second online-only test game | Needed to test both mode cases and different ranges | Parameterising one test game would hide the per-game differences the page must follow. |
