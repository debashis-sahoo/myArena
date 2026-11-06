# Verification Evidence: UNO Multi-Player & AI Game Module

Recorded while implementing `specs/006-uno-game-module/` (constitution Principle III: scenario, expected, observed; no new automated suites).
Date: 2026-11-05, with a convergence pass on 2026-11-06 (T091 to T095, `r15-*` and `r16-*`). Everything below ran locally; **V13 (Render) and the human checks (SC-017, real-phone smoothness) are pending** and are not claimed as passed.

## Method and environment

- **Built bundle, real server.** Every check ran against `node server/dist/index.js` (which also serves `client/dist`), started on its own port per scenario,
  with the development-only controls `UNO_DEV_DECK` (`wild`, `reverse`, `uno`, `stack`, `short-pile`, `endgame`), `UNO_DEV_BOT_MS`, `UNO_DEV_TURN_MS`,
  `UNO_DEV_FORGET` and `RECONNECT_WINDOW_MS` where a scenario needed them.
- **Browser checks.** Throwaway Playwright scripts outside the repository (Microsoft Edge, one browser context per person at the exact viewport size; touch checks
  used `hasTouch` and `touchscreen.tap`). Sizes and timings below are DOM measurements from those runs; the screenshots they saved are in `evidence/`.
- **Scripted Socket.IO checks.** Node scripts outside the repository played whole matches and recorded every `game:event` and acknowledgement.
- **Evidence files.** `evidence/r1-*` (V1, V2), `r2-*` (V4 to V7, two windows), `r3-*` (size sweep), `r4-*` (countdown), `r5-*` (V3), `r6-*` (V5, V6),
  `r7-*` (V7, V8), `r8-*` (V9 after the final fixes), `r9-*` (V10), `r10-*` (V11, V12), `r11-*` (regression), `r12-*` (Play again with one left),
  `r14-*` (final wheel and catch check), `r15-*` (lobby Leave no longer re-joins), `r16-*` (card pips and the online table at 1024x768, 768x1024 and 1366x768), `r17-*` (switching rooms inside one page and Leave).
  Screenshots were converted to JPEG to keep the repository small.
- **Order of work.** The first runs (r1 to r4) were followed by a fix pass (layout slice and track clearance, card index size, catch control timing, wheel backdrop,
  banner layer, refusal pill, chevrons, lobby panel, UNO art in the lobby; see "Defects found and fixed"). V9, V10, V11, V12, the regression and the final wheel and
  catch checks (r8 to r14) ran on the final build. The size sweep `r3-*` was taken before the polish; r8 re-measured three sizes afterwards.
- `npm run build` and `npm run smoke` pass on the final tree ("All checks passed"); the smoke script includes an UNO AI-room assertion.

## Summary

| Scenario | Spec / tasks | Result |
|----------|--------------|--------|
| V1 Solo start | US1; T031 | PASS |
| V2 Online lobby, join, Start | US2; T067 | PASS |
| V3 Fill empty slots with AI | US2; T067 | PASS |
| V4 Legal and illegal moves, draw and keep | US3; T043 | PASS (23 of 24 first run; the one FAIL was fixed and re-checked in V7) |
| V5 Wild and the colour wheel | US4; T051 | PASS (mouse, keyboard and touch) |
| V6 Skip, Reverse and the arrows | US4; T051 | PASS (flip about 0.50 s from the click, see SC-006) |
| V7 Stacking and penalties | US4; T051 | PASS |
| V8 UNO! and catching | US5; T062 | PASS |
| V9 Layouts, sizes, reduced motion, performance | US6; T078, T080 to T082, T083 | PASS with the limits listed below; phone performance pending |
| V10 Countdown, departures, forfeit, reconnect | US9; T077 | PASS |
| V11 Privacy audit | T085 | PASS (556 payloads, 0 violations) |
| V12 Chat, end of match, Play again, regression | US8, US9; T070, T077, T087 | PASS |
| Scripted engine sweep | US7; T054 | PASS (104 matches, 4 online matches, 77 illegal actions) |
| Production behaviour | T086 | PASS |
| V13 Render | T089 | **Pending** |
| Human stopwatch (SC-017) | T090 | **Pending** |

