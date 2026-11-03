# Verification: Ludo Pawn Sync, Glossy Dice, Housie Phone Readability and Share Text

Feature: [spec.md](spec.md) | Plan: [plan.md](plan.md) | Quickstart: [quickstart.md](quickstart.md)

Date started: 2026-11-02. Harness scripts are outside the repo in `C:\Users\debashis\AppData\Local\Temp\pw\`
(`hz-titles.mjs` for Housie titles and ticket cells, `ludo-sync.mjs` for pawn consistency). Evidence images are under `evidence/before/`
and `evidence/after/`.

## Constitution compliance (applicable principles)

| Principle | Evidence |
|-----------|----------|
| I. Repository and Render-ready hosting | No config, dependency or environment changes |
| II. Graphics-first | Glossy rounder die (V3); readable titles on all screens (V2); reduced-motion paths kept |
| III. Pragmatic verification | Scripted two-screen checkpoints with controlled dice, browser screenshots; no new test suites |
| IV. Platform and game decoupling | Pawn fixes in the Ludo module; gap resync in the platform game slice; Housie changes in the Housie module |
| V. Server-authoritative play | No server change; every correction shows the server's snapshot |

## Baseline (before any change, T001 to T003)

- `npm run build`: success. `npm run smoke`: 14/14 pass (T001).
- Housie measured with `hz-titles.mjs` (Edge, 4 tickets each, 2 balls drawn). Sets: `default` = 6 combinations, `mid` = about 13, `all` = 31 to 40
  (the host chooser's "All" buttons; the count is the number of tiles shown). "Cut tiles" = tiles whose title is clipped or ellipsized.
  Ticket cells = the smallest ticket cell on the player's screen (px). Page never scrolled in any case.

| Viewport | Min ticket cell (default / mid / all) | Cut tiles (default / mid / all) |
|----------|----------------------------------------|----------------------------------|
| 2560x1440 | 106 / 73 / 73 | 0 / 4 / 13 |
| 1920x1080 | 73 / 52 / 52 | 0 / 0 / 19 |
| 1366x768 | 44 / 34 / 34 | 0 / 4 / 17 |
| 1024x768 | 44 / 59 / 59 | 0 / 4 / 21 |
| 768x1024 | 50 / 35 / 35 | 0 / 4 / 21 |
| 844x390 (phone landscape) | 48 / 48 / 48 | 6 / 13 / 40 |
| 640x360 (small landscape) | 16 / 16 / 16 | 1 / 13 / 40 |
| 390x844 (phone portrait) | 35 / 39 / 39 | 6 / 13 / 37 |
| 360x640 | 36 / 36 / 36 | 6 / 13 / 35 |
| 320x568 | 32 / 32 / 32 | 6 / 13 / 31 |

Observations:

- The reported problem reproduces: on every phone size (portrait and landscape) every title is cut ("Early Five", "Top Line" and so on).
  Titles are cut even on desktop and tablet widths once 13 or more combinations are chosen.
- At 640x360 with 4 tickets, ticket cells are 16 px. This is the pre-existing 003 behaviour at an extreme size (below the 32 px rule), outside
  this feature's scope (changing ticket layout is out of scope); recorded here so it is not mistaken for a regression. The 004 rule is "never
  smaller than this baseline".
- Before-screenshots: `evidence/before/<size>-<set>-<who>.png`.

## V1. Pawn consistency (US1)

### Cause analysis and reproduction (T007, FR-006)

Code reading of `Pawns.tsx`, `anim/hop.ts`, `useLudo.ts` and `roomStore.ts` found the defect classes H1 to H5 in
[research.md](research.md) R1. The harness `ludo-sync.mjs` (two real Edge pages, host and guest, plus a socket reference seat in one online
room; scripted dice `LUDO_DEV_DICE`, 3.5 to 6 s server turn timer so quiet windows exist; after the expected animation time plus 1 s of
quiet, each page's pawns are compared with the server snapshot: `data-sq` square keys, pixel position inside the square's cell, and any
leftover animation on a pawn) was run against the unfixed animation code (only the `data-sq`/`data-pawn` attributes added):

| Scenario | Unfixed code | Observation |
|----------|--------------|-------------|
| `base` (normal play, two screens) | PASS | positions equal on both screens after every move |
| `midhop`: the tab returns to the foreground in the middle of a hop (the screen skips to the newest state) | FAIL | 2 to 3 pawn animations were started after the skip with no new move from the server: the hop loop kept creating `fill: forwards` animations on the pawn after the state had been committed and its animations cancelled (H1). Until the next state change, such a pawn is pinned to a stale pixel position. If a newer snapshot moved or captured the pawn in the meantime, it is drawn on a square the server no longer has it on: the reported "stuck on a box" |
| `hidden`, `reconnect`, `resize` (disturbance timed during a hop) | PASS in most runs | the stale hold is cleared by the next event (often within seconds), so it shows only when no event follows quickly, which is why it is hard to reproduce by hand and looked like it happened to 1 pawn of 4 |
| `throttle` (guest CPU 6x slower) | one run reported a lagging screen | an early report was partly a harness timing artefact (the check ran while the last hop was still legitimately playing); after correcting the wait to "expected animation duration plus 1 s" it passes on the fixed build |

Cause recorded: **H1** (non-abortable hop sequence creating animations after an abort or commit) is confirmed with the `midhop` check; H5
follows from it (the settled board was never reconciled with layout). H2 (stale pixel holds after a resize), H3 (a pawn element remounting
when it becomes movable) and H4 (no catch-up for a screen that is behind) are fixed by design and covered by the checks below; H2 and H3
did not show a difference in the scripted runs on the unfixed code.

### Fix

`hopAlong` and `bounceHome` take an `AbortSignal` (cancel what they started, start nothing after an abort); the move effect aborts on
cleanup; a layout effect cancels every animation on the pawn layer whenever nothing is animating and when the board size changes; pawns
render as one stable element (`div` with `role="button"`, tap and Enter/Space when movable); `useLudo` treats `visibilitychange`,
`pageshow` and `online` as "show the newest state", aborts a move when a newer snapshot replaces the board, and jumps to the newest
snapshot when a queued event waited 1.5 s behind the running animation; the store shows a gap event's own snapshot at once.

### Results on the fixed build (T014)

Harness: `ludo-sync.mjs`, scripted dice, 6 s server turn timer, check after the expected animation time plus 1 s of quiet; a pass means every
pawn is drawn on the server's square on both screens (`data-sq` and pixel position), with no leftover animation on any pawn.

| Scenario (fixed build) | Result |
|------------------------|--------|
| `base`, two screens | PASS |
| `midhop` (tab returns mid-hop, screen skips to the newest state) | PASS: 0 pawn animations started after the skip |
| `hidden` (animations frozen like a background tab, 6 s, during a hop) | PASS |
| `reconnect` (guest offline 3 s during a hop, then back) | PASS |
| `throttle` (guest CPU 6x slower for the whole match) | PASS |
| `resize` (viewport changed during a hop and again after each move) | PASS |

Repeats (T015): the reproduced `midhop` case ran 10 times in a row (about 45 s each, 3 forced mid-hop skips per run, 20 comparisons per
run): **10 of 10 runs PASS, 0 differences** (SC-003). The mixed set (`base`, `hidden`, `reconnect`, `throttle`, `resize`) ran 4 more times
in a row: **20 of 20 scenario runs PASS** (about 1 200 screen comparisons in total). With scripted dice every run plays the same moves, so
the repeats confirm stability rather than different dice. I did not run 20 separate full matches with real dice; that remains covered by
the owner's real-device check (Pending).

### Driven play: rapid moves, captures, stacks, bonus rolls, reduced motion, late join (T032, T033, T037)

Added `ludo-drive.mjs` (outside the repo, not an extension of `ludo-sync.mjs`): both browser pages and a socket reference seat play the
match as fast as the UI allows (server turn timer 60 s so the harness controls the pace, real random dice), choosing the pawn that gets home,
captures, stacks or enters the board; after each burst it stops, waits the expected animation time plus 1 s, and compares both screens with
the server snapshot (square keys, pixel position inside the square, no leftover pawn animation). Disturbances are listed per scenario.

| Scenario | Moves | Bonus rolls | Captures | Settled checks with a stack on the board | Disturbances | Result |
|----------|-------|-------------|----------|-------------------------------------------|--------------|--------|
| `rapid` (240 s; 17 chains of events closer than 1.2 s) | 29 | 8 | 0 | 3 | none | PASS |
| `throttle` (guest CPU 8x slower, 150 s) | 28 | 9 | 1 | 7 | none | PASS |
| `hidden` (animations frozen 3.5 s during a hop, then shown) | 20 | 6 | 0 | 3 | 15 | PASS |
| `reconnect` (guest offline 3 s during a hop) | 20 | 4 | 0 | 1 | 12 | PASS |
| `reduced` (prefers-reduced-motion on both screens, mid-hop skips) | 26 | 6 | 1 | 0 | 12 | PASS |

Total 123 moves, 33 bonus rolls, 2 captures (one with full animation under heavy throttling, one on the reduced-motion fade path), 14 settled
comparisons with stacked pawns, 39 mid-hop disturbances, 98 screen comparisons: **0 stale animations, 0 wrong squares, 0 wrong positions, 0
missing pawns**. Reduced motion (T033): the quick hop and the capture fade ended on the server's squares with no leftover animation, also
after mid-move skips; no code change was needed there. A capture or a stack leaving a square is covered only as far as these runs produced
them; no scripted capture was forced.

Late join: a new player opening the invite link during a running match is refused by design ("Match in progress ... new players cannot
join"). A guest returning to a running match (same guest, fresh page or reconnect) gets the current snapshot: covered by `reconnect`
and by one fresh-page run whose board matched the server straight away.

SC-001 (T037): 20 matches to the first HOME arrival were not run (no run reached a HOME arrival within about 30 moves with real dice,
and forcing it needs the endgame dev scenario, which skips most movement). SC-001 therefore rests on these runs (over 1 000 screen
comparisons across `ludo-sync`, `ludo-drive` and the repeats above, with no difference after the fix) plus the owner's real-device check
listed under Pending.

### Regression (T016)

- `ludo-key.mjs` (vs 3 bots, desktop 1280x720 and phone 390x844): a movable pawn is now a `div role="button"`; Tab/focus then Enter moved
  it (`base -> 6,1`), a click moved it (`6,1 -> 6,5`), no page errors, no leftover pawn animation afterwards; both viewports PASS.
- `ludo-check.mjs` (Ludo sanity: roll button, chat, match start) passes.
- Visual: a hop in progress is shown in `evidence/after/ludo-midhop-desktop.png` (pawn mid-air with its shadow, route highlighted, the
  new glossy white die in the console); hop timing, puffs and the capture bounce code are unchanged apart from being abortable.

## V2. Housie titles (US2)

What changed: titles wrap to two lines and shrink from the tier size down to 10 px (measured with canvas text widths, cached); when the
full name cannot fit at 10 px the short name is used (`shortNames.ts`, 40 entries, at most 9 characters); `planTiles` keeps the same
columns as before up to the readable tile width (70 px for 6 to 18 combinations, 54 px for 19 or more), beyond that the list scrolls
inside its own region (the page never scrolls); CLAIM keeps its look and gets a 40 px hit area (`::after`); the tile border became an inset
shadow so padding maths is exact. Ticket planning was not touched.

Final run of `hz-titles.mjs` (Edge, 4 tickets, 2 balls drawn, player and host; sets: default 6 combinations, "mid" 13, "twelve" 8 to 12,
"all" 21 to 40 (the host chooser's All buttons; the chooser toggles, so the count shown in the harness rows can differ); 10 viewports x 4 sets
x 2 roles = 80 rows, raw rows in `evidence/after/metrics-g*.json`):

- **Cut titles: 0 of 80 rows** (baseline: every phone row had cut titles, 6 of 6 even for the default set; desktop rows with 13 or more
  combinations had 4 to 21 cut).
- **Page scroll: 0 of 80 rows** scrolled (FR-018). On phones the combinations list scrolls inside its own panel when 10 or more tiles cannot
  be given a readable width (tiles never narrower than 70 px for 6 to 18 combinations, 54 px for 19 or more).
- **Ticket size (FR-015, SC-006)**: the smallest ticket cell on the player's screen is identical to the baseline in every row (the planning
  code for tickets was not touched), minimum 32 px at 320x568; 16 px at 640x360 is the pre-existing case recorded in the baseline.

| Viewport | Min ticket cell (default / mid / all): before = after | Cut titles before (default / mid / all) | Cut titles after |
|----------|-------------------------------------------------------|------------------------------------------|------------------|
| 2560x1440 | 106 / 73 / 73 | 0 / 4 / 13 | 0 |
| 1920x1080 | 73 / 52 / 52 | 0 / 0 / 19 | 0 |
| 1366x768 | 44 / 34 / 34 | 0 / 4 / 17 | 0 |
| 1024x768 | 44 / 59 / 59 | 0 / 4 / 21 | 0 |
| 768x1024 | 50 / 35 / 35 | 0 / 4 / 21 | 0 |
| 844x390 | 48 / 48 / 48 | 6 / 13 / 40 | 0 |
| 640x360 | 16 / 16 / 16 | 1 / 13 / 40 | 0 |
| 390x844 | 35 / 39 / 39 | 6 / 13 / 37 | 0 |
| 360x640 | 36 / 36 / 36 | 6 / 13 / 35 | 0 |
| 320x568 | 32 / 32 / 32 | 6 / 13 / 31 | 0 |

Other criteria:

- **Default 6 combinations (US2 AC1, SC-004)**: full titles on every phone, portrait and landscape, player and host, at 11.5 px or larger.
- **Up to 13 combinations (FR-017)**: full titles on every phone in nearly all runs (10 px, two lines, list scrolls inside its panel); the
  short form appeared for 1 tile in the 844x390 player view and the 390x844 host view when a long name could not fit two lines at 10 px
  in the tile height, which FR-012 and FR-017 allow ("Mid+Bot" is still recognizable).
- **40 combinations (SC-005)**: every tile identifiable; 0 to 5 tiles in the short form on phones; none cut; the panel scrolls.
- **Font floor**: smallest title font 10 px; at most 2 lines.
- **CLAIM hit area (FR-014)**: the `::after` extension is 40 px tall for every button (`hz-hit.mjs`); buttons scrolled out of view are
  not hit-testable by `elementFromPoint`, so those were checked from the computed style only.
- **Claimed tiles (FR-016)**: title plus "Claimed by ..." visible on 390x844 (`evidence/after/claimed-390x844-player.png`; the winner's
  name may ellipsize, the title may not).
- **Regression**: `hz-claims.mjs basic` and `hz-ui.mjs ui` pass (claims, bogus claim, popover on tile click, Escape, CLAIM does not open
  the popover, no page errors).

Observed but out of scope (identical before and after): on a 320x568 phone the Current Ball chip overlaps its heading and the ticket tab
labels overlap each other; this is existing 003 layout behaviour outside the combinations panel and is not changed here.

### Exact 12 and exactly 40 combinations on phones (T034)

The earlier "twelve" and "all" sets were not exact (the chooser re-renders after each server round trip). `hz-titles.mjs` now waits for the
chooser chip after every click and asserts the tile count; 12 uses single buttons, 40 uses the group All buttons. Results (player and host,
4 tickets; `evidence/after/metrics-t34*.json`):

| Viewport | 12 tiles: cut / short (player, host) / list scrolls | 40 tiles: cut / short (player, host) / list scrolls | Min ticket cell (= baseline) | Page scroll |
|----------|------------------------------------------------------|------------------------------------------------------|------------------------------|-------------|
| 390x844 | 0 / 0, 1 / no | 0 / 5, 5 / yes | 39 | none |
| 360x640 | 0 / 0, 0 / yes | 0 / 2, 2 / yes | 36 | none |
| 320x568 | 0 / 0, 0 / yes | 0 / 1, 1 / yes | 32 | none |
| 844x390 | 0 / 4, 0 / player no, host yes | 0 / 2, 2 / yes | 48 | none |
| 640x360 | 0 / 0, 0 / no | 0 / 5, 5 / yes | 16 (pre-existing) | none |

All 20 exact rows pass: no cut titles, 10 px floor, at most two lines, tickets identical to the baseline, no page scroll. With 12
combinations the full title is used everywhere except 4 tiles in the 844x390 player view and 1 tile in the 390x844 host view, where a long
name did not fit two lines at 10 px in the available tile height (the short form is allowed by FR-012 and FR-017).

### Title-fit cost (T035)

A temporary timing probe around the fit (all tiles, per recompute; removed afterwards, the source has no probe) on the 40-combination
host view after viewport changes that force fresh text measurement: 1440x900 median 0.2 ms, max 0.5 ms; 390x844 median 0.4 ms, max
0.8 ms; 390x844 with the CPU slowed 4x (a mid-range phone) median 2.4 ms, p95 and max 5.1 ms. The 5 ms goal holds for typical recomputes;
the slowest throttled recompute was 5.1 ms.

Screenshots: `evidence/before/` and `evidence/after/` (`<size>-<set>-<player|host>.png`).

## V3. Die look (US3)

`client/src/games/ludo/ludo.css` only: bright white faces (`#ffffff` to `#e6ebf3`, deeper slabs `#dfe5ef` and `#c9d1df`), a soft upper-left
specular highlight on the top slab, a faint inner rim light, slab radii 32% / 40% / 48% (before 24% / 30% / 38%), dark glossy pips with a
stronger inner shadow. Size, face transforms, tray, animation, timing and `Die.tsx` are unchanged.

