# Quickstart: Validating Feature 004

Run from the repo root. Evidence (scenario, expected, observed, screenshots) goes in `verification.md` (constitution Principle III).

## Setup

```powershell
npm run build                      # builds shared, server, client
npm run smoke                      # regression: 14 checks must pass
$env:HOUSIE_DEV_DECK='first-ticket'; $env:HOUSIE_CLAIM_PACE_MS='300'
$env:LUDO_DEV_DICE='6,6,3,1,6,2'   # controlled Ludo dice (comma list, then random resumes); ignored in production
node server/dist/index.js          # http://localhost:10000
```

Browser tooling (outside the repo, as in 003): Playwright with the Edge channel, plus a socket client as the authoritative reference.

## V1. Pawn consistency (US1; FR-001 to FR-007)

Two or more browser pages (host plus guest) and the socket reference in one room, controlled dice. For each scenario record
`data-sq` of all pawns on every page and compare with the server snapshot after every move:

| # | Scenario | Expected |
|---|----------|----------|
| 1 | Six then bonus roll, bot moves right after a capture, played fast | Every page equals the server within 1 s of the move finishing |
| 2 | Capture; home-lane entry; HOME arrival | Same, and the captured pawn is in its base on every page |
| 3 | Three pawns stacked, one leaves | The remaining pawns stay; the moved pawn is on its new square on every page |
| 4 | Guest page hidden during a move, shown after 5 s | All pawns correct at once, no leftover animation |
| 5 | Guest offline then online mid-sequence | Fresh snapshot shown, no stuck pawn |
| 6 | Guest CPU throttled 6x with queued bot moves | Equal to the server within 2 s, no pawn off for longer |
| 7 | Resize and rotate during and after a move | Settled pawns centred on their squares at the new size |
| 8 | Same scenarios against the code before the fix | At least one shows a difference (recorded as the reproduced cause, FR-006) |

Pass: zero differences after settle for scenarios 1 to 7 on the fixed build; `getAnimations()` empty on the pawn layer when settled.

## V2. Housie titles (US2; FR-011 to FR-018)

Host and player, 6, 12 and 40 combinations, viewports 320x568, 360x640, 390x844 (portrait), 844x390 and 640x360 (landscape), 768x1024,
1024x768, 1366x768, 1920x1080, 2560x1440. For each: screenshot, then per tile read `data-form`, font size, overflow, line count.

Pass: no truncated "X..." titles; 6 and 12 combinations show full titles at 10 px or larger on all phones (FR-017); 40 combinations are
identifiable (short form allowed); claimed tiles show title and "Claimed by"; ticket cell sizes are the same or larger than the 003
baseline and at least 32 px (compare the `hz-ui.mjs metrics` output with the H8 table in `specs/003-housie-tambola-module/verification.md`);
no page scroll; popover still shows the full name.

## V3. Die (US3; FR-008 to FR-010)

Roll 10 times on a 1440x900 desktop and a 390x844 phone; screenshots at rest on faces 1 to 6 and mid-tumble.

Pass: white glossy body, clearly rounder corners than the previous look (side-by-side with a screenshot from before the change), pips
readable on every face, same result on every screen, tumble timing unchanged, reduced motion still white and readable.

## V4. Share text (US4; FR-019 to FR-021)

```powershell
npm run build
node server/dist/index.js    # then in another terminal:
(Invoke-WebRequest http://localhost:10000/).Content | Select-String 'description|og:|twitter:|<title>'
(Invoke-WebRequest http://localhost:10000/room/ludo/ABC123).Content | Select-String 'description|og:|twitter:|<title>'
```

Pass: both responses contain the new description in `description`, `og:description` and `twitter:description`, the title is
"myArena Hub", and no "Ludo" or "private room" appears in the head. After deployment, check a real preview (a chat app or a link-preview
checker) and record it; if not yet deployed, record it as pending.
