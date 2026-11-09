# Verification: Gameplay Clarity and Audio Polish

Feature: [spec.md](spec.md) | Plan: [plan.md](plan.md) | Guide: [quickstart.md](quickstart.md)

**How to read this file**: one entry per scenario with the date, the scenario, the expected result, the observed result and the evidence (screenshots under `evidence/`,
numbers, script output). **Pending** means not run yet, and is never presented as passed. Local runs are never deployment verification (constitution workflow).

## Foundation (T005 to T008)

- **Date**: 2026-11-09
- **Scenario**: Shared contracts and the two platform hooks are in; every workspace builds and the existing smoke script runs.
- **Expected**: `npm run build` passes; `npm run smoke` passes with Housie, Bingo and UNO unchanged. Ludo becomes a quiet-chat game, so its "match started" and "seat released"
  lines no longer appear in Chat.
- **Observed**: `npm run build` passes (shared, server, client). `npm run smoke` first failed two Ludo checks that asserted the old chat lines (`start announcement`, `seat release
  announcement`). That is the intended behavior change, so `server/scripts/smoke.ts` now asserts the new rule: no `match_started` or `seat_released` line in Chat during a Ludo
  match, and the matching entries ("Match started", a `released` entry) arrive as Activity entries on the game event. After the change build and smoke both pass; the UNO, Housie
  and Bingo checks were unchanged and still pass.
- **Result**: PASS

## V10 Audio levels meter (T050)

- **Date**: 2026-11-09
- **Scenario**: A script outside the repository (`%TEMP%\audio-meter`) bundles the real `client/src/audio` modules with esbuild, renders every cue and every theme through the app's
  graph (sound and music buses into one limiter) in an `OfflineAudioContext` in headless Edge, at the default levels (Sound 80%, Music 30%) and at 100/100, and reports peak (dBFS)
  and 400 ms-window RMS loudness (windows slide by 100 ms; music uses the median window over one full 8-bar loop, an effect uses its loudest window).
- **Expected**: effect peaks between -12 and -6 dBFS at the defaults; music 8 to 12 dB below an effect's loudness at the defaults; combined peak never above -1 dBFS at 100/100.
- **First run** (`SFX_REF_PEAK` 0.5, `MUSIC_TRIM` 0.7): effect peaks -5.5 to -12.0 (three cues just above -6), music 4.1 to 16.0 dB below the average effect (Housie too loud, UNO too quiet).
  Tuned: `SFX_REF_PEAK` 0.46, `MUSIC_TRIM` 1.0, the `stamp` cue to full level (it was the quietest cue, so its 240 and 480 Hz notes now use 1.0 and 0.5 instead of 0.9 and 0.45), and a
  per-theme `trim` (Housie 0.35, UNO 1.4) so every theme sits at the same loudness.
- **Observed** (after tuning, defaults): effect peaks `tap` -7.2, `join` -6.5, `message` -11.5, `error` -8.3, `success` -6.7, `stamp` -11.8, `ballRoll` -6.4, `winChime` -6.2 dBFS. Music
  median loudness is 9.4 (Housie), 9.5 (Ludo), 9.6 (UNO) and 10.3 (Bingo) dB below the average effect's loudest window (-28.0 dBFS). At 100/100: effect peaks -3.3 to -8.9 dBFS; music
  alone peaks -1.9 to -2.4 dBFS; music plus eight overlapping cues peaks at -1.7 to -1.8 dBFS (Ludo -1.8, Housie -1.7, Bingo -1.8, UNO -1.7), so the limiter keeps every case under -1 dBFS.
- **Evidence**: [evidence/v10-audio-meter.json](evidence/v10-audio-meter.json) (all numbers).
- **Result**: PASS for the measured targets. Listener ratings ("clearly audible", "fits the game") belong to T049 and stay pending.

## V6 Ludo Chat and Activity routing, humor (T057): scripted part

