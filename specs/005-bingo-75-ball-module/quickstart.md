# Quickstart & Validation Guide: Bingo (75-Ball) Visual-First Game Module

Per the user's policy and constitution Principle III there are **no new automated test suites**. Verification is direct, browser-based play recorded in
`verification.md` (scenario, expected, observed, screenshots or measurements). The existing `npm run smoke` is re-run once after the shared changes as a
regression check. Commands describe the target project and become runnable after implementation.

Linked design: [data-model.md](data-model.md), [contracts/](contracts/), [research.md](research.md). The spec's five owner checkpoints
(spec Appendix B) map to V2 (cards and FREE), V3 (ball console), V6 (chat) and V4 (claims).

## Setup

```powershell
npm install
npm run build
# development-only controls (ignored in production); set before npm start:
$env:BINGO_DEV_DECK = "first-card"       # optional: first draws complete the first player's first card (top row first, then row by row)
$env:BINGO_DEV_BALLS = "54,7,19"         # optional: fixed start of the call order
$env:BINGO_DEV_CARD_AUDIT = "500"        # optional: log a card-validity audit at start-up
$env:BINGO_CLAIM_PACE_MS = "300"         # optional: shorter claim pace for quick manual checks
$env:BINGO_MAX_PLAYERS = "200"           # optional: room player ceiling (default 200)
npm start                                  # http://localhost:10000
```

You need a desktop browser, a second window (a private window gives a separate guest), device emulation for phone and tablet in both orientations, and a
helper Node script that joins N scripted guests to a room (as used for Ludo and Housie; kept in a temp folder, not committed). Clear the variables for
normal play.

## Scenarios

### V1. Host setup (US1; SC-001)

1. The Hub shows Bingo as playable (no "Coming Soon"); open it and choose Play Online. Confirm the lobby defaults: card ceiling 1, "I also play" on, manual
   calling, three patterns ticked (Single Line, Four Corners, Blackout).
2. Time creation to Start with defaults (under 10 s) and with every setting changed (under 60 s).
3. Open the chooser: 27 pictures in four groups (Standard, Letters, Shapes, Multi-line), group toggles, counter "n of 27" (3 of 27 by default). Untick all and press Start: refused with
   "Pick at least one pattern". With nobody else seated, Start is refused ("At least 2 players are needed to start." from the platform; the lobby also shows
   "Wait for at least one more person."). Press all four "All" toggles: "27 of 27"; "Reset to defaults": "3 of 27". The chooser scrolls inside its panel; the page does not.
4. Join a second window. Lower the limit below the seated count: refused. Lower the ceiling below a player's choice: the choice is clamped and that player
   sees the notice.
5. Set the limit to 200 with the preset: accepted; 201 clamps; `BINGO_MAX_PLAYERS=50` makes 50 the maximum, and `HOUSIE_MAX_PLAYERS` still governs Housie.

### V2. Cards, FREE space and daubing (US2, US3; SC-002 to SC-004)

1. With ceiling 3, change a player's card count between 1 and 3: the host sees each change within 1 s.
2. Start the match; inspect each card: B 1-15, I 16-30, N 31-45 (four numbers plus FREE in the centre), G 46-60, O 61-75, no repeats. With
   `BINGO_DEV_CARD_AUDIT=500` the server log reports 500 of 500 valid and unique. Compare two players' cards and one player's three cards: all different.
3. Look at the centre of a new card: it reads FREE and is already stamped with the dauber; nothing is shown over it. Tap FREE (and press Enter and Space on it
   with the keyboard): nothing changes. Tap a number cell next to it: it daubs as usual. Reload: FREE is still marked on every card.
4. Draw a ball that is on your card: the cell stays unmarked. Tap it: neon translucent dauber with the stamp animation and the number still readable. Tap
   again: removed. Tap an uncalled number: it daubs with no message. Reload: daubs are restored.
5. Keyboard: Tab into a card, arrows between cells, Enter and Space toggle number cells (FREE ignores them).
6. With 2 and 3 cards at 1280 x 720 and 390 x 844: every card reachable (stack, row or tabs), every cell at least 40 px (measure in the browser), the card
   in view named and gold-outlined.

### V3. Caller and ball console (US4; SC-005 to SC-007)

1. Manual: press DRAW NEXT BALL repeatedly. On a player's screen each ball rolls in within 1 s showing letter above number ("G-54"), the history grid fills
   newest first with "Called n of 75", and the host's master board lights the same numbers under the right letters. Check one ball from each range
   (1-15 B, 16-30 I, 31-45 N, 46-60 G, 61-75 O).
2. Auto at 5, 8 and 10 s: measure ten intervals each (within 0.5 s); pause, resume, change interval, return to manual. Close the host tab: draws continue
   during the reconnect window.
3. Scripted: a host client sends `draw` 75 times (spaced out): each number appears exactly once; the 76th is refused; calling ends and the match finishes.
4. "View all" on a player's ball console opens the full board with every called number lit.
5. Reduced motion (OS setting or emulation): the ball fades in; letters and numbers stay clear.

### V4. Claims (US5; SC-008, SC-009)

1. With `BINGO_DEV_DECK=first-card`, as player 1: after the first five draws (top row) daub those five numbers and press BINGO!. Single Line
   flips to "Claimed" with your name on every screen with the celebration. Four Corners and Blackout stay Available.
