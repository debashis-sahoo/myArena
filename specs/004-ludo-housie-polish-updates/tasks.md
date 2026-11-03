# Tasks: Ludo Pawn Sync, Glossy Dice, Housie Phone Readability and Share Text

**Input**: Design documents from `/specs/004-ludo-housie-polish-updates/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md),
[contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: No automated test suites (constitution Principle III, spec Assumptions). Verification is scripted browser/socket checks and
visual evidence recorded in `verification.md` (scenario, expected, observed). Harness scripts live outside the repo in
`C:\Users\debashis\AppData\Local\Temp\pw\` (as in 003).

**Organization**: Grouped by user story. US1 (Ludo pawns), US2 (Housie titles) and US4 (share text) touch different files and can run in
parallel; US3 (die) only touches `ludo.css`. Commit and push only when the user asks.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1 to US4 from spec.md
- Run npm commands from the repo root `G:\Projects\MyArena` (workspace builds fail from other folders)

## Phase 1: Setup (baselines before any change)

**Purpose**: Capture the "before" evidence the spec compares against.

- [X] T001 Run `npm run build` and `npm run smoke` from the repo root and confirm the 14 smoke checks pass on the untouched code
- [X] T002 [P] Capture the Housie ticket-cell baseline: start the server with `HOUSIE_DEV_DECK=first-ticket`, run `hz-ui.mjs metrics` from `C:\Users\debashis\AppData\Local\Temp\pw\` at 320x568, 360x640, 390x844, 844x390, 768x1024, 1024x768, 1366x768, 1920x1080, 2560x1440, and save the cell sizes into the new `specs/004-ludo-housie-polish-updates/verification.md` as the "before" table (cross-check against the H8 table in `specs/003-housie-tambola-module/verification.md`)
- [X] T003 [P] Capture "before" screenshots of the Housie combinations area on a 390x844 and an 844x390 phone (6 and 12 combinations, as player and as host) and of the Ludo die at rest on faces 1 to 6 plus mid-tumble (desktop 1440x900 and phone 390x844), saved under `specs/004-ludo-housie-polish-updates/evidence/before/`
- [X] T004 Create `specs/004-ludo-housie-polish-updates/verification.md` with sections V1 (pawn consistency), V2 (Housie titles), V3 (die), V4 (share text), a baseline section holding T002 and T003 results, and a Pending section

**Checkpoint**: Baselines saved; the build and smoke checks pass before changes.

## Phase 2: Foundational

No shared prerequisites: the four stories are independent (no shared files), so story phases may start as soon as Phase 1 is done.

## Phase 3: User Story 1 - Every Player Sees the Same Pawns in the Same Places (Priority: P1) MVP

**Goal**: No pawn is ever drawn on a different square on one screen than on another; any divergence corrects itself within 2 seconds.

**Independent Test**: [quickstart.md](quickstart.md) V1: two or more screens plus the socket reference; after every move every screen equals
the server (scenarios 1 to 7), and the reproduced stuck case no longer differs (10 of 10).

### Reproduce first (FR-006)

- [X] T005 [US1] Add the verification surface to `client/src/games/ludo/Pawns.tsx`: a `data-sq` attribute on every pawn element holding the square key of the committed snapshot (`r,c`, `base:i` or `home:i`, per [data-model.md](data-model.md)); no behaviour change
- [X] T006 [US1] Write the two-screen harness `C:\Users\debashis\AppData\Local\Temp\pw\ludo-sync.mjs`: host page and guest page (Playwright, Edge channel) plus a socket reference client in one online room with `LUDO_DEV_DICE` controlled dice; after each settle compare every page's `data-sq` and bounding-box centres with the layout derived from the server snapshot; scenario flags: `rapid`, `capture` (including a capture while another pawn moves onto the same square), `stack`, `hidden` (guest `visibilityState` hidden for 5 s mid-move), `reconnect` (guest offline then online), `join` (a guest joins mid-match), `throttle` (CDP CPU 6x), `resize`; print PASS or the first difference with timestamps
- [X] T007 [US1] Run `ludo-sync.mjs` for every scenario against the current (unfixed) client build, find which scenarios show a difference, and record the scenario, expected, observed and the confirmed cause (which of H1 to H5 in [research.md](research.md)) in `specs/004-ludo-housie-polish-updates/verification.md` V1 (this is the FR-006 record and the SC-003 reproduction); if no scenario shows a difference, record "not reproduced", still apply T008 to T012 as defensive fixes, use the hardest scenarios (`hidden`, `throttle`, `resize`) as the T014 and T015 proof, and add the owner's real-device repeat with a remote friend to the Pending list (T030)

### Fix

- [X] T008 [P] [US1] Make `hopAlong` in `client/src/games/ludo/anim/hop.ts` abortable: accept an `AbortSignal`, check it at the start of every loop iteration and after every await, cancel the animations it created on abort, create no animation after abort, and keep hop timing and easing unchanged (FR-007)
- [X] T009 [P] [US1] Make `bounceHome` and `celebrateHome` in `client/src/games/ludo/anim/capture.ts` abortable the same way (cancel their animations on abort, remove any sparkle element, no leftover fill)
- [X] T010 [US1] Update `client/src/games/ludo/Pawns.tsx` (after T008 and T009): create an `AbortController` per move effect and abort it in the effect cleanup instead of only setting `cancelled`; pass its signal to `hopAlong` and `bounceHome`; add a layout effect that cancels every animation in the pawn layer whenever nothing is animating (`anim === null`) and when the cell size changes (settle reconciliation); render one element type for every pawn (a `div` that gets `role="button"`, `tabIndex` 0, `aria-label`, the click handler and an `onKeyDown` handler that moves the pawn on Enter and Space (with `preventDefault` on Space) only when eligible, otherwise `role="img"` and no `tabIndex`) so eligibility changes never remount a pawn and keyboard moves keep working; keep the `matchRev` cancel
- [X] T011 [US1] Update `client/src/games/ludo/useLudo.ts`: treat `pageshow` and `online` like `visibilitychange` (abort the running sequence, clear the timer, show the newest snapshot at once; `focus` was left out on purpose because it also fires during normal play and would cut legitimate hops); abort a moved event whose sequence number is already covered by a newer snapshot (reconnect or resync); add a catch-up rule: when a queued event has waited 1500 ms behind the running animation, abort it and jump to the newest snapshot
- [X] T012 [US1] Update the Ludo slice in `client/src/state/roomStore.ts` `GAME_EVENT` handler: when `ludo.seq > view.game.lastSeq + 1` (an event was missed), drop the queue and show that event's own snapshot at once (every event carries the full state, so no resync round trip is needed); events with `seq <= lastSeq` stay ignored; do not change feed-based games (Housie)
- [X] T013 [US1] Run `npm run build` and fix any TypeScript or lint error in the files changed by T005 to T012

### Prove

- [X] T014 [US1] Re-run all `ludo-sync.mjs` scenarios (`rapid`, `capture`, `stack`, `hidden`, `reconnect`, `throttle`, `resize`) on the fixed build and record the observed result per scenario in `verification.md` V1 (pass = zero differences after settle and `getAnimations()` empty on the pawn layer when settled)
- [X] T015 [US1] Repeat the scenario reproduced in T007 ten times on the fixed build (SC-003), and run 20 consecutive scripted online matches with a backgrounded and a reconnecting screen (SC-001, SC-002), recording counts and any difference in `verification.md` V1; a scripted match here means play from the start until the first HOME arrival or 60 accepted moves, whichever is first, with the host page driven by the browser and the guest by the socket client (use `LUDO_DEV_SCENARIO=endgame` for runs that need to reach HOME quickly)
- [X] T016 [US1] Regression check: run `ludo-check.mjs` and `npm run smoke`, and watch one normal move on desktop and phone to confirm hop animation, puffs, capture bounce and HOME celebration still look and time the same (FR-007), and confirm a pawn can still be moved with the keyboard (Tab to an eligible pawn, Enter and Space) and by tap; record in `verification.md` V1

**Checkpoint**: US1 passes V1 with evidence; the fix is demonstrably tied to the recorded cause.

## Phase 4: User Story 2 - Housie Combination Titles Are Readable on Every Screen (Priority: P1)

**Goal**: Every tile's title is readable on every screen: full title on up to two lines shrunk to 10 px, then a short name; tickets never shrink.

**Independent Test**: [quickstart.md](quickstart.md) V2: 6, 12 and 40 combinations on the viewport matrix, player and host; no cut titles; ticket cells at or above baseline and at least 32 px.

- [X] T017 [P] [US2] Create `client/src/games/housie/shortNames.ts`: a `Record<string, string>` keyed by every pattern id in `shared/src/housie/patterns.ts` (40 entries), each value at most 9 characters, recognizable and unique (for example `early-five` = "Early 5", `four-corners` = "4 Corners", `top-and-middle` = "Top+Mid", `middle-and-bottom` = "Mid+Bot", `top-and-bottom` = "Top+Bot", `full-house-1` through `-3` = "House 1st" / "House 2nd" / "House 3rd"), plus an exported `shortNameOf(id, fullName)` that falls back to the full name; check with a one-off node command that the key set equals the catalogue's id set, every value is at most 9 characters and all values are distinct
- [X] T018 [US2] Add a pure, cached title fit to `client/src/games/housie/useFit.ts` next to `planTiles` (do not change `planTiles`, ticket fit or `MIN_CELL`): `fitTitle({ full, short, width, height, baseFontPx, fontCss })` using an offscreen canvas `measureText` with a (font, text) width cache, greedy word wrap into at most 2 lines at line height 1.15, trying the full name from `baseFontPx` down to 10 px in 0.5 px steps, then the short name the same way, last resort short name at 10 px; return `{ text, form: 'full' | 'short', fontPx, lines }` (constraints from [data-model.md](data-model.md): 10 px floor, at most 2 lines, no word split)
- [X] T019 [US2] Update `client/src/games/housie/CombinationTiles.tsx` (after T017 and T018): compute the available name width and height per tile from the tile width and `plan.tileHeight` (subtract padding, the CLAIM button, gaps; in the side-by-side `flat` layout subtract the button width), read the tier's base font size and the font from the name element's computed style once, call `fitTitle` per combo with `shortNameOf`, set inline `font-size` and `data-form` on `.hz-combo-name`, keep `title={name}` on the tile and the full name in the popover, and keep the claimed state showing the title together with "Claimed by [name]"
- [X] T020 [US2] Update `client/src/games/housie/CombinationTiles.css`: `.hz-combo-name` wraps (`white-space: normal`, `overflow-wrap: normal`, `text-wrap: balance`, line height 1.15, two-line max with ellipsis only as the last-resort fallback), remove the one-line nowrap for names while keeping the tile at least 40 px tall, CLAIM buttons and statuses always visible with their current visual size but a hit area at least 40 px tall (extend with padding or a transparent `::after` on `.hz-combo-claim`, without enlarging the tile or overlapping a neighbour's button), claimed tiles show the title and "Claimed by" without hiding the title, 10 px allowed for names only
- [X] T021 [US2] Run `npm run build` (repo root) and fix errors; then re-run `hz-ui.mjs metrics` on the T002 viewport list and record the "after" table in `verification.md` V2: every cell size equal to or larger than the T002 values and at least 32 px (SC-006, FR-015)
- [X] T022 [US2] Run the V2 matrix as player and as host with 6, 12 and 40 combinations (viewports 320x568, 360x640, 390x844, 844x390, 640x360, 768x1024, 1024x768, 1366x768, 1920x1080, 2560x1440): per tile read `data-form`, computed font size, `scrollWidth` vs `clientWidth` and line count; take screenshots into `specs/004-ludo-housie-polish-updates/evidence/after/`; check claim flow (claimed tile shows title and "Claimed by"), tap on a tile opens the popover with the full name, the page never scrolls, and the ball console, tickets and chat still fit; confirm 6 combinations always give `data-form="full"` on every phone viewport and 12 or fewer give it whenever the name fits two lines at 10 px, the last-resort ellipsis never triggers on any tested screen, each CLAIM button's hit area is at least 40 px tall, and the title fit for 40 tiles takes under 5 ms (measure with `performance.now()`); (FR-011 to FR-018, SC-004, SC-005); record in `verification.md` V2

**Checkpoint**: US2 passes V2 with before/after screenshots and the ticket-size table.

## Phase 5: User Story 3 - A Rounder, Glossy White Ludo Die (Priority: P2)

**Goal**: The die looks glossy white with clearly rounder corners; size, animation, timing and result unchanged.

**Independent Test**: [quickstart.md](quickstart.md) V3: 10 rolls on desktop and phone, faces 1 to 6 at rest and mid-tumble compared with the T003 screenshots.

- [X] T023 [P] [US3] Restyle the die faces in `client/src/games/ludo/ludo.css` per [contracts/die-and-share.md](contracts/die-and-share.md): slab fills to bright white with cool grey shading (`#ffffff` to about `#e6ebf3`; deeper slabs about `#dfe5ef` and `#c9d1df`), a soft upper-left specular `radial-gradient` highlight layer on `.slab.s0` plus a faint inner rim light, slab radii raised to about 32%, 40% and 48%, depth steps adjusted so the bevel reads round, pips kept dark and glossy with a slightly stronger inner shadow; do not change `--die`, the `.face.f1` to `.f6` transforms, the tray, animation or any markup in `Die.tsx`
- [X] T024 [US3] Build the client (`npm run build -w client` from the repo root), roll the die 10 times on desktop 1440x900 and phone 390x844, capture faces 1 to 6 at rest, mid-tumble, hover, disabled and with reduced motion into `specs/004-ludo-housie-polish-updates/evidence/after/`, compare side by side with the T003 screenshots, and record in `verification.md` V3 (white glossy body, clearly rounder corners, pips readable, same result on every screen, tumble timing unchanged)

