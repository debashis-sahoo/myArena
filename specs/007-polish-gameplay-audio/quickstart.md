# Quickstart: Verifying Gameplay Clarity and Audio Polish

A run-and-check guide for the plan, not a test suite (constitution Principle III). Each scenario records **scenario, expected result, observed result** in `verification.md` during
implementation, with screenshots under `specs/007-polish-gameplay-audio/evidence/` (`<scenario>-<width>x<height>.jpg`). Data shapes are in [data-model.md](data-model.md), contracts in
[contracts/](contracts/).

## Prerequisites

- Node.js 22 and a modern browser (Chromium family or Firefox); a second browser profile or window for the second player; phone emulation or a real phone for touch and audio checks.
- Build once and after any `shared/` change:

```powershell
npm install
npm run build
```

- Start the built app (serves the client from the same port). Run it asynchronously and restart it when changing a variable:

```powershell
$env:PORT='10000'; $env:LUDO_DEV_HUMOR_MS='2000'; $env:LUDO_TURN_MS='4000'; $env:LOG_LEVEL='warn'; node server/dist/index.js
```

Open http://localhost:10000. `LUDO_DEV_HUMOR_MS` shortens the humor interval (V6) and is ignored in production; remove it to check the real 45 to 90 second cadence. Existing development
controls (`LUDO_DEV_DICE`, `LUDO_DEV_SCENARIO=endgame`, `UNO_DEV_*`) work as before; clear leaked `UNO_DEV_*` and `LUDO_DEV_*` variables first (`Remove-Item Env:UNO_DEV_*`). Room creation
is limited to 5 at once, then 1 per 6 seconds per IP. Scripted Socket.IO clients, the loudness meter and the contrast script are kept outside the repository (for example in `%TEMP%`).

## Scenarios

| # | Scenario | Covers |
|---|----------|--------|
| V1 | Audio controls and audibility in all four games | US5; FR-023 to FR-025, FR-027, FR-029; SC-007, SC-008 |
| V2 | Music themes and lifecycle | US5; FR-026, FR-028, FR-029; SC-008 |
| V3 | UNO turn clarity | US1; FR-001 to FR-003; SC-001 |
| V4 | UNO card play timing | US2; FR-004 to FR-007; SC-002 |
| V5 | UNO chat minimize | US7; FR-021, FR-022; SC-006 |
| V6 | Ludo chat, Activity and humor | US6; FR-017 to FR-020; SC-005 |
| V7 | Ludo Play again | US4; FR-013 to FR-016; SC-004 |
| V8 | Housie ticket | US3; FR-008 to FR-012; SC-003 |
| V9 | Layout, reduced motion and keyboard sweep | FR-031, FR-032; SC-009 |
| V10 | Loudness meter | FR-023, FR-025; SC-007 |
| V11 | Two-client and reconnect checks | FR-033; SC-001 to SC-006 |
| V12 | Regression of Housie, Bingo, UNO and the platform | FR-030; spec edge cases |
| V13 | Render | Constitution workflow |

### V1. Audio controls and audibility

1. Hub: open the audio button. **Expect**: Sound on at 80%, Music off at 30%, both with labelled switches and sliders; Tab order is Sound switch, Sound slider, Music switch, Music slider.
2. Enter a Ludo, Housie, Bingo and UNO room (lobby and match). **Expect**: the audio button is in each header; opening it shows the same controls and values.
3. Trigger representative cues: Ludo roll and finish, Housie ball call and win claim, Bingo ball and stamp, UNO throw, draw and error. With the device at 50% volume in a quiet room, five
   listeners rate each cue clearly audible (record the count). At 100% Sound there is no audible distortion.
4. Set Sound to 0: silent at once and the switch shows off; turn it on: it returns to the previous level. Reload: preferences persist. Clear storage and reload: defaults return.
5. Set `myarena.guest.v1` with `soundOn:false` and no audio record: first load starts with Sound off (migration). Block storage: controls still work for the session.

### V2. Music themes and lifecycle