## V1. Solo start (US1; SC-001)

| Scenario | Expected | Observed | Result |
|----------|----------|----------|--------|
| Hub tile | active UNO tile with art and tagline in the same grid | "ACTIVE" badge, tagline, art, five tiles | PASS |
| Launch modal | exactly "Play with AI" and "Play Online"; no room exists yet | two choices; `rooms=0` while open | PASS |
| Escape, Close, tap outside | modal closes, nothing created, focus returns to the tile | all three close it with `rooms=0`; focus back on the tile button | PASS |
| Keyboard | focus lands inside and Tab stays in the dialog | confirmed | PASS |
| Opponent step | 1 to 4 offered, 3 preselected, "Start vs 3 bots" and Back | exactly that; Back returns to the two-action step | PASS |
| Start with 1, 3 and 4 bots at 1366x768, 390x844, 320x568, 844x390 | table in under 2.5 s, N opponents, 7 cards, face-up first card, no invite link, no Copy, no chat, no Start button | table after 59 to 105 ms; counts correct; seat placement matches the contract for 1, 3 and 4 opponents; no page scroll | PASS (one row looked like a failure: with a Draw 2 as the first card the first player holds 9 cards, which is the rule) |
| Evidence | screenshots at four sizes | `r1-v1-*-1366x768.jpg`, `-390x844.jpg`, `-320x568.jpg`, `-844x390.jpg`, `r1-v1-modal-1366x768.jpg`, `r1-v1-ai-picker-1366x768.jpg`, `r1-v1-hub-1366x768.jpg` | |

## V2 and V3. Online lobby, join, Start, Fill with AI (US2; SC-002)

| Scenario | Expected | Observed | Result |
|----------|----------|----------|--------|
| Capacity step | 2 to 5, 4 preselected, no room yet | exactly that | PASS |
| Lobby | five slots, host in Slot 1, invite link `/room/uno/{id}`, Start disabled with a reason, Copy confirms and fills the clipboard | all seen; "Need at least 2 players to start" | PASS |
| Guest joins | in the host lobby within 2 s; Start enables | slot 2 filled after 61 ms | PASS |
| Guest view | no host controls, "Waiting for the host to start the match." | confirmed | PASS |
| Lower capacity below the seated count | refused with a message | "To lower the player count below 3, remove a player first." | PASS |
| Lobby chat | join, leave and capacity lines before the start | present | PASS |
| Start with 2 seated | both windows enter the match together with two players | both within 80 ms (the first run counted three seated humans by mistake; re-run clean) | PASS |
| Fill with AI | offered to the host only, confirm step, Cancel keeps the lobby, Confirm seats a bot in every open slot and starts at once | all as specified, host alone and host plus one guest; Fill gone afterwards | PASS |
| Third window after the start | clear message, no crash | "Match in progress" | PASS |
| Lobby layout | no seat row clipped by the host controls | fixed (see "Defects"); capacity 4 and 5 at 1366x768 and 1024x768 | PASS |
| Evidence | | `r1-v2-*.jpg`, `r5-v3a-fill-confirm.jpg`, `r5-v3a-solo-match.jpg`, `r5-v3b-*.jpg`, `r5-v3c-third-window.jpg` | |

## V4. Legal and illegal moves, draw and keep (US3, SC-003, SC-004)

Two windows at 1366x768, plus a 390x844 touch repeat. 23 of 24 checks passed in the first run:

| Scenario | Expected | Observed | Result |
|----------|----------|----------|--------|
| Matching card | throw animation, both windows agree within 1 s | agreement checks at draw and play points; latency under 1 s | PASS |
| Non-matching card | bounce, shake and a one-line reason within 0.5 s | reason "That card does not match." | PASS |
| Out of turn | refused, nothing changes on any screen | card and draw both refused; state unchanged | PASS |
| Double tap | plays once | one play | PASS |
| Draw with a playable card, keep or play the drawn card | Keep ends the turn; a playable drawn card can be played; an unplayable one passes at once | all three paths seen | PASS |
| Keyboard | focus ring, Enter plays | confirmed | PASS |
| Reshuffle (`short-pile`) | top card, active colour and counts agree afterwards | `r2-v4-shortpile-*.jpg` | PASS |
| Refusal reason clears by itself after 2.5 s | gone from the page | the first run FAILed (the hidden screen-reader copy stayed 6 s); fixed; re-measured 2.52 s for both the visible line and the screen-reader copy (V7) | PASS after fix |
| Evidence | | `r2-v4-*.jpg` | |

