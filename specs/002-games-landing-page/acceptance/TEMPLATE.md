# Acceptance Record Template: Games Landing Page

Copy this file to `acceptance/<yyyy-mm-dd>-<device>-<role>.md` for each real-device run. Nothing is
recorded in advance: a scenario is only "Pass" when a tester has run it on the device and written
the result here. Emulated viewports and automated browsers do not count (spec FR-030, SC-010).

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
| Other devices in the room (device class and role) | |
| Service under test (Render preview URL; `DEPLOY_TARGET=preview` with the test games) | |
| Build or commit identifier | |

## Scenario results

Use the quickstart scenario numbers. Run 1, 3, 5, 7, 10, 12, and 14 on a real laptop, a real Android
phone, and a real iPhone, in portrait and landscape and in light and dark modes, as host and as
player, in a mixed-device room.

| Scenario | Outcome (Pass / Fail / Not run) | Notes (what was seen, screenshots, issue links) |
|----------|---------------------------------|--------------------------------------------------|
| 1 Landing page with no selection: no create controls, count control or solo action | | |
| 3 Select a game supporting both modes, then one supporting one | | |
| 5 Create a room for a 2 to 4 game; only allowed counts offered | | |
| 7 Create with N, join N-1 more, extra join gets the full-room message | | |
| 10 Join by code from the landing page; invite link skips the landing page | | |
| 12 Play against AI on the test game; exit returns to the same selection | | |
| 14 Reduced motion, keyboard-only, screen reader, 320 px and 200% text | | |

## Device checks

| Check | Outcome | Notes |
|-------|---------|-------|
| Portrait: tiles stack, selected game and its options reachable, no horizontal scrolling | | |
| Landscape: same checks | | |
| Tiles readable and selectable within 3 seconds on a typical mobile connection | | |
| Light and dark mode both legible; art supports the text without replacing it | | |
| Tile name, status ("Playable" or "Coming soon") and selected state announced by the screen reader (VoiceOver on iPhone, TalkBack on Android) | | |
| Appearance of the play options announced; every error announced with a next step | | |
| Reduced motion: no non-essential motion, effects off by default | | |
| Name, effects and sound preferences persist after refresh and reset after clearing site data | | |
| Touch targets reliable (no mis-taps on tiles, count control, dismiss) | | |

## Result

Overall outcome for this run: Pass / Fail / Incomplete

Issues found (link each to a task or defect):

-
