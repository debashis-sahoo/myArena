# Implementation Plan: Ludo Pawn Sync, Glossy Dice, Housie Phone Readability and Share Text

**Branch**: `004-ludo-housie-polish-updates` | **Date**: 2026-11-02 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/004-ludo-housie-polish-updates/spec.md`

## Summary

Four small, independent polish changes on top of the shipped Platform Core, Ludo and Housie:

1. **Ludo pawn consistency (P1)**: find and fix why a pawn can stay on a square on one screen while others show it elsewhere. The client
   animation layer is the prime suspect (details in [research.md](research.md) R1): hop sequences are not abortable, so a skipped, hidden
   or interrupted move keeps creating `fill: forwards` animations after the state was already committed; those animations pin a pawn to
   a stale pixel position (also stale after a resize) until the next state change. The plan makes the animation layer abortable, makes
   the settled board always come from React's layout (never from a leftover animation), removes pawn element remounts, adds a
   sequence-gap resync, and proves it with a two-screen harness that compares what each screen draws with the server's state.
2. **Housie combination titles (P1)**: replace the one-line ellipsis name with a measured fit: full title on up to two lines, shrunk to a
   10 px floor, then a short recognizable name; ticket sizing is untouched.
3. **Glossy white rounder Ludo die (P2)**: CSS-only restyle of the existing three-slab faces (white gloss, larger radii); no change to
   markup structure, animation, timing or result.
4. **Share description (P3)**: new description text plus Open Graph and Twitter tags in the one `index.html` that every link (Hub and room
   invites) is served from.

No server rule, protocol, or dependency changes.

## Technical Context

**Language/Version**: TypeScript 5.x (strict, `noUncheckedIndexedAccess`) on Node.js 22 LTS; React 19 + Vite; plain CSS

**Primary Dependencies**: Existing only (React, Socket.IO client, Web Animations API). No new dependencies

**Storage**: N/A (in-memory rooms unchanged; no persistence added)

**Testing**: No new automated suites (constitution Principle III). Two-screen scripted browser/socket harness and visual checks recorded in
`verification.md`; `npm run smoke` re-run as a regression check. Harness tooling lives outside the repo, as for 003

**Target Platform**: Render.com free web service (single instance), serving phones, tablets, laptops

**Project Type**: Web application, one deployable (npm workspaces `shared`, `server`, `client`)

**Performance Goals**: Settled positions match the server on every screen within 1 s of a move finishing and always within 2 s; title
fit computed in under 5 ms for 40 tiles (cached text measurement) and re-run only on resize, tile-count or name change; no extra
animation work per frame for the die

**Constraints**: Ticket cells never smaller than today and at least 32 px; combination titles may go down to 10 px (all other text keeps
its 11 px floor); no page scroll from 320 to 2560 px; tap targets at least 40 px; dice result, timing and animation speed unchanged; no
rule/turn/timing changes in Ludo; link previews must work without running JavaScript

**Scale/Scope**: About 13 files touched: 5 in `client/src/games/ludo/`, 1 in `client/src/state/`, 4 in `client/src/games/housie/`,
`client/index.html`, spec documents. Housie combination counts 1 to 40; Ludo rooms of 2 to 4 players with bots

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design (below).*

Constitution: [.specify/memory/constitution.md](../../.specify/memory/constitution.md) v1.1.0.

| Principle / rule | Gate | Pre-research | Post-design evidence |
|------------------|------|--------------|----------------------|
| I. Repository and Render-ready hosting | No new services or required env vars; paths repository-relative | PASS | No config or dependency changes; `render.yaml` untouched |
| Runtime: restart behaviour | Active-state recovery unchanged | PASS | Reconnect still re-joins and receives a snapshot; the new gap resync reuses that same path ([contracts/pawn-sync.md](contracts/pawn-sync.md)) |
| II. Graphics-first | Tactile, glossy, smooth, readable on all devices, reduced motion, max screen use | PASS | Glossy rounder die ([contracts/die-and-share.md](contracts/die-and-share.md)); readable titles with no ticket shrink ([contracts/tile-titles.md](contracts/tile-titles.md)); reduced-motion paths kept for hops and die |
| III. Pragmatic verification | Manual smoke, deterministic checkpoints, visual evidence, no heavy suites | PASS | [quickstart.md](quickstart.md): two-screen checkpoints with controlled dice, device-size screenshots; no new test suites |
| IV. Platform and game decoupling | Game logic in the game module; shared capability in the platform | PASS | Pawn fixes live in the Ludo module; the sequence-gap resync reuses the platform `resyncRoom()` and sits in the platform game slice; Housie changes stay in the Housie module; share meta is platform |
| V. Server-authoritative play | Clients never decide outcomes; reconnect gets an authoritative snapshot | PASS | The client only displays; every correction (gap, visibility, reconnect, settle) shows the server's snapshot; no server contract change |
| Visual quality gate | Phone, tablet, desktop, both orientations, screenshots | PASS (planned) | Verification matrix in [quickstart.md](quickstart.md) V2 and V3 |

No violations; Complexity Tracking is empty. Post-design re-check: PASS (design adds no dependency, rule, or server change).

## Project Structure

### Documentation (this feature)

```text
specs/004-ludo-housie-polish-updates/
├── plan.md              # This file
├── research.md          # Phase 0: decisions and the pawn-sync root-cause analysis
├── data-model.md        # Phase 1: pawn position view, animation sequence, title fit
├── quickstart.md        # Phase 1: validation scenarios
├── contracts/
│   ├── pawn-sync.md         # What every screen must show and how it self-corrects
│   ├── tile-titles.md       # Title fit rules and short-name table rules
│   └── die-and-share.md     # Die look rules and share meta tags
├── checklists/requirements.md
└── tasks.md             # Created by /speckit-tasks
```

### Source Code (repository root)

```text
client/
├── index.html                          # description + Open Graph + Twitter tags
└── src/
    ├── state/roomStore.ts              # Ludo slice: event-gap detection -> resyncRoom()
    └── games/
        ├── ludo/
        │   ├── anim/hop.ts             # abortable hopAlong, no leftover fills
        │   ├── anim/capture.ts         # abortable bounceHome
        │   ├── Pawns.tsx               # abort on cleanup, settle reconciliation, stable pawn element, data-sq
        │   ├── pawnLayout.ts           # squareKeyOf for data-sq
        │   ├── useLudo.ts              # catch-up rule, pageshow/online/visibility settle, abort on newer snapshot
        │   └── ludo.css                # glossy white rounder die
        └── housie/
            ├── CombinationTiles.tsx    # uses the title fit; snug/row/tight tile layouts
            ├── CombinationTiles.css    # two-line names, 10 px floor, 40 px hit area, inset-shadow frame
            ├── useFit.ts               # title fit added; planTiles gains a readable tile width cap and scroll tile heights (ticket planning unchanged)
            └── shortNames.ts           # new: short form for all 40 patterns
```

**Structure Decision**: Existing web-application layout; no new packages. Housie's display-only short names live in the client Housie
module (not in `shared/`), because the server never uses them.

## Complexity Tracking

> Empty: no constitution violations to justify.