- **Date**: 2026-11-09
- **Scenario**: Scripted Socket.IO clients (outside the repository, `%TEMP%\ludo-verify\v67.mjs`) against the built server: three humans online (`LUDO_DEV_HUMOR_MS=2000`, `LUDO_TURN_MS=4000`,
  `RECONNECT_WINDOW_MS=3000`) playing automatically; a picker test against the compiled `humor.js`; a no-backlog run; and a real-timer run in an AI room (1 human, 3 bots, default timer).
- **Expected**: Chat carries only typed messages and humor during a match; connection, host-change and departure lines are Activity entries of kind `room` or `released`; the pre-match
  lobby still shows join lines in Chat; humor never repeats within five, mixes general and addressed lines using display names and true facts, stays within 120 characters, arrives every
  45 to 90 s by default, and does not pile up while nobody is connected.
- **Observed**: all 15 online checks pass. Lobby join lines are in Chat (2) before the start. After 12 humor lines (4 general, 8 addressed) there are zero non-humor system lines in
  Chat. Dev-timer gaps were 2000 to 2014 ms. "lost connection", "is back", "is now the host", "left the match" (kind `released`) all appeared in Activity and none in Chat for the whole
  run; a reconnecting client's snapshot lists the connection entries. Picker (3000 lines, three players, controlled guards): zero lines over 120 characters, zero unfilled slots, zero
  repeats within five, guarded lines only for a player whose guard passes (home, all in base, sole leader), 1484 general / 1516 addressed, a 30-character name is cut to 20, a lone player
  with nothing home never gets a leader or home line; both pools have 14 entries (6 guarded); `humorDelayMs` over 300 000 samples ranged exactly 45 000 to 90 000 ms. With everyone away for
  25 s at a 2 s timer the history on return was unchanged (2 lines before, 2 after) and 2 lines arrived in the 3.5 s after returning (one per interval, no burst). Real timer in an AI room:
  six consecutive gaps of 50, 57.5, 48, 88.9, 55.5 and 52.7 seconds (all within 45 to 90).
- **Evidence**: [v6v7-v6.json](evidence/v6v7-v6.json), [v6v7-picker.json](evidence/v6v7-picker.json), [v6v7-backlog.json](evidence/v6v7-backlog.json), [v6v7-gaps.json](evidence/v6v7-gaps.json).
- **Result**: PASS for the scripted checks. **Pending (not run)**: five reviewers rating 10 lines, the ten-minute run with zero routine events (the longest run was about six minutes and
  was not scanned for routine lines), the visual check that the missed-turn alert, "Reconnecting" or "Left" bubble and a refused action's toast remain visible, and a finish on screen.
  T057 stays unchecked.

## V7 Ludo Play again (T031): scripted part

- **Date**: 2026-11-09
- **Scenario**: Scripted clients with `LUDO_DEV_SCENARIO=endgame`, `LUDO_TURN_MS=4000`: five online trials (three humans) and five AI trials (one human, two bots) of finish then Play again,
  the refusals, a double click, a disconnected human, and a four-player online match with one, two and three players leaving before the end.
- **Expected**: the host's Play again deals a fresh match at once with the same players, colours and seats, P1 first, no lobby and a divider naming the players; refusals are specific; one
  new match per click; a disconnected human blocks it until they return.
- **Observed**: online trials 1 to 5 all started a fresh match on all three clients within 1 ms of the request, same player ids in the same order, original colours, `turn` equal to the first player, the
  room still `in_progress` (no lobby), a `match` divider present and exactly one `match_started` per client. AI trials 1 to 5: the same, start 2 to 6 ms. Refusals: host before the end
  "The match is not over."; non-host "Only the host can do that."; with a human disconnected "Waiting for T1Ben to reconnect." (and Play again worked after they rejoined); double click
  gave one accepted and one refused request and one new match. Leavers: one leaver restarted a 3-player match (divider "Match 2 started: L1Host, L1Ben and L1Cy"), two leavers a 2-player
  match, original colours kept and P1 first in both; with three leavers (a single player left) the request is refused with "At least two players are needed to play again.". Zero incorrect
  starts in 10 of 10 trials.
