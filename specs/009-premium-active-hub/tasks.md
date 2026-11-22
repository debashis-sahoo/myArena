# Tasks: Premium Active-Game Hub

**Input**: Design documents from `specs/009-premium-active-hub/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Use the existing build/smoke commands and the browser, preview, responsive, and Render checks in `quickstart.md`. No new standalone test framework is requested.

**Organization**: Tasks are grouped by user story. The four-preview approval gate blocks all production UI and asset implementation work.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Runs in parallel with other `[P]` tasks on different files
- **[Story]**: Maps to a user story (`US1`, `US2`, `US3`, `US4`)
- Every task names an exact repository-relative file path

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish preview, approval, evidence, and baseline files before visual implementation.

- [X] T001 Create `specs/009-premium-active-hub/previews/.gitkeep` and `specs/009-premium-active-hub/evidence/.gitkeep` for the required preview and verification artifacts
- [X] T002 Create `specs/009-premium-active-hub/previews/approval.json` with exactly four records (`host-desktop`, `player-desktop`, `host-phone`, `player-phone`) and initial `approved=false`, `artifactPath`, mode, viewport class, reviewed date, and notes fields
- [X] T003 Create `specs/009-premium-active-hub/verification.md` with scenario, prerequisite, expected result, observed result, status, and evidence-path columns covering preview approval, subtitle visibility, active-only cards, Ludo art, room flows, responsive states, build/smoke, and Render
- [X] T004 Run `npm run build` and `npm run smoke`, record the baseline in `specs/009-premium-active-hub/verification.md`, and stop if either command fails before preview work

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Produce and approve the four required previews before any production Hub UI or artwork is changed.

**⚠️ CRITICAL**: No task from Phase 3 onward may begin until T013 confirms all four records in `specs/009-premium-active-hub/previews/approval.json` are approved.

- [X] T005 Define the representative desktop and phone viewport dimensions in `specs/009-premium-active-hub/previews/approval.json` while preserving the full responsive matrix required by `specs/009-premium-active-hub/contracts/hub-visual-contract.md`
- [X] T006 [P] Create the host desktop preview at `specs/009-premium-active-hub/previews/host-desktop.png` showing only active catalog games, the complete HOST ARENA role, existing launch actions, and the approved title direction
- [X] T007 [P] Create the player desktop preview at `specs/009-premium-active-hub/previews/player-desktop.png` showing the room-code form, only active catalog games, and the complete PLAYER HUB role
- [X] T008 [P] Create the host phone preview at `specs/009-premium-active-hub/previews/host-phone.png` showing the complete role, profile, audio, and active launch cards without clipping
- [X] T009 [P] Create the player phone preview at `specs/009-premium-active-hub/previews/player-phone.png` showing the complete role, profile, audio, room-code form, and active showcases without clipping
- [X] T010 Review all four files in `specs/009-premium-active-hub/previews/` against the eight questions in `specs/009-premium-active-hub/contracts/preview-approval.md` and record revision notes in `specs/009-premium-active-hub/previews/approval.json`
- [X] T011 Revise `specs/009-premium-active-hub/previews/host-desktop.png`, `player-desktop.png`, `host-phone.png`, and `player-phone.png` for every requested design change without modifying production Hub source or assets
- [X] T012 Obtain explicit user approval for `host-desktop`, `player-desktop`, `host-phone`, and `player-phone` and write the approved states, reviewed timestamps, and approval notes to `specs/009-premium-active-hub/previews/approval.json`
- [X] T013 Verify all four `approved` values in `specs/009-premium-active-hub/previews/approval.json` are true and record the gate result in `specs/009-premium-active-hub/verification.md`; halt implementation if any is false

**Checkpoint**: The exact host/player desktop/phone direction is approved. Production code and assets may now be changed.

---

## Phase 3: User Story 1 - Recognize the Host or Player Hub Immediately (Priority: P1) 🎯 MVP

**Goal**: Separate live role text fixes the hidden subtitle and the header remains coherent, accessible, and responsive in both modes.

**Independent Test**: Open `/` and `/host` at the required desktop and phone preview sizes and at the full matrix; verify complete PLAYER HUB / HOST ARENA text, accessible header controls, no overlap, and the correct primary action.

### Header and role presentation

- [X] T014 [US1] Add a separate mode-specific live role label beneath the approved title artwork in `client/src/components/hub/Header.tsx`, rendering exactly `PLAYER HUB` or `HOST ARENA` without baking the label into `client/src/art/Logo.tsx`
- [X] T015 [US1] Regenerate a role-neutral approved title source at `client/public/brand/myarena-title.webp`, remove the existing role-specific title-image dependency from `client/src/art/Logo.tsx`, reserve its aspect ratio, expose the combined accessible heading label, and never clip the separate role label
- [X] T016 [US1] Update `client/src/styles/hub.css` to position profile left, title/role center, and audio right with clear non-overlapping desktop, compact-landscape, and phone layouts
- [X] T017 [US1] Update `client/src/styles/hub.css` with role-label styling that preserves readability, safe spacing, browser text scaling, focus visibility, and the approved title’s border-free composition
- [X] T018 [P] [US1] Update `client/src/styles/tokens.css` with only the role-label, crown-title, and header contrast tokens needed to match the approved preview
- [X] T019 [P] [US1] Update `client/src/styles/animations.css` so any decorative title/header motion has an equivalent static reduced-motion presentation
- [X] T020 [US1] Update `client/src/routes/HubPage.tsx` so mode-specific composition retains the player room-code panel and host launch actions while the header uses the exact approved host/player roles

### US1 verification

- [X] T021 [US1] Capture host/player normal and reduced-motion screenshots at desktop and phone sizes under `specs/009-premium-active-hub/evidence/` and link them from `specs/009-premium-active-hub/verification.md`
- [X] T022 [US1] Inspect `/` and `/host` at 320x568, 390x844, 640x360, 844x390, 768x1024, 1024x768, 1366x768, 1920x1080, and 2560x1440 and record complete role-label visibility, overlap, overflow, and control access in `specs/009-premium-active-hub/verification.md`
- [X] T023 [US1] Verify keyboard focus, touch targets, increased text size, and reduced motion for profile, audio, and room entry in `specs/009-premium-active-hub/verification.md`

**Checkpoint**: Host and player identity is immediately clear, the full live role label is visible, and the header works independently of the card redesign.

---

## Phase 4: User Story 2 - Choose Only from Active Games (Priority: P1)

**Goal**: The Hub renders a catalog-driven set containing only active playable games, with unchanged host/player permissions.

**Independent Test**: Compare the rendered cards with the catalog, remove or add active/coming-soon fixtures mentally through the list, and verify there is no unavailable tile; host cards launch and player cards remain non-interactive.

### Active-only catalog and card behavior

- [X] T024 [US2] Update `client/src/components/hub/GameGrid.tsx` to filter `GAMES` by `status === 'active'` before rendering and preserve catalog order for all future active games
- [X] T025 [US2] Update `client/src/components/hub/GameCard.tsx` to remove all inactive, disabled, and “coming soon” rendering branches while retaining host interaction and player showcase behavior
- [X] T026 [US2] Update `client/src/components/hub/GameCard.tsx` so a player-mode active card cannot receive click, keyboard, or launch behavior and its guidance directs the visitor to room-code joining
- [X] T027 [US2] Update `client/src/components/hub/GameGrid.tsx` and `client/src/styles/hub.css` to adapt active-card columns and rows dynamically for four current active games and future active catalog entries
- [X] T028 [US2] Update `client/src/routes/HubPage.tsx` and `client/src/styles/hub.css` to remove “More games are on the way” or other inactive-game messaging from the active-only Hub
- [X] T029 [US2] Update `client/src/components/hub/GameCard.tsx` to keep an exact game label, mode-safe action, and accessible name even if artwork is missing or fails

### US2 verification

- [X] T030 [US2] Verify `/` and `/host` show the exact catalog subset whose status is active in `shared/src/games.ts`, with zero Snakes & Ladders or other inactive cards, and record the observed list in `specs/009-premium-active-hub/verification.md`
- [X] T031 [US2] Verify a host can launch every currently active card through the existing `client/src/components/launch/LaunchModal.tsx` flow without changing `client/src/state/roomStore.ts` or server behavior
- [X] T032 [US2] Verify player cards remain non-interactive while room-code joining continues to succeed and fail recoverably; record both paths in `specs/009-premium-active-hub/verification.md`

**Checkpoint**: The Hub presents exactly the active catalog, with preserved host/player permissions and no inactive-game messaging.

---

## Phase 5: User Story 3 - Experience a Premium, Game-Focused Visual Presentation (Priority: P2)

**Goal**: Approved premium artwork and cosmic card styling make the full page match the reference, including a corrected natural Ludo die.

**Independent Test**: Compare the implemented host/player pages with the four approved previews at desktop/phone sizes; inspect every active card, neutral fallback, and Ludo die, then repeat normal and reduced-motion checks.

### Shared asset and fallback foundation

- [X] T033 [P] [US3] Create the approved game-art folder at `client/public/brand/games/` with stable per-game naming based on catalog IDs, optimized transparent-safe dimensions, and a role-neutral title source contract
- [X] T034 [US3] Create a branded neutral artwork fallback in `client/src/art/HubArtFallback.tsx` that does not resemble any individual game, fits the same reserved card-art region, and is documented as temporary delivery/loading recovery rather than normal active-game artwork
- [X] T035 [US3] Refactor `client/src/components/hub/GameCard.tsx` to resolve active-game artwork by catalog ID, reserve dimensions, support lazy loading, and switch to `HubArtFallback` on image error
- [X] T036 [US3] Update `client/src/styles/hub.css` with the shared card-art frame, image fit, failure state, depth, readability, and non-distorting aspect-ratio rules required by `specs/009-premium-active-hub/contracts/hub-visual-contract.md`

### Active-game artwork

- [X] T037 [P] [US3] Produce and optimize the approved dimensional Ludo artwork in `client/public/brand/games/ludo.webp`, including a natural six-sided beveled die with coherent visible-face pips
- [X] T038 [P] [US3] Produce and optimize the approved dimensional Housie artwork in `client/public/brand/games/housie.webp`
- [X] T039 [P] [US3] Produce and optimize the approved dimensional Bingo artwork in `client/public/brand/games/bingo.webp`
- [X] T040 [P] [US3] Produce and optimize the approved dimensional UNO artwork in `client/public/brand/games/uno.webp`
- [X] T041 [US3] Define and document the activation prerequisite that future catalog IDs receive approved game-specific artwork before becoming active, with the neutral fallback reserved only for temporary failure, in `specs/009-premium-active-hub/contracts/hub-visual-contract.md`
- [X] T042 [US3] Update `client/src/components/hub/GameCard.tsx` to select the existing approved artwork or stable neutral fallback for every active ID, including active games added later

### Page-wide premium treatment

- [X] T043 [P] [US3] Refine cosmic surface, jewel-tone, glow, depth, and artwork-safe tokens in `client/src/styles/tokens.css`
- [X] T044 [P] [US3] Refine decorative particles, shimmer, hover lift, and static reduced-motion counterparts in `client/src/styles/animations.css`
- [X] T045 [US3] Refine the player room-code panel in `client/src/components/hub/JoinRoomPanel.tsx` and `client/src/styles/hub.css` to match the approved compact luminous reference while preserving all labels, validation, loading, retry, and input retention
- [X] T046 [US3] Refine `client/src/styles/hub.css` so active cards, title, room entry, profile, audio, and page background form one coherent premium composition without clipping or stretched artwork
- [X] T047 [US3] Update `client/src/routes/HubPage.tsx` composition and `client/src/styles/hub.css` to preserve maximum useful screen space and balanced active-card layouts at phone, tablet, desktop, and ultrawide sizes

### US3 visual verification

- [X] T048 [US3] Compare implemented `/` and `/host` against the four approved previews and record exact alignment plus any approved deviations in `specs/009-premium-active-hub/verification.md`
- [X] T049 [US3] Inspect Ludo artwork at its smallest and largest card sizes in `specs/009-premium-active-hub/evidence/` and confirm the die has believable perspective, rounded/beveled edges, visible faces, and logical pips
- [X] T050 [US3] Force a card-art load failure and confirm the neutral fallback in `client/src/components/hub/GameCard.tsx` preserves reserved size, name, mode action, and accessibility
- [X] T051 [US3] Verify normal and reduced-motion Hub visuals at the full viewport matrix and record clipping, overlap, overflow, distortion, touch, and focus results in `specs/009-premium-active-hub/verification.md`
- [ ] T052 [US3] Obtain results from at least 10 reviewers, including at least 5 host-side and 5 player-side reviewers, for visual energy, premium appearance, primary-action recognition, and Ludo die believability and record sample counts in `specs/009-premium-active-hub/verification.md`

**Checkpoint**: The complete Hub visually matches the approved previews, active artwork is dimensional and consistent, and the Ludo die is natural.

---

## Phase 6: User Story 4 - Retain Reliable Hub Workflows (Priority: P2)

**Goal**: The visual redesign preserves all room creation, joining, authority, and gameplay behavior.

**Independent Test**: Create a room from `/host`, join it from `/`, exercise invalid-code recovery, start supported games, and run the existing focused smoke suite.

### Regression verification

- [X] T053 [P] [US4] Review `client/src/components/hub/Header.tsx`, `GameGrid.tsx`, `GameCard.tsx`, and `JoinRoomPanel.tsx` for any added host claim, room authority, or client-side launch bypass; record findings in `specs/009-premium-active-hub/verification.md`
- [X] T054 [P] [US4] Confirm `client/src/components/launch/LaunchModal.tsx`, `client/src/state/roomStore.ts`, `server/src/`, and `shared/src/protocol.ts` remain behaviorally unchanged except for intended active-card selection and presentation references
- [X] T055 [US4] Create one online room from the host Hub, join from the player Hub by its six-character code, verify player identity and host controls, and record the two-client checkpoint in `specs/009-premium-active-hub/verification.md`
- [X] T056 [US4] Exercise invalid, missing, full, started, expired, suspended, removed, and rate-limited code states using the existing `client/src/state/roomStore.ts` behavior and confirm recoverable inline feedback remains on the redesigned Hub
- [X] T057 [US4] Start at least one AI or online Ludo flow and confirm authoritative dice, turns, movement, and results remain unchanged from pre-redesign behavior in `specs/009-premium-active-hub/verification.md`
- [X] T058 [US4] Run `npm run build` and `npm run smoke`, record all scenario results in `specs/009-premium-active-hub/verification.md`, and stop on any regression

**Checkpoint**: The visual-only redesign has not changed host authorization, room joining, room lifecycle, or gameplay.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Complete performance, production, evidence, and final consistency checks.

- [X] T059 [P] Optimize all files in `client/public/brand/games/` and the role-neutral title asset for transfer size while preserving the approved visual result
- [X] T060 [P] Confirm eager/lazy image loading behavior in `client/src/components/hub/GameCard.tsx` and `client/src/art/Logo.tsx` does not delay profile, audio, room entry, or the first action
- [X] T061 Record hero/primary-action timing and asset byte sizes in `specs/009-premium-active-hub/verification.md` under a cold-cache 4G-class throttle with 150 ms added round-trip latency on the documented test machine
- [ ] T062 Deploy the completed branch to Render and inspect production `/` and `/host` for complete live role labels, active-only cards, all image loads, `/healthz` readiness, and zero missing-image or content-blocking errors
- [ ] T063 Exercise production secure WebSocket connectivity, host creation, player code joining, and an active-room disconnect/reconnect resynchronization checkpoint; record the result in `specs/009-premium-active-hub/verification.md`
- [X] T064 Re-open `specs/009-premium-active-hub/checklists/requirements.md` as a read-only requirements-quality checklist, and record all functional and success-criterion evidence in `specs/009-premium-active-hub/verification.md` without changing checklist markers
- [X] T065 Review `specs/009-premium-active-hub/tasks.md`, mark only completed tasks, and ensure no inactive-game, server-authority, or unapproved-preview task has been incorrectly completed

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Starts immediately.
- **Foundational preview gate (Phase 2)**: Depends on Phase 1 and blocks every production implementation task through T065.
- **User Story 1 (Phase 3)**: Starts only after T013 confirms all four preview approvals.
- **User Story 2 (Phase 4)**: Starts after the preview gate and can proceed independently of US1 styling, though final integration uses the approved header.
- **User Story 3 (Phase 5)**: Starts after the preview gate; asset production tasks T037-T040 may run in parallel once the shared asset rules are stable.
- **User Story 4 (Phase 6)**: Depends on US1-US3 integration.
- **Polish (Phase 7)**: Depends on all desired stories.

### User Story Dependency Graph

```text
Setup
  -> Four-preview approval gate
       -> US1 (role identity and responsive header)
       -> US2 (active-only game catalog)
            -> US3 (premium active-game artwork and page-wide visuals)
                 -> US4 (workflow regression)
                      -> Render and polish
