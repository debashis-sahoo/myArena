---

description: "Task list for the Ludo visual redesign"
---

# Tasks: Ludo Visual Redesign

**Input**: Design documents from `/specs/004-ludo-visual-redesign/` (plan.md, spec.md, research.md, data-model.md, contracts/ui-contract.md, quickstart.md)

**Prerequisites**: feature 003 merged (it is), Node 24, `npm install`, `npm run build:shared`.

**Tests**: Lean on purpose. Unit tests only for logic (hops, die maths, layout choice, highlight, themes). One new end-to-end spec for the three screen sizes. No new load tests. Old 3D tests are deleted.

**Organization**: Grouped by user story. Paths are relative to the repository root. `W` = `apps/web/src/features/ludo`, `S` = `apps/web/src/styles`, `T` = `apps/web/tests`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel with other [P] tasks of the same phase (different files, no dependency on unfinished tasks)
- Run the check named in each checkpoint before starting the next phase.

---

## Phase 1: Foundation (blocks everything; removes the 3D scene)

**Purpose**: A clean base with the 3D code gone and the app still green on the existing flat board.

- [X] T001 Create `W/view/geometry.ts`: move `travelPath` (and anything else the hop logic needs) out of `W/scene/geometry.ts`, and add the board constants from data-model.md: `VIEWBOX`, corner `FRAMES`, yard `YARD_SLOTS` (four slot centres per colour), `ENTRY_ARROWS` (outer lane square and direction per colour). Pure functions only, no React. (FR-001, FR-009)
- [X] T002 Delete `W/scene/**`, `W/quality/**`, `W/view/BoardView3D.tsx`, `W/view/ViewToggle.tsx`, `W/view/QualityControl.tsx`; remove `three` and `@types/three` from `apps/web/package.json` and refresh `package-lock.json` with `npm install`. (FR-026)
- [X] T003 Simplify `W/view/BoardView.tsx` to render only the board (no quality state, notice, `<details>`, `data-render` or `data-render-state`; keep `data-theme` and `data-die-face`) and fix every import that broke, including `W/match/MatchView.tsx` (still passes `events`, `seq`, `instant` for later use). Remove the `.ludo-canvas`, `.ludo-preparing`, `.ludo-view-toggle` and `.ludo-quality` rules from `S/ludo.css`. (FR-026)
- [X] T004 [P] Delete obsolete tests: `T/unit/quality.test.ts`, `T/unit/scene-geometry.test.ts` (its `travelPath` cases move to the new hops test in T014), `T/e2e/ludo-board.spec.ts`, `T/e2e/ludo-quality.spec.ts`; remove the 3D parts of `T/e2e/ludo-a11y.spec.ts` and the `from 'three|/scene/` guard in `T/unit/ludo-settings.test.tsx`.
- [X] T005 [P] Lower `LUDO_LAZY_BUDGET_BYTES` to `150 * 1024` and update the comment in `apps/web/build/budget.ts` (keep the Three.js-in-initial-bundle guard); adjust the matching cases in `T/unit/budget.test.ts`. (SC-006)

**Checkpoint**: `npm run lint`, `npm run test:unit -w @myarena/web` and `npm run build` pass; the flat board still plays; `three` is gone from `apps/web/package.json` and `dist`.

---

## Phase 2: User Story 1 - Bright board with pin pawns, no numbers (Priority: P1)

**Goal**: The board and pawns look like the reference (FR-001 to FR-008).

**Independent Test**: Open a solo match in Classic: frames, yards with slots, track, arrows, triangles, stars, pins with head marks, no pawn numbers, name bars; pointing at a move button highlights its pin.

