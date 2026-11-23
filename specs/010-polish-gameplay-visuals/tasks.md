---

description: "Task list for polishing gameplay visuals and responsive interactions"
---

# Tasks: Polish Gameplay Visuals

**Input**: Design documents from `specs/010-polish-gameplay-visuals/`

**Prerequisites**: plan.md and spec.md required; research.md, data-model.md, contracts/, and quickstart.md available

**Tests**: Use focused deterministic checkpoints, existing smoke coverage, browser inspection, and evidence capture as required by the specification; do not add a broad test framework.

**Organization**: Tasks are grouped by user story so each story can be implemented and verified independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Parallelizable across different files with no incomplete dependency
- **[Story]**: User story label ([US1] through [US5])
- Every task includes an exact file path

## Phase 1: Setup

**Purpose**: Establish repeatable release and visual-evidence baselines before behavior changes

- [x] T001 Run the existing build and smoke baseline and record commands/results in `specs/010-polish-gameplay-visuals/evidence/verification.md`
- [x] T002 Create evidence storage and a scenario ledger covering Ludo, Housie, UNO, Hub art, confetti, and production checks in `specs/010-polish-gameplay-visuals/evidence/verification.md`
- [x] T003 [P] Capture baseline Ludo, Housie, Hub, and confetti observations at one phone and one desktop viewport in `specs/010-polish-gameplay-visuals/evidence/baseline.md`

---

## Phase 2: Foundational

**Purpose**: Lock the shared validation boundaries that every story must preserve

- [x] T004 Confirm and document that no client selects Ludo values or declares UNO winners in the baseline paths in `client/src/games/ludo/DiceConsole.tsx` and `client/src/games/uno/UnoScreen.tsx`
- [x] T005 Add reusable responsive-matrix and reduced-motion evidence headings required by `contracts/visual-behavior.md` to `specs/010-polish-gameplay-visuals/evidence/verification.md`
- [x] T006 Verify the existing neutral thumbnail fallback remains reachable on image failure and record the baseline contract in `client/src/art/HubArtFallback.tsx`

**Checkpoint**: Baseline evidence and authority boundaries are recorded; user stories can proceed independently.

---

## Phase 3: User Story 1 - Experience a Natural Ludo Roll (Priority: P1) 🎯 MVP

**Goal**: Make the six-sided die visually physical, rounded, pip-correct, and naturally animated while retaining the authoritative result.

**Independent Test**: Controlled rolls for values 1–6 finish on the correct pip face with tracked shadow and three decaying impacts; reduced motion keeps the result with no travel/spin/shake.

### Implementation for User Story 1

- [x] T007 [P] [US1] Refine `Face` geometry and pip markup for a rounded six-face shell in `client/src/games/ludo/Die.tsx`
- [x] T008 [P] [US1] Add dark recessed circular pips, rounded corner bevels, and edge depth to the six die faces in `client/src/games/ludo/ludo.css`
- [x] T009 [US1] Rework the cube tumble keyframes to include deceleration, rotational settle, and three decaying landing stages in `client/src/games/ludo/anim/dice.ts`
- [x] T010 [US1] Synchronize throw lift/travel, impact scale, shadow position/scale/opacity/blur, and console settle in `client/src/games/ludo/anim/dice.ts`
- [x] T011 [US1] Preserve a stable shadow and authoritative final transform after cancelled or superseded animations in `client/src/games/ludo/anim/dice.ts`
- [x] T012 [US1] Ensure reduced-motion rolls use only a short non-travel result transition and never run blur, shake, spin, or long-distance motion in `client/src/games/ludo/anim/dice.ts`
- [x] T013 [US1] Guard orchestration against stale roll events while preserving `state.roll.value` as the only final face source in `client/src/games/ludo/DiceConsole.tsx`

### Verification for User Story 1

- [x] T014 [US1] Add or update the development-only controlled roll checkpoint for values 1–6 without exposing value selection in production in `server/src/games/ludo/engine.ts`
- [x] T015 [US1] Capture normal and reduced-motion observations for all six values, including final pips and shadow baseline, in `specs/010-polish-gameplay-visuals/evidence/ludo-dice.md`
- [x] T016 [US1] Verify phone, landscape, desktop, resize, tab-switch, and reconnect interruption behavior against `quickstart.md` in `specs/010-polish-gameplay-visuals/evidence/ludo-dice.md`

**Checkpoint**: Ludo dice presentation is independently functional and authoritative across normal and reduced motion.

---

## Phase 4: User Story 2 - Follow Housie Calls on a Phone (Priority: P1)

**Goal**: Maximize complete recent-number chips in at least two phone portrait rows while retaining complete history access.