```

### Parallel Opportunities

- T006-T009 produce the four previews in parallel because each target is a separate file.
- T018 and T019 can proceed together after header structure is stable.
- T033, T043, and T044 can begin in parallel after preview approval.
- T037-T040 produce per-game artwork independently.
- T053 and T054 can review client and existing workflow boundaries in parallel.
- T059 and T060 can run together after the visual implementation is stable.

---

## Parallel Example: Premium Artwork

```text
Task: T037 Produce approved dimensional Ludo artwork in client/public/brand/games/ludo.webp
Task: T038 Produce approved dimensional Housie artwork in client/public/brand/games/housie.webp
Task: T039 Produce approved dimensional Bingo artwork in client/public/brand/games/bingo.webp
Task: T040 Produce approved dimensional UNO artwork in client/public/brand/games/uno.webp
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1.
2. Complete and approve the four-preview gate.
3. Implement US1 role identity and responsive header.
4. Stop and validate complete PLAYER HUB / HOST ARENA visibility independently.

### Incremental Delivery

1. Preview gate approved.
2. US1 delivers reliable role identity.
3. US2 removes inactive cards without changing workflows.
4. US3 adds approved premium artwork and visual composition.
5. US4 and Polish prove behavior and deployment remain correct.

### Review Safety

- Do not begin production UI or assets before T013.
- Do not present a preview approximation as implementation approval.
- Do not use generated artwork that changes gameplay semantics, particularly Ludo dice state.
- Do not mark Render or responsive verification complete without recorded evidence.

## Notes

- `[P]` tasks operate on different files or independent evidence.
- User-story labels map directly to the four prioritized stories in `spec.md`.
- Checklist markers represent implementation completion, not the separate preview-review approval state.
- No production server or game-engine change is planned.