**Checkpoint**: US3 passes V3 with before/after screenshots.

## Phase 6: User Story 4 - A Friendlier Description When the Link Is Shared (Priority: P3)

**Goal**: Shared Hub and room invite links preview "myArena Hub" with "Play interactive games with your Friends and Family".

**Independent Test**: [quickstart.md](quickstart.md) V4: served HTML of `/` and `/room/ludo/ABC123` contains the new text and no Ludo or private-room wording.

- [X] T025 [P] [US4] Edit `client/index.html`: set `meta[name=description]` to "Play interactive games with your Friends and Family" and add `og:site_name`, `og:type` (website), `og:title`, `og:description`, `twitter:card` (summary), `twitter:title` and `twitter:description` exactly as in [contracts/die-and-share.md](contracts/die-and-share.md); keep `<title>myArena Hub</title>`
- [X] T026 [US4] Build (`npm run build`), start the server, fetch `/` and `/room/ludo/ABC123` with `Invoke-WebRequest` and confirm both responses carry the new description in `description`, `og:description` and `twitter:description`, the title is "myArena Hub", and neither head mentions "Ludo" or "private room"; also confirm `client/dist/index.html` is updated; record in `verification.md` V4
- [X] T027 [US4] Search `client`, `server` and `shared` source (not `dist`) for the old wording ("play Ludo with friends", "friends in private rooms") and confirm none remains in a description or share context; leave the in-app Launch dialog copy unchanged (Assumptions)