- **Evidence**: [v6v7-v7online.json](evidence/v6v7-v7online.json), [v6v7-v7ai.json](evidence/v6v7-v7ai.json), [v6v7-v7leavers.json](evidence/v6v7-v7leavers.json).
- **Result**: PASS for the scripted checks. **Pending (not run)**: the results-overlay screenshots at 390x844, 844x390 and 1366x768 with and without leavers, the on-screen preview line,
  the "Play again (3 players)" label and the empty-corner look, and the disabled state for the three-leaver case. T031 stays unchecked.

## V8 Housie tickets (T025): scripted part

- **Date**: 2026-11-09
- **Scenario**: Headless Edge (Playwright, scripts in `%TEMP%\housie-verify` and `%TEMP%\housie-contrast`, outside the repository) with an online Housie room (host plus one guest, 1, 2 and 4
  tickets each) at 320x568, 390x844, 768x1024, 1024x768, 1440x900, 568x320 and 844x390.
- **Expected**: each ticket shows 9 columns and 3 rows with no horizontal scroll and no clipped number; number size at least 18 px on phones and 24 px from 768 px wide; text contrast at
  least 4.5:1 for ink `#2a1a0a` on every cell background; marking works by mouse, touch and keyboard.
- **Observed**: 21 of 21 (viewport, ticket count) combinations pass: 9 x 3 cells, zero clipped numbers, no horizontal scroll. The ticket area scrolls vertically only at 320x568 and
  568x320 (allowed). Computed number sizes: 18.5 px at 320 and 390 wide; 24 to 36 px at 768, 1024, 1440 and 844x390 (36 px at 768 with 1 or 2 tickets, 24 px with 4; 26 px at 1024 and
  568x320; 38.5 px at 1440 with 1 or 2 tickets). On phones with 2 or 4 tickets the screen shows the selected ticket (one at a time) as before; at 768 and 1440 wide all four show.
  Contrast: text on blank, hatch, unmarked and marked cells for all nine column tints is at least 7.54:1 (min 7.54). **Finding**: the red mark ring on the marked fill of the purple tint
  (column 30 to 39) was 2.86:1 against the 3:1 non-text target, so `--hz-ink-red` was darkened from `#d6283e` to `#c01d33` (3.50:1 on that fill; the blue ring was 3.87:1). Marking: mouse
  click, touch tap and keyboard (Tab, Enter and Space) each mark and unmark, with the ring, tick and cross shown and the accessible name changing to "crossed".
- **Evidence**: [v8-housie-layout-1-2-tickets.json](evidence/v8-housie-layout-1-2-tickets.json), [v8-housie-layout-4-tickets.json](evidence/v8-housie-layout-4-tickets.json),
  [v8-housie-marking.json](evidence/v8-housie-marking.json), [v8-housie-contrast.txt](evidence/v8-housie-contrast.txt) (first run, before the ink change), screenshots
  `v8-housie-390x844-1tickets.jpg`, `v8-housie-390x844-4tickets.jpg`, `v8-housie-320x568-4tickets.jpg`, `v8-housie-844x390-2tickets.jpg`, `v8-housie-1440x900-2tickets.jpg`.
- **Result**: PASS for layout, font size, text contrast and marking; the ring contrast finding is fixed (3.50:1 recomputed by the same script with the new value). **Pending (not run)**:
  claims, call history and prizes unchanged (covered again by the V12 regression run), a called number never marked for you, and the five reviewers (readability, tell marked from
  unmarked, more engaging than the old ticket). T025 stays unchecked.

## V3 UNO turn strip (T014): scripted part

- **Date**: 2026-11-09
- **Scenario**: Headless Edge against Play-with-AI and online UNO rooms (`%TEMP%\uno-v3`, outside the repository): header geometry sweep, strip labels, eight sizes with reduced motion,
  reload mid-turn.
