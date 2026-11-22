# Implementation Plan: Premium Active-Game Hub

**Branch**: `009-premium-active-hub` | **Date**: 2026-11-22 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/009-premium-active-hub/spec.md`

## Summary

Redesign the host and player Hub as a premium, page-wide cosmic experience while preserving the existing room and game flows. The implementation will filter the shared game catalog to active entries, replace active-game marketing art with optimized dimensional assets, expose PLAYER HUB / HOST ARENA as separate live text beneath the approved title artwork, and retain a neutral asset fallback. Four host/player desktop/phone previews must be approved before production UI or asset changes begin; implementation remains client-presentation only.

## Technical Context

**Language/Version**: TypeScript 5.6 on Node.js 22

**Primary Dependencies**: React 19, React Router 7, Vite 6, existing shared game catalog and CSS art platform

**Storage**: No new persistence; static client assets plus the existing in-memory/shared game catalog

**Testing**: `npm run build`, existing `npm run smoke`, browser visual/interaction checks, four-preview approval gate, and Render asset verification

**Target Platform**: Modern mobile, tablet, and desktop browsers served by the existing same-origin Render Web Service

**Project Type**: TypeScript monorepo web application with shared, server, and client workspaces

**Performance Goals**: Hero and room-code action visually usable within 2.5 seconds on standard broadband; below-the-fold art must not delay profile, audio, or joining

**Constraints**: No framework migration; no WebGL/Three.js requirement; active-only catalog; no server, room, gameplay, or authoritative-state changes; preview approval before implementation; reduced-motion and failure fallbacks

**Scale/Scope**: Two Hub modes, four currently active games at plan time, dynamic support for future catalog entries marked active, one full responsive landing-page redesign

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status | Evidence |
|-----------|------|--------|----------|
| I. Render-ready hosting | Same-origin assets and existing build/start contract must deploy unchanged | PASS | Static artwork remains under the client bundle; no environment or service changes |
| II. Graphics-first experience | Premium visuals, responsive fit, touch/pointer states, and reduced motion are acceptance requirements | PASS | Preview gate, card/title contracts, full viewport matrix, and visual evidence are planned |
| III. Velocity and pragmatic verification | Use focused browser and smoke checks rather than a new broad test harness | PASS | Existing build/smoke plus direct visual scenarios and evidence log |
| IV. Platform and game decoupling | Hub owns catalog presentation; games retain behavior and room integration | PASS | Only Hub/card/art surfaces consume active catalog status; no game engine or room changes |
| V. Server-authoritative real-time play | Decorative and launch UI must not alter dice, rooms, turns, or winners | PASS | Artwork and filtering are presentation-only; Ludo die is explicitly decorative |
| UI visual gate | Phone/tablet/desktop, portrait/landscape where applicable, and production evidence required | PASS | Quickstart defines local matrix and Render asset verification |
| Preview-before-code | Four host/player desktop/phone previews approved before implementation | PASS | Preview approval is the first implementation prerequisite and contract |

**Result**: PASS. No constitution violations or exceptions are required.

## Project Structure

### Documentation (this feature)

```text
specs/009-premium-active-hub/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── hub-visual-contract.md
│   └── preview-approval.md
└── tasks.md                    # Created by /speckit-tasks
```

### Source Code (repository root)

```text
shared/src/
└── games.ts                    # Existing authoritative catalog and active status

client/
├── public/
│   └── brand/
│       ├── myarena-title.webp   # Role-neutral approved title artwork
│       └── games/              # Approved optimized active-game artwork
├── src/
│   ├── art/
│   │   └── Logo.tsx            # Approved title asset plus accessible heading
│   ├── components/hub/
│   │   ├── Header.tsx          # Profile, title, live role subtitle, audio
│   │   ├── GameGrid.tsx        # Active-only catalog filtering
│   │   ├── GameCard.tsx        # Host action/player showcase and visual fallback
│   │   └── JoinRoomPanel.tsx   # Existing player room-code flow, visually refined
│   ├── routes/
│   │   └── HubPage.tsx         # Existing host/player composition
│   └── styles/
│       ├── hub.css
│       ├── tokens.css
│       └── animations.css
└── dist/                       # Existing production output