**Checkpoint**: US4 passes V4; real-preview check recorded as pending until deployed.

## Phase 7: Polish and Cross-Cutting

- [X] T028 Run the full `npm run build` and `npm run smoke` from the repo root and confirm 14/14 pass after all four stories
- [X] T029 Run a final room-flow smoke with two clients (Hub entry, create room, invite link join, a few Ludo moves, a Housie draw and claim, chat) to confirm no regression from the shared store change (constitution workflow gates); record in `verification.md`
- [X] T030 Fill the Pending section of `verification.md`: real-device pawn check by the owner with a remote friend (required if T007 did not reproduce the difference), real-device Housie phone check, owner confirmation of the die look (SC-007), two real link previews, one for the Hub link and one for a room invite link, in a chat app or preview checker (SC-008), and a Render deployment check, each as pending until verified; update the compliance notes (applicable constitution principles) at the top of `verification.md`
- [X] T031 Re-run `specs/004-ludo-housie-polish-updates/checklists/requirements.md` against the final behaviour and tick off the success criteria SC-001 to SC-008 that have evidence; do not commit or push until the user asks

## Dependencies and Execution Order

```text
Phase 1 (T001-T004) ──┬─> US1: T005 -> T006 -> T007 -> (T008 || T009) -> T010 -> T011 -> T012 -> T013 -> T014 -> T015 -> T016
                      ├─> US2: (T017 || T018) -> T019 -> T020 -> T021 -> T022
                      ├─> US3: T023 -> T024
                      └─> US4: T025 -> T026 -> T027
All stories ───────────> Phase 7: T028 -> T029 -> T030 -> T031
```