## V5. Wild and the colour wheel (US4; SC-005)

| Scenario | Expected | Observed | Result |
|----------|----------|----------|--------|
| Tap a Wild | wheel in the centre within 0.2 s, four labelled wedges (name, glyph and number key) | 25 to 28 ms after the final fixes; wedges 196x196 at 1366x768 and 157x157 at 390x844; no page scroll | PASS |
| Choose a colour | card plays, aura and "Active colour" label change on every screen within 1 s | label changed in the same frame; the guest window follows | PASS |
| Escape, Cancel, backdrop | wheel closes, card returns, nothing played | all three | PASS |
| Keyboard | focus on the first wedge, arrows and Enter, number keys 1 to 4 | confirmed | PASS |
| Touch (`hasTouch`) | tap opens and keeps the wheel open; tap a wedge plays | confirmed on the final build (r14) | PASS |
| Wild Draw 4 | wheel titled "Wild Draw Four: pick a colour"; the next player draws 4 and loses the turn | pile 79 to 75, victim 6 to 10 cards, turn moved on | PASS |
| Next player limited to the chosen colour | only that colour or a Wild | `r2-v5-guest-restricted.jpg` | PASS |
| Look | wheel readable, in the viewport | high contrast with shapes and names; it covers most of the discard pile because the contract places it in the centre (see "Known limits") | PASS |
| Evidence | | `r2-v5-*.jpg`, `r6-v5-*.jpg`, `r14-w1-wheel-open.jpg` | |

## V6. Skip, Reverse and the arrows (US4; SC-006)

| Scenario | Expected | Observed | Result |
|----------|----------|----------|--------|
| Reverse with 2 players | acts as Skip (the same player plays again) | the human played again after 469 ms | PASS |
| Reverse with 3 and 4 players | arrows flip; the turn passes to the other neighbour | clockwise to counter-clockwise; the next turn went to the right-hand seat | PASS |
| Flip time | within 0.5 s with the flare | 494 ms (2 players), 505 to 510 ms (4 players), measured from the click including the throw and harness overhead | PASS (borderline, see SC-006) |
| Skip, Draw 2 | the next seat is skipped / draws 2 | "Skipped!" banner and the turn step; Draw 2 gave the next seat +2 | PASS |
| Reduced motion | direction badge changes at the same moment, no flare | `r2-v6-reduced-*.jpg`; badge text "Clockwise" | PASS |
| Evidence | | `r2-v6-*.jpg`, `r6-v6*.jpg` | |

## V7. Stacking and penalties (US4; SC-020)

| Scenario | Expected | Observed | Result |
|----------|----------|----------|--------|
| Draw 2 stacking | only a Draw 2 stacks; the running total is visible and grows | badge 2 then 4; the victim who cannot stack drew 4 | PASS |
| Wild Draw 4 stacking | only a Wild Draw 4 stacks | badge 4 then 8; the victim drew 8 (`r2-v7-plus8-host.jpg`) | PASS |
| Other kind while a total is pending | refused with a reason | "Play a matching draw card or draw the cards." | PASS |
| Unavoidable penalty | about 0.9 s beat for a human victim | badge to hand growth 1.33 to 1.37 s on screen (the 0.9 s server beat plus the client animation queue) | PASS |
| Touch at 390x844 | same results | confirmed | PASS |
| Evidence | | `r2-v7-*.jpg`, `r7-v7*.jpg` | |

## V8. UNO! and catching (US5; SC-007, SC-008)