1. Turn Music on in a Ludo room. **Expect**: the Ludo theme fades in within 1 second, quieter than the effects at default levels; switch to Housie, Bingo, UNO in turn: each theme is distinct
   and the previous one is gone (listeners rate each as fitting its game; record the count).
2. Leave the room, hide the tab, return: music stops on leave and on hide, resumes on return only if still audible. Replay a Ludo match and reconnect a client: no second theme starts.
3. Reload inside a room with Music enabled: the button shows the needs-tap dot, the popover offers Retry, effects requested before any tap do not play later, and the first tap starts music.
4. Rapidly switch rooms ten times: never two themes at once. Disable Web Audio in the browser flags if possible: the game plays normally and the status reads "not available".

### V3. UNO turn clarity

1. Two clients, a 4-player room with bots. For eleven staged situations (the ten of SC-001 plus a reconnecting actor: ordinary turn, bot thinking, Skip, Reverse, Draw 2 you can stack, Draw 2 taken automatically, Wild colour choice,
   drawn card decision, catch window, your turn, an actor whose window is closed), screenshot both clients and ask five first-time reviewers who must act within two seconds without help; record the count.
2. **Expect**: the strip names the actor and phase on every screen, the active seat shows "Turn", your hand has the gold frame only on your turn, and the live region announces changes.
3. Reconnect a client mid-turn: the strip, seat chip and permitted actions agree before play resumes. Check at 320 x 568, 390 x 844, 568 x 320, 640 x 360, 667 x 375, 844 x 390, 1024 x 768 and 1366 x 768 (at 568 x 320 to 844 x 390 measure where the strip fits in the header and set `STRIP_MIN_W` there), with reduced
   motion on, and with sound off.

### V4. UNO card play timing

1. Record tap-to-hold, tap-to-landed and tap-to-refusal times with the network stable and throttled to 150 ms and 400 ms round trips, for 10 touch and 10 mouse plays each.
2. **Expect**: the ghost lifts within 100 ms of every activation; after the server event the card lands in 300 ms or less; the pile does not change before the event; a refused card flies
   back and bounces; ten rapid double activations commit once; a Wild opens the wheel at once and cancelling leaves the hand untouched; an out-of-turn tap is refused with a reason.
3. Cut the connection after a tap: the ghost returns after 4 seconds with "Connection is slow" and the hand is intact. Check keyboard and reduced motion.

### V5. UNO chat minimize

1. Docked layouts (1024 x 768, 1366 x 768, 1920 x 1080): Minimize collapses the column to the rail, the table re-fits within 0.5 seconds, the rail shows the unread count, Restore returns the
   column. Phone layouts (320 x 568, 390 x 844, 667 x 375): the sheet's Minimize button closes it and the icon keeps the badge.
2. Type half a message, minimize, receive two messages from the other client, restore: the draft and both messages are present and the unread count cleared on viewing. Rotate, replay and
   reload: the chosen state persists. In a Play with AI room: no chat, rail or icon.

### V6. Ludo chat, Activity and humor

1. Play with AI and an online match with a second client. Trigger rolls, moves, a capture, a pawn home, a disconnect and reconnect, a host change, a leave, and finish.
2. **Expect**: Chat shows only typed messages and humor; every other line is in Activity (including "{Name} lost connection", "{Name} is back", "{Name} is now the host"); the lobby before
   the match still shows join lines in Chat. A missed-turn warning stays visible as the warned player's dice-console alert, a disconnected player shows "Reconnecting" on their bubble, and a refused action shows its toast.
3. With `LUDO_DEV_HUMOR_MS=2000`, collect 30 humor lines: none repeats within five, general and addressed lines both appear, addressed lines use only display names and true facts, tone is
   encouraging. Without the variable, five consecutive gaps are between 45 and 90 seconds, never closer than 45. Disconnect everyone for five minutes and reconnect: no backlog of humor.
4. Five reviewers rate a sample of 10 lines amusing and encouraging; record the count. Ten-minute run: zero routine system events in Chat.

### V7. Ludo Play again

