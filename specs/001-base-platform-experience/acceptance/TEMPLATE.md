# Acceptance Record Template

Copy this file to `acceptance/<yyyy-mm-dd>-<device>-<role>.md` for each real-device run. Nothing is
recorded in advance: a scenario is only "Pass" when a tester has run it on the device and written
the result here. Emulated viewports and automated browsers do not count (FR-021, FR-022).

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
| Service under test (Render preview URL or local) | |
| Build or commit identifier | |

## Scenario results

Use the quickstart scenario numbers. Run 1, 4, 5, 7, 9, 10, and 13 on every device class as both
HOST and PLAYER, in mixed-device rooms, with the host role rotated across laptop, Android, and
iPhone.

| Scenario | Outcome (Pass / Fail / Not run) | Notes (what was seen, screenshots, issue links) |
|----------|---------------------------------|--------------------------------------------------|
| 1 Create a room; second browser joins by code, then by link | | |
| 4 Ready, game, settings, start, rematch | | |
| 5 Host-only actions refused for a player | | |
| 7 Disconnect and reconnect inside 10 minutes | | |
| 9 Return after 10 minutes | | |
| 10 Host hand-off, host leaves, host disconnected past 10 minutes | | |
| 13 Keyboard and reduced-motion journeys, axe scan, screen reader | | |

## Device checks

| Check | Outcome | Notes |
|-------|---------|-------|
| Portrait: core controls available, no horizontal scrolling | | |
| Landscape: core controls available, no horizontal scrolling | | |
| Orientation change mid-session keeps state | | |
| Background and resume restores the seat, no lost or doubled action | | |
| Screen lock and unlock restores the seat | | |
| Input methods used (mouse, trackpad, keyboard, touch) | | |
| Light and dark mode both legible | | |
| Reduced motion honored | | |
| Errors announced by the screen reader (VoiceOver on iPhone, TalkBack on Android) | | |
| Status changes announced (reconnecting, host change, room closed) | | |

## Result

Overall outcome for this run: Pass / Fail / Incomplete

Issues found (link each to a task or defect):

-
