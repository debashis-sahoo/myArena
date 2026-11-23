# Implementation Plan: Polish Gameplay Visuals

**Branch**: `010-polish-gameplay-visuals` | **Date**: 2026-11-22 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/010-polish-gameplay-visuals/spec.md`

## Summary

Refine existing graphics and responsive layouts without changing unrelated game rules or platform
flows. Ludo retains its authoritative roll value and gains a more natural rounded cube, dark pips,
multi-impact tumble, and tracked shadow. Housie uses its measured player-console region to maximize
complete recent-call chips. UNO's authoritative play path makes a sole final powercard resolve
normally, award one replacement, and continue rather than finish. Hub artwork keeps stable aspect
ratios with corrected Ludo framing, and existing confetti surfaces become denser while preserving
reduced-motion and input safety.

## Technical Context

**Language/Version**: TypeScript 5.6 on Node.js 22; TSX/JSX in React 19

**Primary Dependencies**: React 19, Vite 6, Socket.IO 4, Express 4, Zod 4, existing CSS, and Web Animations APIs

**Storage**: In-memory room and match state only; no database or persistent player data

**Testing**: `npm run build`, `npm run smoke`, development-only deterministic checkpoints, two-client socket checks, and browser viewport/reduced-motion evidence

**Target Platform**: Render Web Service plus current phone, tablet, desktop, and ultrawide browsers

**Project Type**: TypeScript monorepo with shared protocol, authoritative server game modules, and a responsive React/Vite client

**Performance Goals**: No observable interaction jank or readability degradation during normal dice/confetti motion; dimensionally stable thumbnails during loading

**Constraints**: Preserve server-authoritative dice and winner determination; no Three.js/WebGL or animation dependency; preserve room protocol behavior; honor reduced motion; no horizontal overflow

**Scale/Scope**: Four active Hub cards, three existing game screens, at most five UNO seats, 1–90 Housie calls, six Ludo values, and the spec's responsive matrix

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Repository and Render-Ready Hosting**: PASS. No deployment topology or environment-contract change.
- **Graphics-First Experience**: PASS. Visual, responsive, accessibility, and reduced-motion acceptance are primary outputs.
- **Velocity and Pragmatic Verification**: PASS. Focused deterministic checkpoints and visual evidence replace broad unrelated suites.
- **Platform and Game Decoupling**: PASS. Hub/confetti stays platform-owned; Ludo, Housie, and UNO changes stay game-local.
- **Server-Authoritative Real-Time Play**: PASS. Dice and UNO outcomes remain server-owned; clients only animate received state.
- **Render verification**: PASS. Final validation includes health, HTTPS/WSS, two-client agreement, and reconnect/resync as applicable.

**Gate result**: PASS. No violation or exception requires justification.

## Project Structure

### Documentation (this feature)

```text
specs/010-polish-gameplay-visuals/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── uno-final-powercard.md
│   └── visual-behavior.md
└── tasks.md                    # /speckit-tasks output
```

### Source Code (repository root)

```text
server/
├── src/games/uno/
│   ├── matchOps.ts             # final-powercard effect and replacement transition
│   ├── rules.ts                # authoritative card classification/effect helpers as needed
│   └── bot.ts                  # same playCard transition as human actions
└── scripts/smoke.ts            # focused regression checkpoints

shared/
└── src/uno/types.ts            # replacement-draw event reason

client/
├── public/brand/games/ludo.webp
├── src/components/common/Confetti.tsx
├── src/games/ludo/
│   ├── Die.tsx
│   ├── anim/dice.ts
│   └── ludo.css
├── src/games/housie/
│   ├── BallConsole.tsx
│   ├── BallConsole.css
│   └── useFit.ts
├── src/games/ludo/ResultsOverlay.tsx
├── src/games/uno/ResultsOverlay.tsx
├── src/routes/HubPage.tsx
└── src/styles/
    ├── animations.css
    └── hub.css
```

**Structure Decision**: Extend the existing shared/server/client monorepo. Keep UNO winner and
replacement authority in the server game module, event semantics in `shared`, and presentation or
layout behavior in the existing Hub and game modules. No new service, database, or room system is
needed.

## Phase 0: Research

All technical choices and alternatives are resolved in [research.md](research.md):

1. Reuse CSS 3D/Web Animations for Ludo instead of adding a rendering library.
2. Base Housie density on measured region dimensions and complete-row capacity.
3. Extend UNO draw reasons with `replacement` and use `play/effect → draw one → handoff`.
4. Correct only the Ludo thumbnail framing and preserve aspect ratio during fitting.
5. Increase existing confetti density with viewport caps and no pointer interception.

## Phase 1: Design

- [data-model.md](data-model.md) defines presentation/layout states and the UNO transition.
- [contracts/uno-final-powercard.md](contracts/uno-final-powercard.md) defines event order,
  invariants, privacy, and synchronization.
- [contracts/visual-behavior.md](contracts/visual-behavior.md) defines dice, Housie, thumbnail,
  confetti, accessibility, and responsive acceptance.
- [quickstart.md](quickstart.md) defines build, deterministic, visual, two-client, and production
  validation scenarios.

## Post-Design Constitution Check

- **Graphics-First Experience**: PASS. Visual, responsive, accessibility, and reduced-motion behavior
  is explicit in the contracts.
- **Velocity and Pragmatic Verification**: PASS. Verification is limited to affected behavior with
  deterministic and visual evidence.
- **Platform and Game Decoupling**: PASS. Existing ownership boundaries remain unchanged.
- **Server-Authoritative Real-Time Play**: PASS. Replacement draws and winner state remain server
  decisions; clients stay intent-only and state-driven.
- **Render-Ready Hosting**: PASS. Production validation is required but infrastructure is unchanged.

**Post-design gate result**: PASS.

## Complexity Tracking

No constitution violations or approved exceptions.