- [X] T006 [P] [US1] Create `W/view/Pin.tsx`: pin SVG group (ground ring in the player's colour, tapered body, domed head with gloss highlight, white head mark: circle, triangle, square, diamond by colour). No number. Supports `movable` (pulsing ring, 44 by 44 tap area) and `highlighted` (strong ring, lifted). (FR-002 to FR-005, FR-007)
- [X] T007 [P] [US1] Create `S/ludo-board.css` with all board and pin styles (frames, white yards and slots, track lines, lanes, arrows, stars, centre, name bars, pin classes, highlight, reduced-motion pulse), remove the old board and pawn rules from `S/ludo.css`, and import the new file in `apps/web/src/main.tsx` next to `ludo.css`. No inline style attributes (Content Security Policy). (FR-001, FR-028)
- [X] T008 [US1] Rewrite `W/view/Board2D.tsx` using `geometry.ts` and `Pin`: corner frames with white yard and four slots (an empty coloured disc where a pawn is out), white track with grid lines, coloured start and lane squares, entry arrows, centre triangles, outlined stars, name bars at the four corners (`data-seat`, `data-active="true"` for the turn holder), `data-pawn="seat:pawn"` on each pin, extra viewBox margin for decoration. Remove `pawnNumber` text from the SVG. (FR-001 to FR-008)
- [X] T009 [US1] Add `highlighted` to `W/view/placement.ts` (`PlacedPawn`, set from a `highlight` pawn index argument) and lift a `highlight` state in `W/match/MatchView.tsx`: `W/view/Controls.tsx` sets it on pointer-enter, focus and touch-hold of a move button and clears it on leave and blur; `BoardView` passes it to `Board2D`. (FR-007)
- [X] T010 [P] [US1] Unit tests in `T/unit/ludo-board.test.tsx`: no digit text inside the board SVG; four slots per used colour; each colour has a distinct head mark; shared squares keep every pin visible (placement); `highlighted` follows a move button's focus; the active name bar is marked. (FR-003 to FR-008)

**Checkpoint**: unit tests green; owner can view the new board and pins on a laptop and a phone (static, no hops yet).

---

## Phase 3: User Story 2 - Pawns hop square by square (Priority: P1)

**Goal**: Moves read like a person moving a pawn (FR-009 to FR-012).

**Independent Test**: Moves of 1, 4 and 6 squares, a capture and a move into home play as one hop per square in order; reduced motion and snapshots place pins at once.

- [X] T011 [P] [US2] Create `W/view/hops.ts` (pure): `planHops(event, from view)` returning a `HopPlan` per data-model.md (`path` from `travelPath`, `hopMs` = 200 ms reduced so a move never exceeds 1500 ms, `afterMs`), a yard-to-start single hop, and a capture knock-back plan (500 ms arc to the yard slot after the capturing pin lands). (FR-009, FR-010)
- [X] T012 [US2] Create `W/match/useHops.ts`: reads `MOVED` events from the latest update, animates each pin with `requestAnimationFrame` by writing the SVG `transform` attribute (arc of about 0.42 square, small landing squash), finishes a running move at once when a new live move arrives, and skips everything for instant motion, a hidden page, the first render and snapshots (no events). Exposes the current drawn centre per pin. (FR-009 to FR-012)
- [X] T013 [US2] Make `W/view/Board2D.tsx` and `W/view/BoardView.tsx` draw pins at the positions from `useHops` (fall back to `placePawns` when nothing is animating), and keep pins pressable while resting. (FR-009 to FR-012)
- [X] T014 [P] [US2] Unit tests in `T/unit/hops.test.ts` with a fake clock: N hops for a move of N squares in order and ending on the destination; yard-to-start is one hop; into home ends in the centre; total time at most 1500 ms for any move; capture follows the landing; a second live move finishes the first; instant motion and snapshots place at once; plus the former `travelPath` cases. (SC-003)

**Checkpoint**: unit tests green; the owner sees hopping in a solo match.

---

## Phase 4: User Story 3 - Natural 3D die roll (Priority: P1)

**Goal**: A glossy white cube that tumbles and settles on the decided number, the same for every viewer (FR-013 to FR-018).

**Independent Test**: Roll many times (solo and with a second device): each roll differs, settles in 3 s or less on the announced number, identical on both devices; skip and reduced motion show the result at once.

- [X] T015 [P] [US3] Create `W/view/dieMath.ts` (pure): `dieTransform(sample)` turns a `buildThrow` sample (position and quaternion) into a CSS `matrix3d` string for the tilted tray (world y up maps to CSS toward the viewer; tray tilt about 55 degrees), `dieShadow(sample)` returns scale and opacity from height, and `FACE_LAYOUT` maps faces 1 to 6 to the cube sides to match `FACE_NORMALS` (1 up, 6 down, 2 front, 5 back, 3 right, 4 left). (FR-013, FR-014)
- [X] T016 [P] [US3] Unit tests in `T/unit/die-math.test.ts`: for every face and 200 seeds the final pose puts the decided face up (use `topFace` from `@myarena/ludo`), the transform is a valid rotation plus translation, the shadow shrinks with height. (SC-002)
- [X] T017 [US3] Create `W/view/Die3D.tsx` and `S/ludo-die.css`: six rounded glossy white faces with large black pips, perspective stage and tilted tray with a soft shadow; during a throw, a `requestAnimationFrame` loop sets the cube's `style.transform` from `dieTransform(buildThrow(seed, face, durationMs).sample(t))` (script-set styles are allowed under the Content Security Policy); when settled it shows the final pose for the face; hidden from assistive technology (`aria-hidden`); `data-die-face` kept on the board wrapper. Import `ludo-die.css` in `apps/web/src/main.tsx`. (FR-013 to FR-018)
- [X] T018 [US3] Replace `Die2D` with `Die3D` in the match (fed from `useRollPlayback`: `face`, `rolling`, `throwing`), delete `W/view/Die2D.tsx` and the `.ludo-die*` rules in `S/ludo.css`, keep "Skip animation", the roll-blocks-moves rule and the settle announcement unchanged. Update the `.ludo-die--rolling` check in `T/e2e/ludo-a11y.spec.ts` and the die assertions in `T/e2e/ludo-dice.spec.ts` to the new markup. (FR-015 to FR-018)

**Checkpoint**: unit and `ludo-dice` e2e green; the owner sees the roll.

---

## Phase 5: User Story 4 - Layout for phones and laptops (Priority: P2)

**Goal**: Board left and die, turn name, Roll, log and chat right on wide screens; sensible stacks on phones (FR-019 to FR-024).

**Independent Test**: At 320, 390, landscape phone and laptop sizes the whole board is visible, nothing scrolls sideways, the die, turn name and Roll are reachable, controls are at least 44 px.

- [X] T019 [P] [US4] Create `W/view/TurnCard.tsx` (colour dot, "<name>'s turn" or "Your turn", time left; reuses `useCountdown`; the countdown announcements stay in `StatusBar`) and reduce `W/view/StatusBar.tsx` to the status line and the spoken countdown points (it no longer renders the die). (FR-019, FR-024)
- [X] T020 [P] [US4] Create `S/ludo-layout.css` for the three arrangements from ui-contract.md section 4 (wide from 900 px; phone portrait; phone landscape under 520 px high), board always a square sized by `min()` of the free width and height, remove the old layout and `.ludo-status-row` rules from `S/ludo.css`, and import the file in `apps/web/src/main.tsx`. (FR-019 to FR-023)
- [X] T021 [US4] Recompose `W/match/MatchView.tsx` into `board`, `turn`, `die`, `actions` (Roll, Skip, move buttons) and `notices` slots, and update `W/match/MatchLayout.tsx` so the wide mode puts turn card, die, actions, game log and chat in the right column, and the narrow modes keep the Game log and Chat sheet buttons (portrait: turn card and die above the board, actions below it). Keep focus handling, announcements, away banner, result panel and error line as they are. (FR-019 to FR-021, FR-024)
- [X] T022 [US4] Check `W/solo/LudoSolo.tsx` and the lobby match page use the new `MatchView` composition and fix any leftover imports; make sure `W/view/ResultPanel.tsx` and `W/view/AwayBanner.tsx` fit all three arrangements. (FR-024, FR-027)
- [X] T023 [P] [US4] Unit tests in `T/unit/ludo-layout.test.tsx`: layout mode chosen from media queries (wide, portrait, landscape), sheet buttons only in narrow modes, turn card names the right player, Roll disabled when not the viewer's turn; update `T/unit/ludo-sheets.test.tsx` and `T/unit/ludo-timers-ui.test.tsx` if the markup moved.
- [X] T024 [US4] Create `T/e2e/ludo-visual.spec.ts` (Chromium only, spec sets the viewport): at laptop, phone portrait 390 by 844, phone portrait 320 by 640 and phone landscape 844 by 390, in a solo match with the test-dice hook: the whole board is inside the viewport, no horizontal scroll, die, turn card and Roll visible, every control at least 44 by 44; one roll then one move works end to end; the axe check passes; with reduced motion the result appears at once; no pawn digit text on the board. (SC-004, FR-022, FR-023)

**Checkpoint**: unit tests and `ludo-visual` e2e green.

---

## Phase 6: User Story 5 - Themes on the new look (Priority: P2)

**Goal**: Five themes with colours, frame and decoration on the flat board (FR-025).

**Independent Test**: Play briefly in every theme; layout identical, colours and decoration differ, shape marks and stars stay readable; previews show the new look.

- [X] T025 [P] [US5] Trim `W/themes/themes.ts` (remove `pawn`, `die`, `props`, `celebration`; add `frame` and `decor` per data-model.md), add frame colours to `S/ludo-themes.css`, and update `T/unit/themes.test.ts` so palettes and tints still equal the CSS and the four colours stay distinct from each other and from the board (contrast check kept). (FR-025)
- [X] T026 [P] [US5] Create `W/view/Decor.tsx`: small original SVG decorations around the board margin per theme (Super Heroes shields and stars, Halloween pumpkins and bats, Diwali diyas and rangoli dots, Winter snowflakes and pines, Classic corner studs), drawn outside the 15 by 15 grid with no animation under reduced motion; render it from `Board2D`. (FR-025)
- [X] T027 [P] [US5] Update `W/themes/ThemePreview.tsx` to mirror the flat board (frames, white yards, a pin) in each theme's colours. (FR-025)
- [X] T028 [US5] Adjust `T/e2e/ludo-themes.spec.ts` to the new DOM (`data-theme` on the board, decoration present, no 3D checks). (FR-025)

**Checkpoint**: unit tests and `ludo-themes` e2e green; owner reviews each theme.

---

## Phase 7: User Story 6 - Simpler, lighter game (Priority: P3)

**Goal**: No 3D scene, no quality or view settings, smaller download (FR-026 to FR-028).

**Independent Test**: With graphics acceleration disabled the game looks and plays the same; no quality or view control exists; old saved quality or view values do nothing; the build is smaller.

- [X] T029 [US6] Remove any remaining references to quality, view, WebGL, Three.js or `data-render` in code, tests and docs (`grep` for `quality`, `webgl`, `three`, `data-render`, `myarena-ludo-view`, `myarena-ludo-quality`), confirm nothing reads the two old storage keys, and add a unit test in `T/unit/ludo-settings.test.tsx` that a stored old value causes no error and no control appears. (FR-026)
- [X] T030 [US6] Run `npm run build`, record the initial and Ludo lazy gzipped sizes before and after (before: 003 build), and confirm they meet the budgets (initial 200 KB, Ludo lazy 150 KB). (SC-006)

---

## Phase 8: Polish and evidence

- [X] T031 [P] Update `README.md`, `docs/**` and `specs/003-ludo-game/` notes that describe the 3D scene, quality menu or Three.js: add a short "Superseded by 004" note to 003's `research.md` (R6, R7) and `contracts/ui-contract.md` (sections 3, 6, 7, 9) instead of rewriting them. (FR-026)
- [X] T032 Run `npm run lint`, `npm run test:unit -w @myarena/web`, `npm run build`, then from `apps/web`: `npx playwright test ludo-visual ludo-dice ludo-match ludo-solo ludo-a11y ludo-themes ludo-chat ludo-recovery ludo-tile --project=desktop-chromium` (skip the long real-timer test unless the timers code changed); fix failures; record results and sizes in `specs/004-ludo-visual-redesign/results.md`. (SC-007)
- [X] T033 Capture screenshots of the match at laptop, phone portrait and phone landscape in Classic and one dark theme and save them under `specs/004-ludo-visual-redesign/screenshots/` for the owner's look review. (SC-001)
- [ ] T034 Owner/people task: SC-001 review against the reference images; SC-005 quick check with at least five new players; re-run the real-device matrix and frame-rate measurement from 003 (T138, T139) on the acceptance phones. Not automated. (SC-001, SC-005, SC-008)

---

## Dependencies and order

- Phase 1 blocks all others. Phase 2 (board) before Phase 3 (hops draw on the board) and before Phase 5 (layout hosts the board).
- Phase 4 (die) depends only on Phase 1; it can run in parallel with Phases 2 and 3 if two people work, but its integration task T018 touches `MatchView` and the status bar, so do it before T019 to T021.
- Phase 5 depends on Phases 2 and 4. Phase 6 depends on Phase 2 (`Board2D`). Phase 7 and 8 last.
- Within a phase, [P] tasks touch different files and can run together; sequential tasks edit shared files.

### Parallel examples

- Phase 1: T004 and T005 together after T003.
- Phase 2: T006, T007 together; then T008, T009; then T010.
- Phase 4: T015 and T016 together with Phase 2 work.
- Phase 5: T019, T020, T023 together; then T021, T022, T024.
- Phase 6: T025, T026, T027 together.

## Implementation strategy

1. Phase 1 to 4 deliver the three things the owner asked for most (board, pawns, hop, die) and are the first review point (stop here for the owner's screenshots).
2. Phase 5 gives the final screen arrangement; Phase 6 and 7 finish themes and cleanup; Phase 8 collects evidence.
3. Suggested MVP: Phases 1 to 3 (board, pins, hops) with the old die, then Phase 4.

## Summary

34 tasks: Foundation 5, US1 5, US2 4, US3 4, US4 6, US5 4, US6 2, Polish 4. Requirement traceability is in the task text (FR and SC numbers).