- **Header fit (online room, header holds Leave, brand, code, invite, audio and chat)**: the free header width against the longest label ("Your turn: stack a Wild Draw 4 or draw 12",
  382 px) is 350 px (height up to 420) or 372 px (768 tall) at 760 wide, which truncates; at 800 wide it is 390 or 412 px, which fits every realistic label. `STRIP_MIN_W` was set from 760
  to **800**. (A 14-wide-glyph display name needs 456 px and fits from 900 at short heights and 844 at 768 tall; the strip then ends with an ellipsis, as designed.)
- **Observed**: at 390x844 and 1024x768 the strip showed "Your turn: play a card or draw", "Next turn...", "<bot> is thinking...", "<bot> may stack or draw 4" and "<bot> is deciding on a
  drawn card" with the Turn chip on the acting seat and the gold frame on the hand when it was my turn. No horizontal scroll and no overlap of the strip with a seat or the hand at all
  eight sizes. After reloading mid-turn the strip, seat chip and playable cards agreed. **Findings**: at 320x568 the row strip truncated "Your turn: stack a Draw 2 or draw 2": fixed
  below 361 px wide by dropping the countdown bar (the number stays) and one font step (`TurnStrip.css`); not re-measured yet.
- **006 limits (computed from `planUnoTable`, four opponents, strip row in place)**: the row strip costs 24 px (height up to 600) or 30 px of the centre area, so the pile-and-track share
  of height falls from the 006 values to 50.9% at 320x568 (006: 55%), 53.4% at 360x640 (006: at least 55%), 58.2% at 390x844 (006: 62%), 47.5% at 667x375 (006: at least 55%), 45.3% at
  640x360 and 38.4% at 568x320; at 844x390 (header mode) 55.6%, and at 1024x768 and 1366x768 65.6%, unchanged. Hand fan, side seats and the 7-card slice are untouched (the diff of
  `useFit.ts` only adds the strip height to the centre-area subtraction); the script's own slice measure (30 to 41 px, difference of rotated card boxes) is not the 006 definition and was
  not compared. Hand slices and top-band height are unchanged, and the centre area never collapsed (129 px at 568x320).
- **Decision (owner chose option B; T014 stays unchecked)**: T014 says to recover the 006 limits by shrinking the top seat band by the strip height, but the top band is already at its 56 px
  minimum and a seat needs about that height. Instead, short landscape phones (height up to 420 px, width from 560 px) now put the strip in the header like wider screens: the brand is hidden
  there and the labels are shorter ("Your turn", "Your turn: stack or draw 4", "<name>: stack or draw 4", "Play it or keep it"; other labels are unchanged). Measured after the change at
  568x320 and 667x375: the label is not truncated in either state, the header does not overflow (UNO match header sweep 5 of 5), and the table is 24 px taller than with the row
  (centre area 153 and 208 px instead of 129 and 184), which is the 006 layout again: pile-and-track share 45.9% at 568x320, 51.9% at 640x360, 53.9% at 667x375. Comparison images:
  `uno-strip-options-667x375-mine.jpg`, `-other.jpg` and `uno-strip-options-568x320-mine.jpg`, `-other.jpg` (left: the row, right: the shipped header strip with the shorter labels). **Still open**: portrait phones keep the row (no header room), so their share stays below the 006 limit (50.9% at 320x568, 53.4% at 360x640, 58.2% at 390x844).
- **Not reached**: Skip, Reverse, a Draw 2 or Wild Draw 4 on my own turn, my own drawn-card decision, the catch window and the reconnecting-actor situation; the "sound off" pass; five
  first-time reviewers. Screenshots: `v3-uno-390x844-your-turn.jpg`, `v3-uno-390x844-other-turn.jpg`, `v3-uno-1024x768-your-turn.jpg`, `v3-uno-568x320-your-turn.jpg`,
  `v3-uno-844x390-your-turn.jpg`, `v3-uno-320x568-your-turn.jpg`; numbers in [v3-uno-results.json](evidence/v3-uno-results.json).
- **Result**: PARTIAL.

## V4 UNO staged card play (T020): scripted part