1. Finish an online match (`LUDO_DEV_SCENARIO=endgame` shortens it) and an AI match. The host presses Play again.
2. **Expect**: within 2 seconds every screen shows a fresh board with the same players, colours and seats, the first turn starts for P1, the results overlay is gone, no lobby appears, and
   Activity shows a "Match 2 started: ..." divider naming the players, with the earlier entries kept.
3. Refusals: a non-host (button absent; scripted attempt refused), a scripted request before the end, a double click (one new match), and a disconnected human (disabled with the reason
   until they return, then enabled; if their seat is released instead, the next match starts without them). Back to Hub still works.
4. Players who left: in a 4-player online match let one player leave before the end, finish the match, and check that the results say who will play ("Next match: ... Dan left."), the
   button reads "Play again (3 players)", and after pressing it the new match has exactly those players with their original colours, the departed corner empty, the remaining players
   labelled P1 to P3, and an Activity divider that names them. Repeat with two leavers (2 players remain), then with three (1 remains): the button is disabled with "At least two players
   are needed to play again." and a scripted request is refused. Five trials per mode with zero incorrect starts.

### V8. Housie ticket

1. At 320, 390, 768, 1024 and 1440 px wide (and rotations), with one, two and four tickets: every ticket's nine columns and three rows are visible with no horizontal scrolling and no clipped
   number; number size is at least 18 px on phones and 24 px from 768 px wide (read from computed styles).
2. Run the contrast script for blank, unmarked and marked cells on every tint: at least 4.5:1. Mark and unmark cells by touch, mouse and keyboard; the claim rules, call history and
   prizes behave as before; a called number is never marked for you.
3. Five reviewers read ten sampled numbers and tell marked from unmarked without zoom, and rate the ticket more engaging than the old one; record the counts and screenshots.

### V9. Layout, reduced motion and keyboard sweep

Each changed view (the audio popover; the headers that gain the audio button: Hub, platform room, Ludo, Housie lobby and match, Bingo lobby and match, UNO; the UNO strip, rail and sheet; Ludo results with and without leavers; Ludo Chat humor lines and Activity room and match entries; Housie tickets) at phone, tablet and desktop sizes in both orientations from 320 to 2560 px wide, including the 568 x 320, 640 x 360, 667 x 375 and 844 x 390 landscape phones: no page scroll,
no overlap or clipped content, re-fit within 0.5 seconds on resize and rotation, safe areas respected. With `prefers-reduced-motion` and with sound off all information remains. Every new
control is reachable and operable by keyboard with a visible focus state. Re-measure the UNO sizes against the 006 limits (data in [contracts/uno-turn-play-chat.md](contracts/uno-turn-play-chat.md)).

### V10. Loudness meter

An `OfflineAudioContext` script (outside the repository) renders each cue and each theme through the same graph as the app at the default levels and at 100/100 and reports peak and
short-term loudness. **Expect**: effect peaks between -12 and -6 dBFS at the defaults; music 8 to 12 dB below an effect's loudness at the defaults; the combined peak never above -1 dBFS at
100/100. Record the numbers next to the V1 listener results; adjust `levels.ts` if either fails.

### V11. Two-client and reconnect checks

With two clients (one scripted) for UNO and Ludo: out-of-turn and repeated UNO plays, replay authorization and eligibility, the disconnect and reconnect paths of V3, V6 and V7, and the
authoritative snapshot after a refresh (turn label, Activity list, results state). Record the action sequence and expected versus observed outcomes.

### V12. Regression

Run `npm run smoke`. Check Housie and Bingo chat, quiet-chat behavior, lobbies and Housie's own chat minimize; UNO online and AI rooms (no chat in AI); Ludo lobby join lines; the Hub; host
controls, invites and shared chat. **Expect**: no change other than the new audio controls.

### V13. Render

On the deployed service: startup and readiness, WebSocket connectivity, replay and reconnect behavior, audio unlock and preference persistence over HTTPS. Record results, or mark this
scenario pending until it is run (local checks are not deployment verification).