| Scenario | Expected | Observed | Result |
|----------|----------|----------|--------|
| Early call at 2 cards | no penalty, UNO! badge after the play | badge "UNO!"; nobody can catch | PASS |
| Forgotten call | Catch control on the bot seat for the 5 s window; catch gives exactly 2 cards with "Caught!" | after the final fix the control is visible 5000 and 5004 ms (r14); the bot went from 1 to 3 cards | PASS |
| Late call inside the window | control disappears; no penalty | confirmed | PASS |
| Second catch | refused or absent | absent | PASS |
| Human forgets, bot catches | draws 2 with a visible message, after 2.0 to 3.5 s | 2.07 s (server without the dev delay) | PASS |
| `UNO_DEV_FORGET` `always` and `never` | bots never / always call | 7 windows opened and 0 UNO! events in `always`; 7 UNO! events and 0 windows in `never` | PASS |
| Two catches together, UNO! at 3 cards | one penalty only; "Not yet" | engine check (t3) | PASS |
| Evidence | | `r7-v8-*.jpg`, `r14-u1b-catch-control.jpg` | |

## V9. Layouts, sizes, reduced motion, performance (US6; SC-010 to SC-012, SC-018, SC-019)

Size sweep with 4 opponents (`r3-*`, before the polish) and a re-measurement at three sizes after it (`r8-*`):

| Size | Piles (px) | Piles and track share of height | 7-card slice | No page scroll, all inside | Result |
|------|-----------|---------------------------------|--------------|----------------------------|--------|
| 320x568 | 94x136 | 55% | 42 px (after the fix; 37 to 39 before) | yes | PASS |
| 390x844 | 159x231 | 62% | 44 px | yes | PASS |
| 1366x768 | 305x442 | 66% | 57 px | yes | PASS |
| 360x640, 667x375, 768x1024, 800x600, 844x390, 1024x768, 1920x1080, 2560x1440 | see the `r3-*.jpg` images | 55% and above | at least 40 px | yes | PASS (sweep before the polish) |

| Scenario | Expected | Observed | Result |
|----------|----------|----------|--------|
| Rotate or resize live (1366x768, 390x844, 844x390, back, twice) | re-fit within 0.5 s, state unchanged | settled in 28 to 141 ms; hand, top card and counts unchanged | PASS |
| 25 and 30 card hands | fan tightens and scrolls inside its band; page never scrolls | band scrolls from 12 cards at 390x844; 0 unreachable cards; page never scrolled | PASS |
| 5 players (host plus 4 AI) | four opponents placed correctly | placed top and sides; `r8-5player-1366x768.jpg` | PASS |
| Reduced motion | all information available; no running infinite animation | 0 infinite animations; direction badge, "+N", wheel, active colour labels all visible; a play completes in 27 ms | PASS |
| Performance (SC-018) | 95% of frames at or under 20 ms | headless Edge, 40 s match: p95 18.1 ms with 0.0% over 20 ms at 1x; p95 18.3 ms with 1.2% over 20 ms at 4x CPU slowdown | PASS on the laptop; phone result pending |
| Evidence | | `r3-*.jpg`, `r8-*.jpg` | |

Convergence pass (2026-11-06), after the pip change and with chat docked (online room, host window; `r16-*.jpg`):

