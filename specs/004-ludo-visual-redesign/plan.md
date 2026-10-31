# Implementation Plan: Ludo Visual Redesign

**Branch**: `004-ludo-visual-redesign` | **Date**: 2026-10-31 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/004-ludo-visual-redesign/spec.md`

## Summary

Replace the 3D scene of feature 003 with a flat, bright SVG board in the style of popular Ludo apps, pin-shaped pawns without numbers that hop square by square, a CSS 3D glossy die driven by the existing seeded throw, and a match layout that adapts to laptop, phone portrait and phone landscape. Rules, server, protocol, chat, timers, solo, recovery, themes (as data) and the tile picture do not change. The 3D engine, quality settings and view toggle are removed, which also shrinks the download. Approach and decisions: [research.md](research.md).

## Technical Context

**Language/Version**: TypeScript 5 strict, Node 24, React 19 (web)

**Primary Dependencies**: React, Vite, `@myarena/ludo` (engine, `buildThrow`), `@myarena/protocol`. Removed: `three`, `@types/three`. Added: none.

**Storage**: Browser storage unchanged except two old keys no longer read (`myarena-ludo-quality`, `myarena-ludo-view`). No server data.

**Testing**: Vitest (unit), Playwright Chromium (a few end-to-end checks), eslint, existing build budgets.

**Target Platform**: Current browsers on laptops, Android phones, iPhones; no graphics hardware dependency.

**Project Type**: Web application (`apps/web`) using shared packages; this feature touches the web app only.

**Performance Goals**: At least 30 frames per second for 95% of a 4-player match on the acceptance phones; roll settles in 3 s or less; initial JavaScript at most 200 KB gzipped; Ludo lazy chunks at most 150 KB gzipped (down from 400 KB).

**Constraints**: Content Security Policy `style-src 'self'` (no inline style attributes in markup; script may set style properties and SVG attributes); reduced motion honoured; 44 by 44 CSS pixel controls; no horizontal scroll from 320 px.

**Scale/Scope**: One game screen in three arrangements; about 20 source files changed or added, about 45 removed.

## Constitution Check

*GATE: passed before research and again after design.*

| Principle | Status | Notes |
| --- | --- | --- |
| I Account-free play | Pass | No change. |
| II Browser-first, mixed devices | Pass | Removing the graphics-acceleration dependency makes every device look the same. |
| III Two roles | Pass | No change. |
| IV Server-authoritative | Pass | Die result and moves still come from the server; the client only draws the shared seeded throw. |
| V Security and privacy | Pass | No new data, no inline styles, no new dependencies. |
| VI Reliable reconnection | Pass | Snapshots and reconnects place pawns and the die directly, no replay (FR-012). |
| VII Accessible, responsive | Pass | Reduced motion, 44 px targets, orientation changes, 200% text, screen-reader text kept; button-to-pawn highlight added. |
| VIII Platform/game separation | Pass | All changes inside the Ludo feature folder and its styles. |
| IX Evidence-based delivery | Pass | Tasks trace to requirements; unit and end-to-end evidence recorded in a short results note; real-device checks stay manual. |
| X Simple architecture | Pass | A simpler stack than 003 (no 3D engine). |
| XI Clean design, 3D where it helps | Pass | The 3D effect is limited to the die, where it adds delight; it respects reduced motion. |

No violations; Complexity Tracking not needed.

## Project Structure

### Documentation (this feature)

```text
specs/004-ludo-visual-redesign/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── ui-contract.md
├── checklists/
│   └── requirements.md
└── tasks.md            # created by /speckit-tasks
```

### Source Code (repository root)

```text
apps/web/src/features/ludo/
├── view/
│   ├── Board2D.tsx        # restyled board, name bars, theme decoration, uses Pin
│   ├── Pin.tsx            # NEW pin pawn (ring, body, head, mark, highlight)
│   ├── geometry.ts        # NEW frames, yards, arrows, slot centres, hop path (travelPath moved from scene/geometry.ts)
│   ├── placement.ts       # extended with highlighted
│   ├── Die3D.tsx          # NEW replaces Die2D.tsx
│   ├── dieMath.ts         # NEW dieTransform, shadow from height
│   ├── TurnCard.tsx       # NEW name, colour dot, countdown (from StatusBar)
│   ├── StatusBar.tsx      # reduced to the status line and announcements
│   ├── Controls.tsx       # button hover/focus highlight
│   ├── BoardView.tsx      # simplified: board only, no quality
│   └── (removed) BoardView3D.tsx, ViewToggle.tsx, QualityControl.tsx, Die2D.tsx
├── match/
│   ├── useHops.ts         # NEW hop playback
│   ├── MatchLayout.tsx    # wide / portrait / landscape arrangements
│   └── MatchView.tsx      # new composition
├── themes/                # themes.ts trimmed, decorations added, ThemePreview updated
└── (removed) scene/**, quality/**
apps/web/src/styles/ludo.css, ludo-themes.css   # new board, die, layout styles
apps/web/build/budget.ts                        # Ludo lazy budget 150 KB
apps/web/package.json                           # drop three, @types/three
apps/web/tests/
├── unit/                  # hops.test.ts, die-math.test.ts, ludo-layout.test.tsx, updates; removed quality.test.ts, scene-geometry.test.ts
└── e2e/                   # ludo-visual.spec.ts NEW; removed ludo-board.spec.ts, ludo-quality.spec.ts; adjusted ludo-a11y, ludo-dice, ludo-themes
```

**Structure Decision**: Web application, changes confined to `apps/web` (Ludo feature folder and styles). Engine, server and protocol packages are untouched, so no server or contract tests need to change.

## Superseded 003 content

003 research R6 (the drawing of the die; the seeded throw stays) and R7 (Three.js), and 003 UI contract sections 3 (presentation), 6, 7 and the 3D parts of 9. 003 tasks T138 to T140 (device checks) apply again to this look and are re-run by people.