- **Date**: 2026-11-09
- **Scenario**: Headless Edge against Play-with-AI rooms (`%TEMP%\uno-v4`, outside the repository). The 150 ms and 400 ms round trips are simulated with a TCP delay proxy (browser
  throttling does not affect WebSockets); the page's `uno:tap`, `uno:held`, `uno:landed` marks are read. A second script uses a known hand (`UNO_DEV_DECK=stack`) for the Wild, double-tap
  and out-of-turn checks; a third cuts the connection through a proxy.
- **Expected**: the ghost lifts within 100 ms of the activation; the card lands within 300 ms of the server event; the Discard Pile is unchanged before the event; a Wild opens the wheel at
  once and cancelling leaves the hand untouched; a double activation commits once; an out-of-turn tap is refused; cutting the connection returns the ghost after 4 s with "Connection is
  slow, try again" and an intact hand; keyboard play works; reduced motion shows a pending ring instead of a flight.
- **First run**: event to landed was 292.5 to 299.7 ms (target 300 ms, too tight), so `UNO_FINISH_THROW_MS` was cut from 260 to 220 ms.
- **Observed** (after the change): direct connection, mouse (7 plays): tap to held 1.1 to 1.6 ms (median 1.2), event to landed 264.9 to 266.7 ms, tap to server event 5 to 16 ms; keyboard
  Enter on a card: held 1.4 ms, landed 265.4 ms after the event. 150 ms round trip: mouse (2 plays) held 1.5 to 2.3 ms, landed 252.7 to 256.7 ms, tap to event 162 to 167 ms; touch (2 plays)
  held 1.8 to 2.6 ms, landed 252 to 255 ms. 400 ms round trip: touch (4 plays) held 1.2 to 2.5 ms, landed 253 to 266 ms, tap to event 415 to 428 ms. Direct touch (3 plays): held 1.4 to
  3.3 ms. In every sample that had data the Discard Pile did not change before the event (it changed about 300 ms after it). With a known hand: tapping a playable Wild opened the colour
  wheel at once; Escape left 7 of 7 cards and no ghost; choosing Red played it (7 to 6 cards); two clicks within about 30 ms on a number card removed exactly one card (6 to 5); an
  out-of-turn tap was refused with "It is not your turn." and the hand stayed at 5 with no ghost; after cutting the connection before a tap the ghost was still held at 1.2 s, returned at
  4124 ms with the toast "Connection is slow, try again" at 4009 ms, and the hand stayed at 9 cards. Reduced motion (200 ms round trip): the pending ring was present at 60 ms, no flying
  ghost, zero infinite animations.
- **Evidence**: `evidence/v4-uno-timing-*.json` (direct, rtt150, rtt400, reduced, v4b, targeted), `v4-uno-held-400ms.jpg`, `v4-uno-reduced-pending.jpg`, `v4-uno-out-of-turn.jpg`.
- **Result**: PASS for every measured value. **Pending**: the required sample sizes (10 mouse and 10 touch plays at each network setting; the AI table only offered 2 to 7 per run, and
  mouse at 400 ms produced none), ten repeated double activations (one trial ran), a visual capture of a refused card flying back and bouncing (the refusal text was verified), and a
  physical phone run. T020 stays unchecked.

## V1 and V2 Audio controls, persistence, music lifecycle (T049): scripted part

