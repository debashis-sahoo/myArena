# Verification Record: Responsive Ludo Game Module

Browser-based visual verification (no new automated test suites, per the feature's policy). Each entry lists scenario, expected
result, observed result. Method: the production build served locally (`npm start`), one visible browser tab as the host (viewport
emulation for sizes and rotation) plus scripted Socket.IO guests for the other seats. Board sizes and scroll state are measured from
the DOM (bounding boxes), not judged by eye. Date: 2026-11-01.

Legend: PASS, PENDING (needs a person, a real device, or Render).

## T013 Foundational checkpoint

| Check | Expected | Observed | Result |
|-------|----------|----------|--------|
| `npm run build` and `npm run smoke` | Platform Core regression, 14 checks pass | All 14 pass with the new engine registered | PASS |
| Start a 2-player Ludo room | Both clients receive `match_started`; a refreshed tab's join acknowledgement carries `game` | Host and guest saw the match; after reloading the host tab and pressing Join, the board returned to the current state with no replay | PASS |

## T021 G1 Board fits every screen (US4; SC-001 to SC-003)

Measured after each viewport change (900 ms wait). "% of target" = board side / (landscape: smaller side of the board region;
portrait: smaller of region width and 85% of viewport height).

| Viewport | Mode | Board | Square | Fully visible | Page scrolls | % of target |
|----------|------|-------|--------|---------------|--------------|-------------|
| 320x568 | portrait compact | 280 | yes | yes | no | 93.3 (of 300) |
| 360x640 | portrait compact | 340 | yes | yes | no | 100 |
| 390x844 | portrait | 370 | yes | yes | no | 100 |
| 768x1024 | portrait | 718 | yes | yes | no | 96.0 |
| 1024x1366 | portrait | 1004 | yes | yes | no | 100 |
| 1440x1920 | portrait | 1420 | yes | yes | no | 100 |
| 568x320 | landscape compact | 266 | yes | yes | no | 100 |
| 667x375 | landscape compact | 321 | yes | yes | no | 100 |
| 844x390 | landscape compact | 336 | yes | yes | no | 100 |
| 932x430 | landscape compact | 376 | yes | yes | no | 100 |
| 1024x600 | landscape | 414 | yes | yes | no | 100 |
| 1366x768 | landscape | 678 | yes | yes | no | 100 |
| 1440x900 | landscape | 734 | yes | yes | no | 99.9 |
| 1920x1080 | landscape | 1018 | yes | yes | no | 100 |
| 2560x1080 | landscape | 1018 | yes | yes | no | 100 |
| 2560x1440 | landscape | 1378 | yes | yes | no | 100 |

- Chat column: arrow keys on the resize handle changed the width 320 to 416 to 224 and the board re-fit each time (582, then 706
  px at 768 high); collapse returned the width to the board; after a reload the collapsed state and the 224 px width were remembered
  (`localStorage`). PASS.
- Layout choice: widths from 320 to 559 in landscape orientation use the stacked (portrait) layout; a landscape phone is at least
  568 px wide, so no real device falls outside the three-column layout. A 320x240 window (no real device) is too short to hold the
  portrait chrome. Noted, not a defect for supported devices.
- Rotation and resize during a tumble or hop: with the viewport switched from 1366x768 to 390x844 (landscape to portrait) 0.5 s
  into a tumble, the message stayed "Rolling...", the board re-fit to 370 px, and the result face (6) and eligible pawns appeared
  on schedule; switching back to 1366x768 0.7 s into a 6-square hop re-fit the board to 706 px, the pawn finished at its
  destination (50 squares from home) and no animation was left running. PASS.
- Real-device rotation: PENDING (emulated viewports only).

## T030 G4 and G9 Rules and turn flow (US3; SC-009, SC-010, SC-012)

3 players (Yellow = host browser, Green and Blue = scripted guests), `LUDO_DEV_DICE=6,6,4,6,3,2,6,6,6`:

| Scenario | Expected | Observed | Result |
|----------|----------|----------|--------|
| Yellow 6, 6, 4 | 6 leaves the base (one hop to the start square) and rolls again; second 6 moves 6; 4 moves 4 and the turn passes | Pawn 1 at progress 10 (ring index 10), turn passed to Gina | PASS |
| Green 6, 3 | Leaves base, bonus roll, moves 3 | Green pawn 4 at progress 3 (ring index 16) | PASS |
| Blue 2 | No pawn can move; says so and passes | "Blu has no move", turn to Sparky Fox | PASS |
| Yellow 6 lands on Green's pawn | Capture, announcement, roll again | "Sparky Fox captured Gina's pawn", Green pawn back in base, "Captured! Roll again" | PASS |
| Next 6 then 6 | Third six in a row forfeits | "Sparky Fox rolled three sixes in a row and loses the turn", turn passed | PASS |
| Out-of-turn or wrong actions | Refused, nothing changes | Disabled controls on the client; the server refuses by phase and player (`It is not your turn`, `Roll first`, `That pawn cannot move`); schema has no die-value field | PASS |
| Countdown auto-play (`LUDO_TURN_MS=3000`, 15 s default) | Played within 1 s of 0:00 | 15 s default: `timeout` event 14:27:58.305 for a turn that began 14:27:43.304 (+15.001 s); 3 s: within 0.1 s | PASS |

2 players, `LUDO_DEV_SCENARIO=endgame`, `LUDO_DEV_DICE=3,2,5,1,3` (G9):

| Scenario | Expected | Observed | Result |
|----------|----------|----------|--------|
| Start state | Three pawns home and one needing exactly 6 | "Home: 3/4", pawn 4 "6 squares from home" | PASS |
| Roll 3 | The pawn walks into the lane, one hop per square | Three landings, all `lane yellow` squares | PASS |
| Roll 5 when 3 are needed | Pawn ineligible, "No pawn can move" | Message shown, no eligible pawns, turn passed | PASS |
| Roll 3 (exact) | HOME arrival with celebration, winner | Sparkle at 1.39 s, "You win!" overlay with standings 4/4 and 3/4 home | PASS |

## T036 G2 Turn highlight and the die (US1; SC-005, SC-007)

| Check | Observed | Result |
|-------|----------|--------|
| Active turn | Pulsing console border, golden border on the roll target, bouncing "Your Turn to Roll!" tooltip, 0:15 countdown; other players see "X's TURN..." translucent and not clickable | PASS |
| Inputs | Die click (clicked `.die`), ROLL DICE button and spacebar each rolled once; further input during the tumble is disabled (button disabled, message "Rolling...") | PASS |
| Tumble | 5 simultaneous animations for 1.4 s (cube spin on three axes, throw arc with bounces, shadow, blur 0 to 3 px and back, console shake); the face shown equals the server value in every roll (6, 6, 4, 3, 2...) | PASS |
| Die size | `--die` 80 px minimum on desktop, 64 to 100 px on phones (measured tray 91x80 at 64 px) | PASS |
| Rotation during a tumble | Resized 0.5 s into a tumble: re-fit, "Rolling..." kept, correct face afterwards (see T021) | PASS |
| Reduced motion | Roll is a 200 ms fade and scale pulse; no spin, blur or shake | PASS |

## T044 G3 Pawn hops and capture visuals (US2; SC-004)

| Check | Observed | Result |
|-------|----------|--------|
| Leaving the base | One hop onto the start square with a puff and landing flash | PASS |
| Roll of 6 | Exactly 6 landings (`landed` on 6 distinct squares) and 6 puffs, route glow ahead (6 squares) that shrinks per landing | PASS |
| Ineligible pawns | Not focusable, no click handler; eligible pawns pulse with a badge number | PASS |
| Capture | Victim pawn runs a 900 ms bounce (outer and inner animations) after the hops, with burst puffs, then rests in its base | PASS |
| Tap size on a 390 px phone | Every eligible pawn button measures 40x40 px | PASS |
| Other player's window | Guests received the same events in order (event log seq 1..14 identical timing: `moved` to next `turn` = hops x 340 + 250 + 500 ms) | PASS |

## T048 G6 Player panels (US5)

Observed: panels show avatar in colour, name, P-slot, host crown, "Home: n/4"; active panel glows and pulses; dropping a guest's
connection showed "Reconnecting" for everyone, rejoining and leaving showed "Left", pawns removed and the corner dimmed; with 2 or 3
players only their corners are lit and labelled (P1 (Host), P2, P3). PASS.

## T051 G7 Bots (US6; SC-008)

Play with AI, 3 bots, 60 s: each bot turn began with a pause of about 1.5 s before the roll (measured turn to roll: 1.4 to 1.6 s),
then the 1.4 s tumble, a legal choice with hops, and chat commentary the instant of the event ("Blaze is on fire with a 6!", "Zippy
has no move this time."). Bots never acted out of turn. PASS. A human win was observed in the G9 run.

## T055 G5 Guest connection, sync and chat in portrait (US7; SC-006, SC-011)

390x844 portrait: the board, turn, and timer matched the host; peek drawer collapsed (56 px handle) with an unread badge counting 5
guest messages; opening cleared it (drawer about 546 px tall of 844); half-typed text survived collapse and reopen; the Activity tab
listed events in order; unread appeared on the Chat tab while the Activity tab was open and cleared on returning. Reloading the
host mid-match restored the current state with no replay and the chat showed "lost connection / is back". PASS.

## T061 G8 Auto-play, away and removal (US8; SC-010)

`LUDO_TURN_MS=3000`, host idle: turn 1 and turn 2 auto-played; the warning banner appeared on the host after the second missed
turn; the third missed countdown ended with "You were removed for inactivity" 0.1 s later (seat released, pawns removed, the guest
continued and saw the removal and the last-player notice). In a Play with AI match the removal closed the room (`ai_owner_left`).
Acting manually resets the count (engine: `missed` set to 0 on every manual action). PASS.

## T062 / T063 Accessibility and reduced motion

- Live region announces the latest activity entry (turn changes, rolls, no move, captures, home, warnings, winner).
- Keyboard: Space rolls only on my turn and not from inputs, buttons, or while a dialog is open; Tab reached the eligible pawn after
  9 presses; Enter moved it; Lobby and Quit dialogs trap focus, close on Escape and return focus.
- Reduced motion: roll 200 ms fade, hop 120 ms steps with no puffs or arcs, capture is a quick fade, no shake or blur; pulses and
  flashes are disabled while eligible pawns keep a static glow ring. PASS.

## T064 Contrast and visibility

Computed WCAG ratios for 28 real colour pairs. All are at least 4.5:1 after one fix: red turn text (4.26) and the red slot label
(3.83) are now tinted 30% toward white (5.8 and 5.2). Lowest remaining: blue slot label 4.69 before tint, now 6.4. Corner labels (dark
ink on the four base colours) 5.1 to 11.9. PASS.

## T065 Performance (SC-014)

4x CPU throttle (Chrome DevTools protocol), 2-player match: during a tumble p50 17.6 ms, p95 18.2 ms; during a hop p50 17.5 ms, p95
18.2 ms; worst frame 35.5 ms once; 0 long tasks; puffs removed from the DOM after 450 ms. PASS.

## T068 Regression and development controls

- `npm run build`, `npm run smoke` (14 checks) and `npm run smoke -- --rooms 50` pass.
- `NODE_ENV=production` with `LUDO_DEV_DICE=6,6,6`, `LUDO_DEV_SCENARIO=endgame`, `LUDO_TURN_MS=1000`: startup warning
  "Ludo development controls are ignored in production" (all three names), countdown started at 0:14 (not 1 s), 8 pawns in their
  bases, "Home: 0/4", rolls 4, 3, 1 (random). PASS.

## T069 Complete quickstart pass

G1 to G10 were run on a desktop viewport and phone viewports in both orientations with 2, 3, 4 players and Play with AI (see the
sections above). SC-001 to SC-014 are met as recorded. Open:

- SC-007 (first-time player under 20 s) and SC-015 (reviewer sign-off against the reference image): PENDING, need a person.
- SC-008 bot pause measured from the live log (1.4 to 1.6 s), SC-005 spot-checked over about 25 rolls in these runs (shown face equals
  announced result every time) rather than 100 observed rolls: PENDING a longer observation if a formal count is required.
- Real device rotation and touch on hardware: PENDING.

## T070 Render deployment (G11)

PENDING. Depends on the Platform Core Render tasks T088 and T093 (feature 001), which are also pending. The Ludo feature adds
timers and a game channel on the existing WebSocket; the heartbeat keepalive is unchanged.

## T071 Constitution compliance review (v1.1.0)

| Principle or constraint | Result |
|-------------------------|--------|
| I. Render-first hosting | One process and port; no new services or environment variables in production. Dev variables ignored in production. Matches live in memory and end with the existing "room ended" screen on restart. PASS |
| II. Graphics-first | Board, pawns, die and panels are drawn UI; the layouts follow the reference. Reference-image sign-off pending (SC-015). PASS, review pending |
| III. Velocity and pragmatic verification | No new automated suites; deterministic checkpoints through development-only dice, scenario and timer controls; evidence recorded here. PASS |
| IV. Platform and game decoupling | Platform changes are game-agnostic (`GameContext`, colour assignment, action pipeline, match-screen hook); chat, lobby, invite, modal and status screens are reused. Ludo files live under `games/ludo`. PASS |
| V. Server-authoritative real-time | The server rolls dice, validates every action, owns timers and sends full snapshots; clients send only `roll` and `move`. PASS |
| Runtime and deployment constraints | Node 22, TypeScript, npm workspaces unchanged; same-origin Socket.IO; no secrets. Render verification pending |
| Development workflow gates | Spec, clarify, plan, tasks, analyze and remediation completed before implementation; verification recorded. PASS |

## Revision 2026-11-02: chat dock, rounded die, player bubbles

Requested changes: (1) chat below the dice section with a minimize option instead of a left column; (2) a bigger, rounded-edge die that
rolls more naturally; (3) smaller circular player cards to free space for chat.

- Landscape is now two columns: the board, and a right column with the dice console, the player bubbles, and the chat dock (Minimize /
  Open bar with an unread badge; the state is remembered; short landscape phones start minimized). Portrait keeps the peek drawer.
- Die: faces are three stacked rounded slabs (bevelled edges and corners); size `clamp(96px, 11vmin, 168px)` on desktop, 80 to 112 px in
  portrait, 64 to 72 px in the compact tiers; each tumble now travels across the tray in a random direction with decaying bounces
  and a forward tumble. A die posed at 38 degrees showed smooth rounded edges.
- Player cards are circular bubbles (avatar in a colour ring, host crown, n/4 badge, name underneath); the active ring pulses.
- Re-measured (board square and fully visible, page never scrolled, right column not overflowing, chat dock open or minimized):

| Viewport | Mode | Board | % of target | Dice / bubbles / chat dock (px high) |
|----------|------|-------|-------------|--------------------------------------|
| 320x568 | portrait compact | 300 | 100 | 104 / 56 / drawer |
| 360x640 | portrait compact | 340 | 100 | 104 / 56 / drawer |
| 390x844 | portrait | 370 | 100 | 124 / 76 / drawer |
| 768x1024 | portrait | 686 | 91.7 | 130 / 76 / drawer |
| 1366x768 | landscape | 706 | 100 | 269 / 76 / 340 |
| 1920x1080 | landscape | 1018 | 100 | 306 / 76 / 616 |
| 1024x768 | landscape | 658 | 100 | 269 / 76 / 340 |
| 1280x720 | landscape | 658 | 100 | 269 / 76 / 292 |
| 1024x600 | landscape | 538 | 100 | 144 / 76 / 298 |
| 568x320 | landscape compact | 248 | 100 | 104 / 56 / 44 (minimized) |
| 667x375 | landscape compact | 321 | 100 | 104 / 56 / 44 (minimized) |
| 844x390 | landscape compact | 336 | 100 | 104 / 56 / 44 (minimized) |
| 932x430 | landscape compact | 376 | 100 | 104 / 56 / 44 (minimized) |

- Spec, layout contract, quickstart and plan updated to match (FR-003, FR-004, FR-006, FR-009, FR-010, User Stories 4, 5 and 7).
- Not re-run after this change: the full G1 to G10 pass and the reduced-motion keyboard run; the roll and hop logic is unchanged.