Observed (`evidence/before/die-*.png` against `evidence/after/die-*.png`, desktop 1440x900 and phone 390x844, faces 1 to 6 at rest, mid-tumble,
reduced motion): the die is clearly white and glossy instead of cream, the corners are visibly rounder, pips are dark and readable on all
six faces on both viewports, the tumble still runs at the same speed and the result matches the number shown. Small light slivers remain at
the silhouette corners where side faces meet (they were there before as cream slivers).

## V4. Share text (US4)

`client/index.html`: description, Open Graph and Twitter tags. Served by the running server (`npm run build`, then fetched):

- `/` and `/room/ludo/ABC123` both return `<meta name="description" content="Play interactive games with your Friends and Family" />`,
  `og:description` and `twitter:description` with the same text, `og:title`, `og:site_name` and `twitter:title` = "myArena Hub",
  `<title>myArena Hub</title>`, `twitter:card` = summary.
- Neither head contains "Ludo" or "private room". A source search of `client/src`, `server/src`, `shared/src` and `client/index.html` for the old
  wording finds nothing; the in-app Launch dialog copy ("invite your friends to a private room") is intentionally unchanged.
- A real preview in a chat app or link-preview checker is pending until deployment (see Pending).

## Smoke (T028, T029)

- `npm run build` succeeds and `npm run smoke` passes 14 of 14 after all four stories.
- Cross-game room flow on the final build with two clients: Housie create room, invite-link join, start, draw, claim and bogus claim, chat
  and popover (`hz-claims.mjs basic`, `hz-ui.mjs ui`: all PASS); Ludo create room, invite-link join, play with controlled dice
  (`ludo-sync.mjs base`: PASS) and vs-bots play with keyboard and click moves (`ludo-key.mjs`: ALL PASS).

## Pending (not verifiable here)

| Item | Why pending | Spec reference |
|------|-------------|----------------|
| Owner plays Ludo online with a remote friend and compares pawn positions on both screens, including a phone sent to the background mid-move | Needs real devices and a real network; the cause was reproduced only in scripted runs (the reported case itself was not remembered) | SC-001, SC-003 |
| Owner checks Housie on a real phone (portrait and landscape): titles readable, tickets unchanged | Needs real devices | SC-004, SC-006 |
| Owner confirms the glossy white, rounder die look | Subjective review | SC-007 |
| Share the Hub link and a room invite link in two real previews (a chat app and a link-preview checker) | Needs the deployed site; the served HTML is verified locally (V4) | SC-008 |
| Render deployment: startup, readiness, WebSocket reconnect with the new client | Not deployed from this session | Constitution I and deployment gate |
| 20 separate full Ludo matches with real dice | Covered here by repeated scripted runs with controlled dice | SC-001 |

Notes: 640x360 tickets at 16 px (Housie) and the 320x568 overlap of the Current Ball chip and ticket tab labels are pre-existing 003 layout
behaviour, recorded in the baseline and V2 and not changed by this feature.