- **Date**: 2026-11-09
- **Scenario**: Headless Edge with a counter on every oscillator and noise-source start (a playing theme starts about 17 per second, silence starts none), `%TEMP%\audio-v12\audio.mjs`.
- **Observed**: 35 of 35 checks pass. Hub header: audio button (`Audio settings. Sound on, music off`), popover `role=dialog` with two `role=switch` controls and two 0 to 100 sliders in
  steps of 5, defaults Sound on at 80 and Music off at 30 written to `myarena.audio.v1`. Music on restores 30% without touching Sound; dragging Sound to 0 turns it off while keeping the
  80% it had; switching it on restores 80%; mute keeps the level; sliders announce "50 percent"; Escape closes the popover and returns focus to the button; both values survive a reload.
  A room reloaded with Music on shows the not-ready dot and plays nothing (0 starts per second); the first tap starts the theme (16.7 per second) and clears the dot; hiding the tab stops it
  (0) and showing it resumes it (16.7); Music off silences it within a second; on again returns to one theme (17.7); leaving to the Hub stops it (0); ten rapid room switches (UNO and Ludo
  AI rooms) leave one theme (17.3 per second, ratio 1.04). The audio button is inside the viewport in the Hub, the Housie and Bingo lobby and match headers (390x844 and 320x568), the Ludo
  and UNO match headers (320x568, 844x390, 1366x768) with no page scroll. An old profile with `soundOn:false` starts with Sound off; blocked storage (every `setItem` throws) loads with no
  error and the controls work for the session; with Web Audio removed the page has no error and the popover reads "Audio is not available in this browser. Play continues without it.".
- **Defects found and fixed**: (1) dragging a slider down passed through 5% and left that as the level a later "on" restored; `last` now follows the level only once the slider has
  stopped for 700 ms, so dragging to 0 keeps the previous level; (2) the Housie host match header was 412 px wide and overflowed every phone width (the audio button fell off the screen),
  the Housie and Bingo lobby headers overflowed at 320 px (the Bingo audio button was outside the screen), and the UNO online header overflowed at 320 and 360 px; fixed with narrow-screen
  rules (people chip, "people" word, brand and title give way; paddings tighten). The sweep of the match, lobby and Hub headers at 320x568, 360x640, 390x844, 568x320 and 844x390 now
  shows 44 of 44 headers on one row with the audio button inside the screen (`evidence/v9-header-fit.txt`).
- **Deviations to note**: the audio button is 36 to 40 px wide in game headers (38 px compact in Ludo, 40 px elsewhere, 36 px in the Housie header below 431 px) rather than 44 px, to fit the
  existing header heights; the status line in the popover appears every time the popover opens while audio is not ready, not once per page load.
- **Evidence**: [v1v2-audio-results.json](evidence/v1v2-audio-results.json), [v9-header-fit.txt](evidence/v9-header-fit.txt), [v10-audio-meter.json](evidence/v10-audio-meter.json).
- **Result**: PASS for the scripted checks. **Pending (not run)**: five listeners rating each effect clearly audible at default Sound and 50% device volume on a laptop and a phone, "no audible
  distortion at 100%" by ear (the meter shows every peak at or under -1.7 dBFS), five listeners rating each theme as fitting and the default music quieter than the cues, "effects before the
  first tap are not played later" (by design they are dropped, not queued; not scripted), and a real phone. T049 stays unchecked.

## V5 UNO chat minimize (T064): scripted part

- **Date**: 2026-11-09
- **Scenario**: Online UNO room with a scripted second player (`%TEMP%\audio-v12\chat.mjs`), headless Edge at 1024x768, 1366x768, 1920x1080 (docked) and 320x568, 390x844, 667x375 (drawer).
- **Observed**: 29 of 29 checks pass. Docked: Minimize (`aria-label` "Minimize chat") collapses the column to a 44 px rail and the table grows from 772 to 968, 1054 to 1310 and 1568 to
  1864 px wide (first change within 2 ms; settled well inside 0.5 s); after two messages from the other player the rail reads "Open chat, 2 unread"; Open chat restores the column, the
  table returns to its first width, the half-typed draft ("half a mess") and both messages are there and the count is gone. Ten minimize and restore cycles lost no draft. A reload keeps the
  rail. Resizing to a phone width shows the drawer closed (icon only) and back to 1366 shows the rail again. Phone drawer at all three sizes: the sheet has Minimize, minimizing closes it, the
  icon shows the badge "2" (aria-label "Open chat, 2 unread"), reopening shows the draft and both messages and clears the badge, Escape closes the sheet and a reload keeps it closed.
  A Play-with-AI room has no chat, rail or icon.