**Independent Test**: At 320×568 with 30+ calls, at least 10 complete newest-first chips appear across two or more rows, and “View all” remains accessible with focus restoration.

### Implementation for User Story 2

- [x] T017 [P] [US2] Add a measured recent-call grid planner that returns `chip`, `chipWidth`, `columns`, `rows`, and reserved “View all” capacity with complete rows only in `client/src/games/housie/useFit.ts`
- [x] T018 [US2] Replace fixed recent-capacity arithmetic with the new planner while preserving newest-first ordering in `client/src/games/housie/BallConsole.tsx`
- [x] T019 [US2] Reserve complete grid positions for the “View all” action and keep it available when called history exceeds visible capacity in `client/src/games/housie/BallConsole.tsx`
- [x] T020 [US2] Reflow the recent-number grid, ball, count, and history action to use all available width without partial chips in `client/src/games/housie/BallConsole.css`
- [x] T021 [US2] Restore focus to the invoking “View all” button after Escape or close and preserve the existing modal focus trap in `client/src/games/housie/BallConsole.tsx`
- [x] T022 [US2] Handle zero, one, exactly ten, thirty, and ninety calls without empty partial controls or hidden full-history access in `client/src/games/housie/BallConsole.tsx`

### Verification for User Story 2

- [x] T023 [US2] Exercise the exported recent-call planner from `client/src/games/housie/useFit.ts` with exact region fixtures for 320×568, 390×844, 640×360, and 844×390 plus 30 calls; assert whole-row capacity and reserved “View all” cells, then record expected/observed `columns`, `rows`, and visible counts in `specs/010-polish-gameplay-visuals/evidence/housie-calls.md`
- [x] T024 [US2] Capture 320×568, 390×844, 640×360, and 844×390 called-number evidence with expected/observed chip counts in `specs/010-polish-gameplay-visuals/evidence/housie-calls.md`
- [x] T025 [US2] Verify touch, keyboard open/close, focus restoration, no clipping, and no horizontal overflow in `specs/010-polish-gameplay-visuals/evidence/housie-calls.md`

**Checkpoint**: Housie called numbers are independently readable and fully navigable on phone portrait and landscape.

---

## Phase 5: User Story 3 - Win UNO with a Valid Final Card (Priority: P1)

**Goal**: Resolve sole final powercards normally, award exactly one replacement, and finish only on a numbered final card.

**Independent Test**: All five powercard classes resolve their real effect, do not finish, award one private replacement, and then continue; a numbered final card produces one agreed winner.

### Implementation for User Story 3

- [x] T026 [P] [US3] Add `'replacement'` as an allowed UNO draw reason in `shared/src/uno/types.ts`
- [x] T027 [P] [US3] Add an authoritative helper that classifies `skip`, `reverse`, `draw2`, `wild`, and `wild4` as powercards and `number` as finish-eligible in `server/src/games/uno/rules.ts`
- [x] T028 [US3] Branch the final-card path after a legal play in `server/src/games/uno/matchOps.ts`: numbered final card finishes; powercard final card never calls `finish`
- [x] T029 [US3] Apply the normal powercard effect before drawing and preserve active colour, direction, pending penalty, skipped player, and stacked fields in `server/src/games/uno/matchOps.ts`
- [x] T030 [US3] Before committing a sole final powercard, verify the normal draw/reshuffle path can supply exactly one replacement; on an invariant failure reject without hand/discard/turn mutation, log the state fault, preserve the authoritative snapshot, and emit a private-aware replacement draw only on success in `server/src/games/uno/matchOps.ts`
- [x] T031 [US3] Schedule normal turn handoff after the powercard plus replacement transition so replacement animation time and catch cleanup complete in `server/src/games/uno/matchOps.ts`
- [x] T032 [US3] Preserve `handCount: 1`, `winner: null`, and non-finished phase in the public snapshot after replacement in `server/src/games/uno/matchOps.ts`
- [x] T033 [US3] Confirm bots consume the same final-powercard transition and do not take an alternate direct-winner path in `server/src/games/uno/bot.ts`
- [x] T034 [US3] Handle the `replacement` draw reason in visual messaging without entering the drawn/keep state or exposing another player's card in `client/src/games/uno/useUnoAnimator.ts`
- [x] T035 [US3] Extend development-only UNO deck scenarios for sole legal Skip, Reverse, Draw Two, Wild, and Wild Draw Four hands in `server/src/games/uno/deck.ts`

### Verification for User Story 3

- [x] T036 [US3] Add focused smoke assertions for all five final powercard classes, exact-one replacement, forced reshuffle, real effect preservation, no finish event, and a zero-drawable-card invariant-failure fixture that preserves hand/discard/turn authority and logs once in `server/scripts/smoke.ts`
- [x] T037 [US3] Add a numbered-final-card regression assertion confirming exactly one winner in `server/scripts/smoke.ts`
- [ ] T038 [US3] Verify two-client event order, replacement privacy, winner agreement, pending/direction behavior, and reconnect/resync in `specs/010-polish-gameplay-visuals/evidence/uno-final-powercard.md`