2. Bogus: press BINGO! with a pattern not complete: only you see "Bogus Bingo"; other screens and the chat are unchanged. Called but not daubed: bogus.
   Daubed but not called: bogus. A pattern that needs the centre (choose Letter X in the lobby for this check) with one other cell not yet called: bogus; with every
   other cell called and daubed and FREE never touched: awarded.
3. Too late: after Single Line is claimed, press BINGO! again with only the top row: "Too late - already claimed", no penalty, the bogus count is
   unchanged.
4. Multi-pattern: continue to a full card (24 draws, FREE needs nothing) and claim: Four Corners and Blackout are awarded in the one claim and both tiles flip together.
5. Race: two windows press BINGO! for the same open pattern at the same moment (scripted): exactly one `claimed` includes it; the other gets "Too late".
6. Pace and lock: press BINGO! repeatedly: at most one evaluation per 2 s (default pace). Make three bogus claims in a row: the third starts a 1-minute lock
   with "Paused" and a countdown on that player's button only; claims are refused until it ends; a valid claim before the third bogus one resets the count.
7. Multiple cards: with two cards, daub a line on card 2 but leave card 1 selected and press BINGO!: bogus (only the selected card is checked); select
   card 2: accepted. The button reads "BINGO! - Card n".
8. No deadline: complete a pattern, draw several more balls, then claim: accepted. Timing edge: a claim sent just before the ball that would complete the
   pattern is drawn is bogus (only numbers called before the server received it count).
9. A non-playing host sees pattern status but no BINGO! button and no cards.
10. All 27 patterns: with `BINGO_DEV_DECK=first-card` the host's card is called row by row (FREE skipped), so cell `i` is called at draw `i + 1` for `i` below 12 and
    at draw `i` after the centre. Choose all four groups ("27 of 27"), start, and after each draw daub the new number and press BINGO! only when a pattern is due. Expected
    awards: draw 5 Single Line; 7 Postage Stamp; 10 Two Lines; 18 Inner Square; 19 Railroad Tracks; 20 Kite; 22 Letter T, Letter Y, Diamond, Plus Sign and Heart; 24 the
    other 16 (Four Corners, Letter X, L, H, Z, N, C, U, I, Blackout, Picture Frame, Pyramid, Checkers, Sandwich, Four Stamps, Dice Five) in one claim. The results list then has 27 rows and scrolls
    inside its panel.

### V5. Match end and new round (US8; FR-030)

1. Claim every chosen pattern: calling stops and everyone sees the results screen (pattern, winner, "Called n of 75"). Repeat by calling all 75 balls with
   one pattern unclaimed: it shows "No winner".
2. With only a non-playing host and one player: the player quits mid-match; the match ends at once with the results screen for the host.
3. Host presses New round: everyone returns to the lobby with ceiling 1, default patterns, manual calling, host plays on, every card count 1; the room's
   player limit is unchanged.

### V6. Pure chat (US6; SC-010)

1. Exchange messages between two windows: both see them with name and color.
2. Draw balls, make a bogus claim and a valid claim, join and leave a third window during the match: the chat stream shows none of it. Before Start, the
   lobby chat still shows the usual join and leave lines and they stop at Start.
3. On a phone-size screen, close the chat sheet and send a message from the other window: the Chat button in the header shows an unread pill with a count that grows and clears on
   open. Half-typed text survives closing the sheet.
4. Send text containing markup or very long content: shown as plain text, length-limited.

### V7. Layout and visuals (US7; SC-011 to SC-014)

1. At 320 x 568, 390 x 844, 667 x 375, 844 x 390, 768 x 1024, 1024 x 768, 1366 x 768, 1920 x 1080 and 2560 x 1440 (player and host, with 1 and 3 cards): no page
   scroll, no overlap or clipped control, card cells at least 40 px, text at least 11 px, the playing area using at least 90 percent of the viewport apart
   from the header and gaps. Rotate and resize: the layout re-fits within 0.5 s. Record screenshots.
2. Landscape proportions: ball console about one third and chat about two thirds of the right column; cards above the dashboard on the left.
3. Quiet state: nothing animates except the ambient background, the ball glow and the BINGO! glow.
4. Reduced motion: every effect has its simple replacement; all information remains.
5. Keyboard and focus: every control reachable with visible focus; screen-reader names for cells ("B 7", "FREE"), the ball and badges.
6. First-time player (someone who has not seen the game) finds a called number, daubs it and claims within 2 minutes without help (SC-013).

### V8. Reconnect and host handover (FR-042, FR-043)

1. Reload a player mid-match: same cards, daubs, call history, current ball, pattern statuses, and a claim lock still counting down.
2. Close a player's tab for more than the reconnect window: the seat is released, their cards stop playing, patterns already won stay claimed, and they
   cannot rejoin that match.
3. Host disconnects during auto calling: draws continue. Release the host's seat: the platform hands over host; the new host has the caller controls and
   calling continues.

### V9. Large room (SC-015)

1. With scripted guests fill a room to 200 (3 cards each at the ceiling), start, and run 20 draws at 5 s: every connected screen receives each ball within
   1 s in 95 percent of draws; the server process stays well under 512 MB; `room:state` messages are coalesced.

### V10. Regression and deployment

1. `npm run smoke` passes. A quick Ludo match and a Housie lobby plus a few draws behave as before (chat lines, colors, layout).
2. Deployment on Render: startup, readiness, WebSocket connectivity and reconnect after replacement are verified on the deployed service; anything not
   yet run is recorded as pending in `verification.md` (local checks are not presented as deployment verification).