- **Evidence**: [v5-uno-chat-results.json](evidence/v5-uno-chat-results.json).
- **Result**: PASS for the scripted checks. **Pending (not run)**: a replay (Play again) with the chat minimized, a physical phone rotation, and screenshots. T064 stays unchecked.

## V9, V11, V12 (T066 to T068)

- **V12 regression (T066)**: `npm run build` and `npm run smoke` pass (final run after the last change: all 15 checks). Typed chat through the shared panel works in the Housie, Bingo and Ludo
  lobbies and matches (sent, draft cleared, host receives it, reply visible; `evidence/v12-chat-regression.json`); Housie's own Minimize chat button is present and keeps the draft; UNO online
  and AI rooms (V5); Ludo lobby join lines (V6); the Hub (V1). A production server given `LUDO_DEV_HUMOR_MS=1000`, `LUDO_DEV_DICE`, `LUDO_DEV_SCENARIO` and `LUDO_TURN_MS` logs
  "Ludo development controls are ignored in production" listing all four, and posted no humor line in 6 s. Result: PASS (T066 checked).
- **V9 sweep (T067)**: the header fit (44 of 44), the audio popover (width 320 px, inside the screen at 320 px, keyboard: arrows change sliders in steps of 5, Escape closes and returns focus), the UNO strip, rail and sheet, and the Housie tickets were measured at the sizes listed in their entries; reduced motion was on for the UNO strip sizes and the pending
  ring. **Not done**: the full 320 to 2560 px sweep for every changed view in both orientations (Ludo results overlay with and without leavers, Ludo Activity and Chat humor views, the
  popover at tablet and desktop sizes), "sound off" runs, and visible-focus review by eye. T067 stays unchecked.
- **V11 two-client and reconnect (T068)**: covered by scripts for Ludo (V6 reconnect lines, snapshot Activity list after rejoin, V7 disconnected human blocked then allowed, host change) and UNO
  (V3 reload mid-turn, V4 out-of-turn and double activation, V5 draft and rail after reload). **Not done**: an UNO replay authorization check and an UNO second-client disconnect and
  reconnect path. T068 stays unchecked.

## Summary by scenario (T069)

| Scenario | Status | Where |
|----------|--------|-------|
| V1 Audio controls and levels | Scripted checks PASS; listener ratings pending | V1 and V2 entry |
| V2 Music themes and lifecycle | Scripted checks PASS (no stacking in 10 rapid switches, hide and show, needs-tap); theme ratings pending | V1 and V2 entry |
| V3 UNO turn indicator | PARTIAL (header geometry, labels, sizes, reload done; landscape phones now use the header; six of eleven situations not reached; portrait pile share still under the 006 limit) | V3 entry |
| V4 UNO staged card play | Measured values PASS; sample sizes below the required counts | V4 entry |
| V5 UNO chat minimize | Scripted checks PASS; replay and device rotation pending | V5 entry |
| V6 Ludo Chat and Activity, humor | Scripted checks PASS; reviewers, ten-minute run and visual checks pending | V6 entry |
| V7 Ludo Play again | Scripted checks PASS (10 of 10 trials, leavers, refusals); screenshots and visual checks pending | V7 entry |
| V8 Housie tickets | Layout, font size, contrast, marking PASS (one contrast defect fixed); reviewers pending | V8 entry |
| V9 Layout, reduced motion, keyboard sweep | PARTIAL (header fit 44 of 44; full sweep not done) | V9, V11, V12 entry |
| V10 Loudness meter | PASS after tuning | V10 entry |
| V11 Two-client and reconnect | PARTIAL (Ludo and UNO scripted paths; UNO replay and UNO reconnect path not run) | V9, V11, V12 entry |
| V12 Regression | PASS | V9, V11, V12 entry |
| V13 Render | **Pending**: nothing was pushed or deployed; local runs are not deployment verification | not run |

## Success-criteria coverage (T069)