**Checkpoint**: UNO final-card legality and replacement continuation are authoritative, synchronized, and independently testable.

---

## Phase 6: User Story 4 - See Correct Responsive Game Art (Priority: P2)

**Goal**: Correct the Ludo thumbnail to a square board and make every active-game image adapt without distortion or overlap.

**Independent Test**: The Ludo board is visibly 1:1 and all Hub cards preserve readable text/actions with stable art dimensions through the full viewport matrix.

### Implementation for User Story 4

- [x] T039 [P] [US4] Recreate the Ludo thumbnail with a recognizably square 1:1 board, natural perspective, and correct playing-color layout in `client/public/brand/games/ludo.webp`
- [x] T040 [US4] Preserve a square, aspect-ratio-aware art frame around the corrected asset while avoiding unintended crop in `client/src/styles/hub.css`
- [x] T041 [US4] Make the card art region consume the largest available stable area after title, tagline, badge, and action minimums in `client/src/styles/hub.css`
- [x] T042 [US4] Ensure image intrinsic dimensions and loading states prevent collapse or layout shift in `client/src/components/hub/GameCard.tsx`
- [x] T043 [US4] Preserve the neutral fallback's reserved dimensions and game identity after image failure in `client/src/components/hub/GameCard.tsx` and `client/src/art/HubArtFallback.tsx`
- [x] T044 [US4] Remove any fixed-size or distortion behavior that conflicts with phone portrait, phone landscape, tablet, desktop, or ultrawide fitting in `client/src/styles/hub.css`

### Verification for User Story 4

- [x] T045 [US4] Capture player and host Hub evidence at 320×568, 390×844, 640×360, 844×390, 768×1024, 1024×768, 1366×768, 1920×1080, and 2560×1440 in `specs/010-polish-gameplay-visuals/evidence/hub-art.md`
- [x] T046 [US4] Verify the Ludo board remains square and all active cards show no clipping, stretch, overlap, horizontal overflow, or hidden action in `specs/010-polish-gameplay-visuals/evidence/hub-art.md`
- [x] T047 [US4] Simulate each active image failure and record stable fallback dimensions and preserved card guidance in `specs/010-polish-gameplay-visuals/evidence/hub-art.md`

**Checkpoint**: Hub thumbnail artwork is accurate, responsive, stable, and independently approved across the viewport matrix.

---

## Phase 7: User Story 5 - Enjoy Richer Celebrations (Priority: P3)

**Goal**: Increase confetti density on existing Hub and result surfaces without obscuring controls or violating reduced motion.

**Independent Test**: Hub, Ludo results, and UNO results show at least 24 desktop or 16 phone-visible pieces; controls remain clickable and reduced motion hides all animated confetti.

### Implementation for User Story 5

- [x] T048 [P] [US5] Increase and vary confetti generation while supporting desktop/phone caps and deterministic placement in `client/src/components/common/Confetti.tsx`
- [x] T049 [P] [US5] Strengthen pointer pass-through, phone density handling, layering, and lifetime cleanup in `client/src/styles/animations.css`
- [x] T050 [US5] Configure the Hub atmosphere to request its denser confetti tier in `client/src/routes/HubPage.tsx`
- [x] T051 [US5] Configure Ludo result confetti to meet the denser tier without obscuring standings or play-again/navigation actions in `client/src/games/ludo/ResultsOverlay.tsx`
- [x] T052 [US5] Configure UNO result confetti to meet the denser tier without obscuring winner text, standings, or navigation actions in `client/src/games/uno/ResultsOverlay.tsx`

### Verification for User Story 5

- [x] T053 [US5] Verify each Hub, Ludo result, and UNO result surface exceeds its T003 measured baseline and also meets ≥24 desktop and ≥16 phone-visible pieces in `specs/010-polish-gameplay-visuals/evidence/confetti.md`
- [x] T054 [US5] Verify controls remain clickable and no confetti overlaps essential content or persists after navigation in `specs/010-polish-gameplay-visuals/evidence/confetti.md`
- [x] T055 [US5] Verify reduced motion renders zero animated/falling pieces while preserving result text and actions in `specs/010-polish-gameplay-visuals/evidence/confetti.md`

**Checkpoint**: Existing celebration surfaces are independently richer, readable, interactive, and reduced-motion safe.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Validate combined behavior, regressions, accessibility, and release readiness

