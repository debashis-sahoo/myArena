# Quickstart & Validation Guide: Responsive Ludo Game Module

Per the user's policy and constitution Principle III, there are **no new automated test suites**. Verification is direct, browser-based
play, recorded in `verification.md` (scenario, expected, observed, screenshots or measurements). The existing `npm run smoke` is re-run
once after the platform changes as a regression check. Commands describe the target project; they become runnable after implementation.

Linked design: [data-model.md](data-model.md), [contracts/](contracts/), [research.md](research.md).

## Setup

```powershell
npm install
npm run build
# development-only controls (ignored in production); set them before npm start:
$env:LUDO_DEV_DICE = "6,6,4,6,3,2,6"      # optional: fixed die values in order
$env:LUDO_DEV_SCENARIO = "endgame"        # optional: pawns start near HOME
$env:LUDO_TURN_MS = "3000"                # optional: 3 s countdown instead of 15 s
npm start                                  # http://localhost:10000
```

You need a desktop browser, a second window (use a private window for a separate guest), and a phone or device emulation for portrait and
rotation. Clear the three variables for normal play.

## Scenarios

### G1. Board fits every screen (US4; SC-001 to SC-003) - the spec's smoke test step 1

1. Create a room (Play Online), invite a second window, start the match.
2. Landscape desktop: confirm two columns (board left; dice console, player bubbles and the chat dock on the right) and no scrolling. Minimize
   and reopen the chat dock: the dock keeps its place under the bubbles and the board stays square. Reload: the minimized or open state is remembered.
3. Resize from small to very large and rotate a phone (or use emulation) between portrait and landscape. Portrait: board on top using the full
   width but not taller than 85% of the height, dice below, chat and activity in a peek drawer.
4. At 320x568, 360x640, 390, 768, 1024, 1366, 1440, 1920 and 2560 px wide, in both orientations, measure in the browser that the board's width equals its
   height, it is fully visible, and the page never scrolls (on 320x568 and 360x640 portrait the header, board, dice section, panels and drawer handle all
   fit). In landscape the board is at least 90% of the smaller side of its region.
5. Rotate during a die tumble and a hop: the animation finishes cleanly and state is unchanged.

### G2. Turn highlight and the die (US1; SC-005, SC-007) - smoke test step 2

1. On P1's screen: the golden border, "Your Turn to Roll!" tooltip, enabled ROLL DICE and a countdown from 0:15. On P2's screen the console
   shows "P1's TURN..." translucent and non-interactive.
2. Roll with the die (click), then with the spacebar, then with the ROLL DICE button on later turns: each tumbles (bounces, spins on all
   axes, settles flat) with a moving shadow, motion blur, and a short shake. Clicking again mid-tumble does nothing.
3. Both screens show the same face. The die is at least 96 px on desktop (64 px on a short phone), has rounded edges, and each roll travels across
   the tray in a random direction before settling.
4. Let the countdown run out once: the game rolls for you within 1 s and shows the tumble.

### G3. Pawn hops (US2; SC-004) - smoke test step 3

1. Start with `LUDO_DEV_DICE=6,4,...`: roll a 6 (a pawn hops onto the start square), then a 4: select the pulsing pawn and count exactly four
   separate hops with a dust puff and squash on each landing, the route highlighted ahead, no sliding or teleporting.
2. Confirm ineligible pawns do not respond to taps and eligible ones pulse. On a phone, tap pawns on a small board reliably.

### G4. Rules: capture, safe squares, bonus rolls, three sixes (US3)

Use a 3-player match (Yellow, Green, Blue) and `LUDO_DEV_DICE=6,6,4,6,3,2,6`:

1. Yellow: 6 (leave base, roll again), 6 (move that pawn 6, roll again), 4 (move 4 more to 10 squares from its start; turn passes).
2. Green: 6 (leave base, roll again), 3 (move 3 squares; turn passes). Blue: 2 (no pawn can move; the game says so and passes).
3. Yellow: 6, choose the pawn that lands on Green's pawn: it is captured with the explosive bounce back to Green's base, the capture is announced,
   and Yellow rolls again. Landing on a star or start square holding an opponent captures nothing.
4. Three sixes in a row (`LUDO_DEV_DICE=6,6,6,...`): the third gives no move and the turn passes.
5. Try acting out of turn from the second window: refused, nothing changes.

### G5. Guest connection, sync and chat in portrait (US7; SC-006, SC-011) - smoke test step 4

1. On a portrait phone window join by the invite link; confirm the board, turn, timer and dice match the host's screen within 1 s.
2. Open the peek drawer, send a message, confirm it arrives on the host immediately; collapse it and confirm the unread badge for new messages.
3. Switch to the Activity tab: rolls, moves and captures appear in order.
4. Refresh the guest's page during the match: it returns to the current state at once, without replaying earlier moves.

### G6. Player bubbles (US5)

Confirm each circular bubble shows the avatar in a colour ring, name, host crown, an "n/4" home badge and connection text; the active player's ring glows;
close one window: "Reconnecting" appears for everyone, then "Left" after the 60 s window (or after leaving), the pawns disappear and play continues.

### G7. Bots (US6; SC-008)

Play with AI (1 to 3 opponents; the host presses Start in the lobby, there is no auto-start). On each bot turn: about 1.5 s pause, a natural tumble, a sensible pawn choice, hop-by-hop movement, and a short
chat comment (6s, captures, pawns home). Bots never act out of turn.

### G8. Auto-play, away and removal (US8; SC-010)

With `LUDO_TURN_MS=3000`: do nothing on your turn: the game plays it within 1 s of 0:00 and notes it. After two missed turns a warning appears
on your screen; after the third you are removed (announcement; your pawns disappear; the others continue; you see "removed for inactivity").
Acting manually before the third resets the count. In a Play with AI match the removal ends the match.

### G9. Endgame and winner (US3; SC-012)

With `LUDO_DEV_SCENARIO=endgame`: a pawn at progress 50 needs exactly 6 to finish: smaller rolls walk it into the lane (hopping each square),
larger-than-needed rolls make it ineligible, and HOME arrival triggers the celebration and the "Home: n/4" update. The fourth pawn home announces
the winner to everyone with standings.

### G10. Reduced motion and accessibility (SC-013)

Enable "reduce motion": rolls fade to the result, pawns step square to square, no shake or blur; everything remains understandable. Operate the
whole turn with the keyboard (spacebar rolls; Tab to an eligible pawn; Enter moves). Check contrast and focus rings.

### G11. Regression and deployment

1. `npm run build; npm run smoke` still passes (14 checks) after the platform changes.
2. On Render, with the three development variables unset: repeat G1, G2, G3 and G5 over HTTPS, then a 4-player match to the end, and a
   redeploy during a match (expect the existing "room ended" screen). Record anything not yet possible as pending.

## Pass criteria

All scenarios behave as described on a desktop and a phone-sized viewport in both orientations, and the Render checks pass or are recorded as
pending. This satisfies SC-001 to SC-015 in [spec.md](spec.md).