| Size | Branch | Centre area | Piles | Track share of height | Hand card | 7-card slice | Result |
|------|--------|-------------|-------|-----------------------|-----------|--------------|--------|
| 768x1024 | portrait (`W' = 516`) | 396x659 | stacked, 196x284 | 63.8% | 106x154 | 59 px | PASS, no scroll or clipping |
| 1024x768 | portrait (`W' = 772 < 1.3 H`) | 648x466 | side by side, 274x397 | 59.8% | 79x115 | 59 px | PASS, no scroll or clipping |
| 1366x768 | landscape (`W' = 1054`) | 888x510 | side by side, 305x442 | 65.6% | 79x115 | 58 px | PASS (a rotated hand card's box touches the track by 1 px) |

The budget table in `contracts/match-screen-layout.md` was corrected to these numbers (T093), and the remaining rows (320x568, 390x844, 667x375, 844x390, 1920x1080) and the hand-band rule
were corrected from the layout function in `useFit.ts` (T097; for example 320x568 is centre 200x319, stacked piles 94x136, 55%). Corner colour pips and the centre pip now render at 11.15 to 11.3 px or more at 320x568,
390x844, 667x375, 844x390 and 1366x768, with no overlap of a pip and the centre numeral; the smallest cards (64 px tall) look dense but clean (T094, `r16-hand-zoom-844x390.jpg`).

## V10. Countdown, departures, forfeit, reconnect (US9; SC-016)

| Scenario | Expected | Observed | Result |
|----------|----------|----------|--------|
| Countdown (`UNO_DEV_TURN_MS=3000`) | first miss draws one and passes; warning after the second; release after the third | auto-draw at 3.07 s and 3.16 s; "One more missed turn and you are out"; removal screen at 2.9 s ("removed for inactivity") | PASS |
| Timeout while holding a drawn playable card | card kept, no missed turn | confirmed (`r4-a2-*.jpg`) | PASS |
| Window closed mid-match | others continue; leaver's cards go back to the pile; seat shows "Left" and is skipped | draw pile 86 to 93, 108 cards in total, "Left" chip at 5.2 s, the seat skipped in the sequence | PASS |
| Two humans, no bots, one leaves | the remaining player wins | win at 5.1 s (after the reconnect window; an explicit Leave is at once) | PASS |
| Reload within the window | same table, own hand, turn and direction within 2 s, no animation replay | hand visible after 92 ms; no ghost or flare elements | PASS |
| Past the window | seat released; invite link answers "match in progress" | confirmed | PASS |
| Host leaves a lobby | a guest becomes host with controls | confirmed | PASS |
| Guest presses Leave in a lobby (UNO, Ludo, Housie, Bingo), after the T091 fix | the host lobby shows the seat open at once; no "RECONNECTING" row, no later "joined" line | seat freed in 4 to 11 ms in all four lobbies; nothing re-appeared over the next 4 s; before the fix the leaver re-joined as a ghost seat for the reconnect window | PASS |
| Re-open the invite link after leaving; second Leave | joins normally; seat frees again | confirmed | PASS |
| Leave in a match (dialog, confirm) | host sees "Left"; the leaver is on the Hub | confirmed | PASS |
| Switch rooms inside one page (A to B by in-app navigation, Back to A, Forward to B; T096) | the tab is seated in each room in turn; the room left shows the seat freed; no error screen | all three seatings worked with no reload (before the fix the join was cut off and the tab ended on "Something went wrong" with the host of B showing a RECONNECTING seat) | PASS |
| Missing room, then Back and reopen (T096) | friendly "Room not found" with Back to Hub; reopening the first room's link joins normally | "Room not found"; seated again in 686 ms | PASS |
| Leave then create a room within 150 ms (solo and online) | the create succeeds | both created; no timeout | PASS |
| Evidence | | `r4-*.jpg`, `r9-*.jpg`, `r15-*.jpg` | |

## V11. Privacy audit (FR-021, SC-015)

Three scripted clients in one room (plus bots), including a reload; 556 payloads and 3,644 card references inspected.

| Check | Result |
|-------|--------|
| No payload carries a card id from another seat's hand before it is played | **PASS** (0 violations) |
| No payload exposes the Draw Pile order | **PASS** (only `drawCount` and `discardCount`; the `reshuffled` flag is a boolean) |
| `draw` events to others carry `count` and no `cards` | **PASS** (48 of 48 events to others without cards; own 24 of 24 with cards) |
| `table.players[].handCount` equals the real hand length; 108 cards accounted for | **PASS** (1,404 comparisons, 468 conservation checks, 0 mismatches) |
| No sequence gaps, table errors or refusals | **PASS** |

## V12. Chat, end of match, Play again, regression (US8, US9; SC-013, SC-014)

| Scenario | Expected | Observed | Result |
|----------|----------|----------|--------|
| Online chat | only typed messages; none for plays, UNO!, catches or wins; bots send none | 0 system lines after plays, draws and bot turns; two typed messages in both windows | PASS |
| Narrow screen | header icon opens the sheet; unread count shows and clears | badge "1" while closed ("Open chat, 1 unread"), cleared on open | PASS |
| Solo | no chat anywhere and no empty column | table centred at 1366 and 390 | PASS |
| Last card (`endgame`) | celebration, standings winner first then fewest cards then "Left", in every window | exactly that | PASS |
| Play again | host only; fresh deal to all windows at once, no lobby step; first player rotates one seat; room stays closed | all confirmed ("Match in progress" for a newcomer) | PASS |
| One participant left | Play again unavailable with a reason | disabled with "At least two players are needed." | PASS |
| Host plus bot | Play again available | enabled | PASS |
| Regression: Hub, Ludo, Housie, Bingo | Ludo AI picker 1 to 3 with 3 preselected, no capacity picker; Housie and Bingo offer Play Online only; no UNO-only controls; `npm run smoke` | as before; `botCount` 4 for Ludo refused ("Choose 1 to 3 opponents.") | PASS |
| Evidence | | `r10-*.jpg`, `r11-*.jpg`, `r12-*.jpg` | |

## Scripted engine sweep (US7; T054; SC-003, SC-009, SC-013)

| Block | Expected | Observed | Result |
|-------|----------|----------|--------|
| Random legal play against 1, 2, 3 and 4 bots | counts sum to 108 on every event, `turn` advances legally, no bot acts out of turn, no refusal, winner and standings correct | 26 matches each, 104 in all: every assertion held | PASS |
| Online matches with 2, 3, 4 and 5 scripted humans | same | one match each: held | PASS |
| Illegal actions (out of turn, non-matching, not held, Wild without colour, colour with a non-Wild, second draw, wrong card while a penalty is pending, catch with no window, `room:fillAi`, `room:start` and `playAgain` by a guest) | every ack `{ ok: false }`, no `game:event` within 500 ms, view unchanged | 77 actions, every ack `{ ok: false }`; the reconnect view matched. Six rapid repeats overlapped the server's own 0.9 s penalty auto-draw (a harness timing artefact) | PASS |
| Bot pause (real pauses) | 1.2 to 2.3 s | 14 pauses, minimum 1523 ms, median 1722 ms, maximum 1974 ms | PASS |

## Production behaviour (T086; FR-056)

With `NODE_ENV=production` and all four development variables set: one startup log line lists the ignored variables; the deal is random (seat 0 held 7 cards, not the
`endgame` deal); bot pauses are 1509 to 1985 ms (median 1725 ms); the countdown is 30,000 ms. **PASS.** Bots that remember to call UNO! could not be observed
in 45 s of play (no bot reached one card), so that single sub-check is recorded as not observed in production mode; `UNO_DEV_FORGET` is ignored per the startup line
and the forced `always` and `never` modes are verified outside production in V8.

## Defects found and fixed during verification

| Finding | Fix |
|---------|-----|
| 7-card slice of 37 to 39 px at 320x568 (needs 40 px) | hand side padding reduced below 340 px wide; slice now 42 px |
| Decorative arrow track overlapped side seats by about 5 px | track starts 6 px lower; piles unchanged |
| Card index numerals below 11 px on small hands | corner index at least 11 px; pips at least 8 px |
| Refusal reason's hidden screen-reader copy stayed 6 s | cleared at 2.5 s with the visible line |
| Catch control appeared about 0.49 s late (visible 4.5 s of the 5 s window) | the store applies the newest catch window at once; visible 5.0 s |
| Wild tap closed the wheel at once on touch (backdrop mouse-down compatibility event) | the backdrop uses pointer-down |
| "You draw 8" and flash banners hidden behind the Draw pile | banners and flashes render in a top layer above the piles |
| Refusal pill overlapped the raised hand card | pill placed above the hand band (landscape) or in the UNO row (portrait) |
| Direction chevrons small and faint | larger (31 px at 1366x768) and fully opaque |
| UNO lobby showed the Ludo board art | UNO art added to the lobby board |
| Last "Open seat" row hidden under the host controls (Fill button made the panel taller) | host controls no longer sticky except below 520 px height; seat list scrolls on its own; compact controls |
| Convergence T091: pressing Leave in a lobby re-joined the room as a ghost "RECONNECTING" seat (platform-wide) | `leaveRoom()` records the room it left (`roomStore.ts`) and the room page does not re-join it while the route changes (`RoomPage.tsx`); the marker is cleared on every fresh visit |
| Convergence T094: card pips 8 to 10 px | pip and centre pip at least 11.2 px (`CardFace.tsx`) |
| Convergence T096: the left-room marker survived a change of room id on the reused room page | the marker is cleared whenever the room id changes (`RoomPage.tsx`) |
| Convergence T096 (found while testing it, platform-wide): switching rooms in one page ended on "Something went wrong" because the delayed disconnect after a leave cut off the new join on the shared socket | the delayed disconnect runs only when no session, no create or join in flight and phase is not "joining" (`roomStore.ts`) |
| Convergence T097: the sizing rules and five budget rows in the layout contract omitted the room under the fan | rule and rows corrected from the layout function (`contracts/match-screen-layout.md`) |

## Success criteria coverage

| SC | Status | Evidence |
|----|--------|----------|
| SC-001 | Verified | table 59 to 105 ms after Start, 3 clicks, no invite link or chat (V1) |
| SC-002 | Verified | lobby with invite in 3 clicks; guest visible after 61 ms (V2) |
| SC-003 | Verified | 77 scripted illegal actions plus UI refusals (V4, engine sweep) |
| SC-004 | Verified | agreement checks between two windows (V4) |
| SC-005 | Verified | wheel in 25 to 139 ms; aura and restriction (V5) |
| SC-006 | Partly verified | flip measured 494 to 510 ms from the click, which includes the throw and harness overhead; the server event to flip is faster but was not isolated |
| SC-007 | Verified | one catch gives exactly 2 cards; late call removes the control (V8, t3) |
| SC-008 | Verified | control appears with the event and lasts 5.0 s (V8, r14) |
| SC-009 | Verified | pauses 1523 to 1974 ms; no bot out of turn in 104 matches |
| SC-010 | Verified | sweep from 320 to 2560 px, slice at least 40 px (V9) |
| SC-011 | Verified | track and piles 55% to 66% of the height at the three re-measured sizes; the sweep rows pass |
| SC-012 | Verified | re-fit in 28 to 141 ms with unchanged state (V9) |
| SC-013 | Verified | correct winner in 108 scripted matches (engine sweep, V12) |
| SC-014 | Verified | 0 system lines online; no chat in solo (V12) |
| SC-015 | Verified | 556 payloads, 0 violations (V11) |
| SC-016 | Verified | hand visible 92 ms after a reload, no replay (V10) |
| SC-017 | **Pending** | needs a person with a stopwatch (T090) |
| SC-018 | Partly verified | laptop (headless Edge): p95 18.1 ms; a real phone is pending |
| SC-019 | Verified | reduced-motion run keeps all information (V9) |
| SC-020 | Verified | running totals 2, 4, 8 matched the cards drawn (V7) |

## Constitution compliance

- **I Render-ready**: no new dependencies; one process and one port; development controls ignored in production with one startup line; `npm run build` and `npm run smoke` pass. Deployment itself is pending (V13).
- **II Graphics-first**: the table is a graphics screen (cards, piles, aura, arrows, wheel); piles and track take 55% to 66% of the height; no page scroll at any tested size; reduced-motion behaviour verified.
- **III Manual verification with evidence**: this file; no automated test suites were added.
- **IV Platform and game decoupling**: the platform gained only opt-in launch options (`launch`), a generic `room:fillAi` and a `capacity` field; UNO rules, deck and timing live in `shared/src/uno`, `server/src/games/uno` and `client/src/games/uno`.
- **V Server-authoritative**: every deal, draw, move and bot action passes the same server validation; no payload carries another player's hand or the Draw Pile order (V11).

## Known limits and pending items

- **V13 Render (T089)**: not run; deployment needs the owner's go-ahead. **Pending.**
- **Human stopwatch and a real phone (T090, SC-017, SC-018)**: **Pending.**
- **Platform lobby layout**: in the stacked (portrait) lobby layout the page scrolls (194 px at 390x844 with capacity 4); this is the platform's lobby and no requirement forbids it.
- **Colour wheel covers the discard pile**: the layout contract places the wheel in the centre of the table; the discard card is dimmed behind it and the active colour stays visible.
- **Smallest cards (64 px tall, landscape phones)** carry 11 px numerals and pips in a dense corner; they are legible but busy.
- **`room:create` with `capacity`** for Ludo is accepted within its own range (not used by the Ludo UI, which stays at 4).
- **Production bot UNO! calling** was not observed in the 45 s production-mode run (see above).