- US1 to US4 are independent of each other; T010 to T012 edit different files and could be split, but T010 depends on T008 and T009.
- Shared files: `ludo.css` (US3 only), `Pawns.tsx` (US1 only), `useFit.ts` and `CombinationTiles.*` (US2 only), `index.html` (US4 only), `roomStore.ts` (US1 only). No two stories edit the same file, so the main thread can hand US2, US3 and US4 to sub-agents while it does US1.
- T007 must finish before T008 to T012 start so the fix is tied to a reproduced cause (FR-006).
- T021 depends on the T002 baseline; T024 depends on the T003 screenshots.

## Parallel Execution Examples

- Phase 1: T002 and T003 in parallel (different outputs).
- Across stories after Phase 1: US1 (main thread), US2 (T017 and T018 in parallel, then T019 to T022), US3 (T023, T024) and US4 (T025 to T027) can proceed together.
- Inside US1: T008 and T009 in parallel (separate animation files).

## Implementation Strategy

- **MVP**: User Story 1 (T001 to T016). It is the P1 defect that makes matches unplayable for one player.
- **Incremental delivery**: US2 (P1) next, then US3 (P2) and US4 (P3); each is independently verifiable and can be delivered alone.
- **Evidence-first**: Record baselines (Phase 1) and the reproduced cause (T007) before changing code, record before/after for every UI change, and keep real-device and post-deploy checks as explicit pending items.