| Criterion | Coverage |
|-----------|----------|
| SC-001 (UNO turn clarity, 4 of 5 reviewers, ten situations) | Partly verified: labels and screens agree in five of the situations and after a reload; 0 of 5 reviewers recorded; the other situations and the six-size re-measure against the 006 limits are open |
| SC-002 (UNO plays: acknowledgement within 100 ms, landing within one second, zero duplicates) | Partly verified: 1.1 to 3.3 ms to acknowledge, about 265 ms from the event to the landing, one card per double activation, refusals leave the hand intact, Wild cancellation preserves state; fewer than 20 plays recorded |
| SC-003 (Housie tickets at 320, 390, 768, 1024, 1440) | Partly verified: all sizes and 1, 2, 4 tickets show nine columns with no horizontal scroll, 18.5 px or more on phones and 24 px or more from 768 px, text contrast at least 7.54:1, ring contrast 3.50:1; reviewers 0 of 5 |
| SC-004 (Ludo replay, five trials per mode) | Verified by script: 5 of 5 online and 5 of 5 AI trials started within 2 s with the same players and colours and no lobby, zero incorrect starts, refusals, one and two leavers restart, three leavers refused; screenshots pending |
| SC-005 (Ludo Chat and Activity, humor) | Partly verified: zero routine system lines in Chat, every routine event in Activity, intervals 48 to 88.9 s, no repeats within five; ten-minute run and 0 of 5 reviewers recorded |
| SC-006 (UNO chat minimize, ten cycles) | Partly verified: ten cycles with zero lost drafts, unread accurate, one activation to minimize or restore, reload and resize kept; replay and rotation on a device not run |
| SC-007 (audible at default and 50% device volume, no distortion, music quieter) | Partly verified by meter only: effect peaks -6.2 to -11.8 dBFS, music 9.4 to 10.3 dB below, 100/100 combined peak at most -1.7 dBFS; 0 of 5 listeners, no reference phone or laptop recorded |
| SC-008 (channels independent, mute and 0 silent, preferences survive, ten trials without overlap) | Partly verified: independence, 0%, mute, restore, reload, hide and show, ten rapid switches (ratio 1.04); a leave and reconnect loop and the 0 of 5 listener theme ratings are open |
| SC-009 (every changed view, 320 to 2560 px) | Partly verified: headers 44 of 44; the popover, strip rail and sheet at the listed sizes; the remaining views and sizes are open |

Reference devices: none (all runs on one Windows laptop in headless Edge); no phone was used.

## Constitution compliance (T069)

- **I Repository and Render-ready hosting**: no new dependency, binary asset or build step; the client still serves from the existing static build; the new environment variable is documented
  (README) and ignored in production with the existing warning. Render deployment was not touched; V13 is pending.
- **II Graphics-first**: new controls are tactile buttons, sliders and the strip; headers were fitted from 320 px after the sweep found overflows; reduced motion keeps the pending ring.
- **III Velocity and pragmatic verification**: no automated test suite was added; evidence is scripts kept outside the repository (`%TEMP%`), their output files and screenshots in `evidence/`.
- **IV Platform and game decoupling**: the audio button, music lifecycle, chat draft and chat preference are platform modules; games only mount `AudioControls` and read `useChatPref`; Ludo's
  quiet chat and humor are engine-side behavior through `GameContext.notice` and `onRoomNotice`.
- **V Server-authoritative real-time play**: replay, humor, Activity entries and every UNO play stay decided by the server; the client only requests, shows a held card, and returns it when
  refused or after 4 s without an answer.

## Open items for the owner

1. UNO portrait phones (320x568, 360x640, 390x844) still use the strip row, which keeps the pile-and-track share below the 006 limit there (see the V3 entry); landscape phones were fixed by
   putting the strip in the header. Accept it for portrait or choose another remedy.
2. V13 (Render): the changes are local and uncommitted; pushing and observing the deployed service needs the owner's go-ahead.
3. Human-only checks: reviewer and listener ratings, a physical phone, and the screenshots listed as pending in the V6, V7 and V3 entries.
