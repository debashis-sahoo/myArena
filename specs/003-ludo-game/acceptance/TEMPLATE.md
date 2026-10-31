# Acceptance Record Template: Ludo

Copy this file to `acceptance/<yyyy-mm-dd>-<device>-<role>.md` for each real-device run. Nothing is
recorded in advance: a scenario is only "Pass" when a tester has run it on the device and written
the result here. Emulated viewports, software-rendered browsers and automated runs do not count (spec FR-038, SC-006, SC-012).

## Run details

| Field | Value |
|-------|-------|
| Device (make and model) | |
| Operating system and version | |
| Browser and version | |
| Other browsers tried (iPhone: WebKit-based only) | |
| Tester | |
| Date | |
| Role in this run | HOST / PLAYER |
| Players in the room and their devices (device class and role) | |
| Visual quality in use (Automatic / High / Standard / Lite) | |
| Service under test (Render URL) | |
| Build or commit identifier | |

## Scenario results

Use the quickstart scenario numbers. Run these on a real laptop, a real Android phone and a real iPhone, in
portrait and landscape and in light and dark modes, as host and as player, in mixed-device rooms of 2, 3 and 4 players.

| Scenario | Outcome (Pass / Fail / Not run) | Notes (what was seen, screenshots, issue links) |
|----------|---------------------------------|--------------------------------------------------|
| 1 Games page: the Ludo tile and its picture, light and dark | | |
| 4 Create a private room for Ludo (2 to 4 only) | | |
| 5 Theme and turn limit in the lobby | | |
| 7 Start with 2, 3 and 4 players: colours and first player | | |
| 10 Roll with three devices watching: same face, same time | | |
| 11 Skip a roll on one device only | | |
| 14 Every theme, angled and top-down views | | |
| 15 Lite quality, WebGL disabled, lost context | | |
| 16 Chat during a match; sheets on a phone | | |
| 17 Drop and restore the connection in a turn and during a roll | | |
| 18 Turn timeout, away and "I'm back" | | |
| 21 Solo against 1, 2 and 3 computers at each difficulty | | |
| 22 Solo refresh and 30-minute expiry | | |
| 23 Keyboard only, screen reader, reduced motion, colour-vision simulation, 320 px, 200% text | | |

## Device checks

| Check | Outcome | Notes |
|-------|---------|-------|
| Portrait: the whole board fits, controls reachable, no horizontal scrolling | | |
| Landscape: same checks, re-layout on rotation | | |
| The die roll looks natural and settles within 3 seconds on the decided face | | |
| Frame rate at the automatic quality: at least 30 frames per second for 95% of a 4-player match (SC-006) | | |
| Start-up of the match screen on a typical mobile connection | | |
| Pawns, homes and protected squares told apart without colour (shape marks, numbers, markers) | | |
| Pawn buttons and board taps reliable (no mis-taps; hit areas at least 44 by 44 CSS pixels) | | |
| Screen reader (VoiceOver on iPhone, TalkBack on Android): turn, roll result, move, capture and result announced once each | | |
| Focus moves to Roll or the first pawn button only when it is the viewer's own decision | | |
| Reduced motion: no tumbling, travel or celebration; the result face shown at once | | |
| Chat reachable and readable during the match without covering the board | | |

## Result

Overall outcome for this run: Pass / Fail / Incomplete

Issues found (link each to a task or defect):

-