server/
└── src/                        # No planned source changes
```

**Structure Decision**: Keep the existing monorepo. This is a client presentation feature owned by the Hub. Shared catalog status remains authoritative, while room/server and game modules remain unchanged.

## Phase 0: Research

### R1. Active-game source

- Use the existing shared game catalog’s `status` as the only availability flag for Hub visibility.
- Filter before card rendering so future entries marked `active` appear automatically and any `coming_soon` or unavailable entry is absent.
- Preserve the existing game IDs for launch, routes, and shared artwork lookup.

### R2. Premium artwork format and delivery

- Use approved, pre-rendered same-origin PNG/WebP assets for title and active-game marketing art. The title artwork is role-neutral; PLAYER HUB and HOST ARENA are live text only.
- Keep a stable visual slot per card so image decoding cannot shift the grid.
- Add eager loading only for the hero and above-the-fold first card set; lazy-load remaining card imagery.
- Prefer WebP for new card artwork when visually acceptable, retaining PNG or SVG only where transparency or fidelity requires it.

### R3. Separate live role subtitle

- Keep the crown title as role-neutral rendered artwork for exact styling.
- Render PLAYER HUB / HOST ARENA as separate live text below the artwork, with the mode supplied by the existing route.
- Use CSS sizing and spacing independent of the raster so the subtitle is never clipped by the title canvas.

### R4. Preview approval workflow

- Produce four static previews: host desktop, player desktop, host phone, and player phone.
- Place preview files in the feature’s `previews/` evidence folder.
- Record approval state in the feature’s preview manifest without editing production client files.
- Implementation begins only after all four previews are approved.

### R5. Card-art fallback

- Active cards retain names, descriptions, accessible labels, and actions if an image fails.
- Use a neutral, branded fallback illustration inside the same dimensions rather than the artwork of another game or an inactive/coming-soon treatment.
- Never reuse Ludo artwork as the generic fallback because it would misidentify the card.
- A future catalog game is marked active only after its approved game-specific artwork exists; neutral fallback remains a temporary delivery/loading recovery, not the normal active-game presentation.

### R6. Ludo die correction

- Treat the Ludo die as promotional artwork only.
- Approve a natural six-sided cube composition with visible front/top/side faces, rounded edges, cast shadow, and coherent pip placement.
- Do not connect the illustration to runtime dice state, roll animation, rules, or server payloads.

## Phase 1: Design

### Visual composition

- Header: profile left, title and live role subtitle centered, audio right.
- Player: compact room-code action retained above the active-game grid.
- Host: compact host identity and active launch cards without the player join panel.
- Cards: active-only, dimensional artwork, readable metadata, luminous border, mode-aware action or guidance.
- Footer: remove messaging that implies additional current/coming-soon games when none are shown.

### Catalog presentation flow

1. Read the shared game catalog.
2. Select entries whose status is active.
3. Render one `GameCard` per active entry.
4. Resolve artwork by the active game ID.
5. In host mode, preserve the existing launch callback.
6. In player mode, preserve non-interactive showcase behavior and room-code guidance.
7. If artwork fails, retain card size and replace only the visual region with the neutral fallback.

### Asset contract

- The player and host experiences may use role-neutral title artwork shared across both modes; no title image contains PLAYER HUB or HOST ARENA because those labels are live text.
- All active game art uses a common transparent-safe canvas and consistent focal placement.
- Card art is decorative only; the textual name remains the accessible identity.
- The Ludo die is not reused in gameplay artwork and is not driven by a selected roll value.

### Post-design Constitution Check

| Principle | Status | Confirmation |
|-----------|--------|--------------|
| I. Render-ready hosting | PASS | Same-origin static assets; no new service or environment contract |
| II. Graphics-first experience | PASS | Premium artwork and responsive/reduced-motion contracts are explicit |
| III. Pragmatic verification | PASS | Four-preview approval plus focused build, smoke, browser, and Render checks |
| IV. Platform/game decoupling | PASS | Active cards consume catalog status; games and universal room wrapper are unchanged |
| V. Authoritative play | PASS | No gameplay payload, dice authority, room state, or server logic is touched |
| Deployment verification | PASS | `/healthz`, HTTPS/WSS connectivity, and reconnect/resynchronization are explicit acceptance checks |

No unresolved clarification or constitution gate remains.

## Complexity Tracking

No constitutional violations or additional architectural complexity are introduced.