## Summary

| Phase | Tasks | Count |
|-------|-------|-------|
| 1 Setup | T001 to T004 | 4 |
| 2 Foundational | none | 0 |
| 3 US1 Ludo pawns (P1) | T005 to T016 | 12 |
| 4 US2 Housie titles (P1) | T017 to T022 | 6 |
| 5 US3 Glossy die (P2) | T023 to T024 | 2 |
| 6 US4 Share text (P3) | T025 to T027 | 3 |
| 7 Polish | T028 to T031 | 4 |
| **Total** | | **31** |

## Phase 8: Convergence

**Purpose**: Remaining gaps found by `/speckit-converge` between the spec, plan and tasks and the current code and evidence. Source files are `specs/004-ludo-housie-polish-updates/` documents and the harness scripts in `C:\Users\debashis\AppData\Local\Temp\pw\`.

- [X] T032 Add the missing `rapid`, `capture`, `stack` and `join` scenarios to `C:\Users\debashis\AppData\Local\Temp\pw\ludo-sync.mjs` (use `LUDO_DEV_DICE` sequences that force a capture, a stack of two or more pawns on one square with one pawn leaving it, and back-to-back sixes with bonus rolls; `join` = a third browser page joins mid-match), run them and the existing scenarios on the fixed build, and record scenario, expected and observed per case in `specs/004-ludo-housie-polish-updates/verification.md` V1 per US1/AC1, US1/AC2, US1/AC4, US1/AC5, FR-004 and FR-005 (partial). Done in a new harness, `ludo-drive.mjs`, where both pages and a reference seat play as fast as the UI allows and prefer captures and stacks, instead of dice sequences in `ludo-sync.mjs`; a new player cannot join a running match by design, so `join` covers a returning guest on a fresh page
- [X] T033 Verify the reduced-motion pawn path in `client/src/games/ludo/anim/hop.ts` and `client/src/games/ludo/anim/capture.ts` (Playwright `reducedMotion: 'reduce'`, a move, a capture and a mid-move skip with `ludo-sync.mjs`): pawns end on the server's squares, no leftover pawn animation, and the quick capture fade is also cancelled on abort; fix any difference and record the result in `verification.md` V1 per FR-002 and Constitution II (partial)
- [X] T034 Make the Housie harness exact and re-run the phone viewports: extend `C:\Users\debashis\AppData\Local\Temp\pw\hz-titles.mjs` so the `twelve` set is exactly 12 combinations and the `all` set exactly 40 (set them with the host chooser's individual buttons and assert the tile count), re-run 390x844, 360x640, 320x568, 844x390 and 640x360 as player and host, and record title form, cut count, ticket cell size against the baseline and page-scroll result in `verification.md` V2 per FR-017, SC-005 and SC-006 (partial)
- [X] T035 Measure and record the title-fit cost for 40 tiles (`performance.now()` around `fitTitle` for all tiles on first render and after a resize in `client/src/games/housie/useFit.ts` and `client/src/games/housie/CombinationTiles.tsx`, using a temporary probe that is removed afterwards) and note the result against the 5 ms goal in `verification.md` V2 per plan: Performance Goals (missing)
- [X] T036 Bring the design documents in line with the implemented tile plan: update `specs/004-ludo-housie-polish-updates/plan.md` (Project Structure, `useFit.ts`), `research.md` R3 and `contracts/tile-titles.md` rule 7, which say `planTiles` is unchanged, to describe the readable tile width cap (70 px up to 18 combinations, 54 px for more), the fixed scroll tile heights (62, 58, 56 px), the `snug`, `row` and `tight` tile layouts with their geometry constants that mirror `CombinationTiles.css`, and the border-to-inset-shadow change on `.hz-combo`, stating that ticket planning is unchanged and was verified identical to the baseline per plan: Project Structure and Constitution IV (contradicts)
- [X] T037 Run the 20 consecutive scripted Ludo matches that T015 defined (each from the start until the first HOME arrival or 60 accepted moves, host page driven by the browser, guest by the socket client, one backgrounded and one reconnecting screen during the series) or, if that is judged out of reach, record in `verification.md` V1 that SC-001 rests on the repeated scripted runs plus the owner's real-device check per SC-001 (partial). Done through the second option: no run reached a HOME arrival, recorded in V1