- [x] T056 [P] Review affected text and controls for contrast, focus visibility, screen-reader labels, touch targets, and reduced-motion wording in `client/src/games/ludo/`, `client/src/games/housie/`, `client/src/games/uno/`, and `client/src/components/hub/`
- [ ] T057 Run `npm run build` and `npm run smoke` and record pass/fail plus commit identifier in `specs/010-polish-gameplay-visuals/evidence/verification.md`
- [x] T058 [P] Run the complete responsive matrix for the combined Hub and affected game screens and record zero-overflow observations in `specs/010-polish-gameplay-visuals/evidence/verification.md`
- [x] T059 [P] Run keyboard-only and reduced-motion checks for Ludo, Housie, Hub thumbnails, and confetti in `specs/010-polish-gameplay-visuals/evidence/accessibility.md`
- [ ] T060 Run a two-client room check for authoritative state, UNO winner agreement, Ludo roll agreement, and disconnect/reconnect synchronization in `specs/010-polish-gameplay-visuals/evidence/verification.md`
- [x] T061 Verify normal and image-failure asset loading with CSP-enabled production-equivalent serving in `specs/010-polish-gameplay-visuals/evidence/verification.md`
- [x] T062 Update feature verification with all completed criteria and explicitly mark unavailable production/reviewer checks pending in `specs/010-polish-gameplay-visuals/evidence/verification.md`
- [ ] T063 Deploy to Render and verify `/healthz`, HTTPS player and `/host`, thumbnails, WSS, UNO two-client state, and reconnect/resync in `specs/010-polish-gameplay-visuals/evidence/verification.md`
- [x] T064 [P] Confirm no generated dependency, lockfile, unrelated `working/working.md`, or unintended server-authority/room-protocol changes are included; explicitly verify that only the approved UNO replacement draw reason and final-powercard transition are allowed in `specs/010-polish-gameplay-visuals/evidence/verification.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on T001–T003 and blocks story implementation.
- **US1, US2, and US3 (P1)**: Can begin after T006 and proceed independently.
- **US4 (P2)**: Can begin after T006 and proceeds independently of the P1 stories.
- **US5 (P3)**: Can begin after T006 and proceeds independently of all other stories.
- **Polish (Phase 8)**: Depends on all stories included in the release.

### User Story Dependencies

- **US1**: No dependency on another story.
- **US2**: No dependency on another story.
- **US3**: T026–T027 precede T028–T035; smoke and two-client verification follow implementation.
- **US4**: Artwork and CSS changes can proceed in parallel, then GameCard stability and full matrix validation.
- **US5**: Confetti component/CSS work precedes caller-specific verification.

### Within Each User Story

- Model/planner/type changes precede behavior integration.
- Core behavior precedes visual animation and verification.
- Focused deterministic checks precede final two-client/browser evidence.
- Each story must pass its independent test before the next release-level validation.

## Parallel Opportunities

- T007 and T008 can improve geometry and styling together before T009–T013 animation integration.
- T017 can develop the Housie planner while CSS work in T020 is prepared, then T018 integrates it.
- T026 and T027 can proceed in parallel before T028–T034.
- T039, T040, and T048–T049 can proceed independently across different files.
- US1, US2, US3, US4, and US5 can be staffed in parallel after the foundational phase.

## Parallel Example: User Story 3

```text
T026 Add replacement draw reason in shared/src/uno/types.ts
T027 Add authoritative card-class helper in server/src/games/uno/rules.ts
```

After both complete:

```text
T028 Branch final-card winner detection in server/src/games/uno/matchOps.ts
T035 Add five deterministic development-only deals in server/src/games/uno/deck.ts
```

## Implementation Strategy

### MVP First (US1)

1. Complete T001–T006.
2. Complete US1 T007–T016.
3. Stop and validate six-face Ludo outcomes and normal/reduced-motion behavior.
4. Demo only the dice increment if desired before continuing.

### Incremental Delivery

1. Complete Setup + Foundational.
2. Deliver US1: realistic Ludo roll.
3. Deliver US2: dense Housie recent calls.
4. Deliver US3: authoritative UNO final-powercard replacement.
5. Deliver US4: corrected responsive Hub art.
6. Deliver US5: richer confetti.
7. Complete release-wide build, smoke, evidence, and production checks.

### Parallel Team Strategy

With multiple developers:

- Developer A: US1 Ludo dice
- Developer B: US2 Housie calls
- Developer C: US3 UNO transition
- Developer D: US4 Hub art
- Developer E: US5 confetti

## Notes

- [P] marks separate-file work with no incomplete dependency.
- Story labels map directly to the five specification stories.
- No task introduces client-authoritative dice or winner state.
- Development-only controlled scenarios remain unavailable to production clients.
- Do not include `working/working.md` in feature commits.
