# Quickstart & Validation Guide: Platform Core, Visual Hub & Room Engine

This guide proves the feature end to end. It follows the constitution's testing policy: fast manual smoke checks, immediate
visual verification, and one small headless two-client script. Commands describe the **target** project layout in
[plan.md](plan.md); they become runnable once implementation is complete.

Details live in the linked artifacts: [data-model.md](data-model.md), [contracts/](contracts/).

## Prerequisites

- Node.js 22 LTS and npm.
- Two browsers or one normal window plus one incognito window (a second `localStorage`).
- A phone, or a desktop browser with device emulation, for responsive checks.
- For deployment checks: a Render account with the repository connected.

## Setup and run

```powershell
npm install                      # installs all workspaces
npm run dev                      # server + client dev servers with reload
npm run build; npm start         # production build, then the single production start command
Invoke-RestMethod http://localhost:10000/healthz   # expect status "ok"
```

Optional environment overrides for local checks: `PORT`, `RECONNECT_WINDOW_MS`, `REMOVAL_COOLDOWN_MS`
(see [contracts/render-deployment.md](contracts/render-deployment.md)).

## Headless two-client check (optional, replaces repeated manual two-tab testing)

```powershell
$env:RECONNECT_WINDOW_MS = "3000"; $env:REMOVAL_COOLDOWN_MS = "3000"
npm start                        # in one terminal
npm run smoke                    # in another; prints PASS/FAIL per check
```

It exercises create, join, presence, chat, capacity rules, start rules, host-only enforcement, host handover, removal
cooldown, reconnect, and room closure against [contracts/realtime-events.md](contracts/realtime-events.md).

## Manual verification scenarios

Record scenario, expected result, and observed result for each (constitution Principle III). Capture screenshots for the
visual scenarios.

### V1. Hub visuals and responsiveness (User Story 1; FR-001 to FR-008, FR-033; SC-005, SC-008)

1. Open `/` at widths 320, 390, 768, 1024, 1440, and 2560 px, in portrait and landscape where applicable.
2. Expect: "myArena Hub" header with gradient, guest profile and audio toggle, entry animation, four equal-size cards;
   Ludo shows "PLAY NOW", the others show a "Coming Soon" badge.
3. Hover (desktop) and tap (touch) Ludo: card lifts and the button pulses. Clicking a coming-soon card does nothing.
4. Expect: single column on phones, 2x2 on tablets and standard desktops, one row on very wide screens; no horizontal
   scroll, clipping, or overlap at any size.
5. Enable "reduce motion" in the OS or browser: entry and hover animations become static, nothing disappears.

### V2. Launch modal and create room (User Story 2; FR-009 to FR-014; SC-001, SC-002)

1. Click Ludo. Expect a modal with distinct "Play with AI" and "Play Online" buttons; Escape, outside click, and the close
   button dismiss it.
2. Choose "Play Online". Expect within 2 s: a room page at `/room/ludo/XXXXXXXX`, the room code, an invite link, and you
   marked as host.
3. Click "Copy Invite Link". Expect a "Copied!" confirmation and the full URL on the clipboard. (Deny clipboard access to
   check the manual-copy field fallback.)

### V3. Join and presence (User Story 3; FR-015, FR-017, FR-018; SC-003) - the spec smoke test, step 3

1. Open the invite link in a second incognito window; enter a name and join.
2. Expect the guest in the host's lobby within 2 s without refreshing.
3. Close the guest window. Expect the host to see the guest marked disconnected within 10 s, and removed after the 60 s
   reconnect window; reopening the link inside 60 s resumes the same seat. On a phone, lock the screen for 30 s and unlock it:
   expect the seat to resume (the connection may drop, but it must come back inside the 60 s window).
4. Fill all seats, then open the link in a third window: expect "Room is full". Visit a made-up room code: expect "Room not
   found" with a Hub button.

### V4. Chat (User Story 4; FR-025 to FR-031; SC-004) - the spec smoke test, step 4

1. Send messages both ways. Expect instant delivery in bubbles with name, color tag, and time; system lines for joins and
   leaves.
2. Desktop and landscape: chat docked beside the game stage. Phone portrait: collapsible bottom drawer with an unread badge
   when collapsed.
3. Try an empty message, 600 characters, and ten fast messages: expect rejection or trimming with feedback.
4. Send `<img src=x onerror=alert(1)>`: expect it shown as plain text, no alert.

### V5. Host controls and single host (User Story 5; FR-016, FR-019 to FR-022; SC-012)

1. As host change capacity 2 to 4 and watch the guest's slot display update. Try lowering capacity below the player count:
   blocked with an explanation. Try Start with one player: disabled with an explanation.
2. As guest, confirm no host controls are shown. (The smoke script also sends host-only events as a guest and expects
   `NOT_HOST`.)
3. Start with two players: both move to "Match in progress" together and a late joiner is told the match is in progress.
4. Remove the guest: they see "removed", cannot rejoin for 60 s, then can rejoin.
5. Close the host's window and wait past the reconnect window: the guest becomes the only host; reopen as the former host
   and confirm they join as a regular player with no second host at any moment.

### V6. Play with AI (User Story 6; FR-011)

1. Click Ludo, then "Play with AI". Expect an opponent-count step (1 to 3, 3 preselected) and a single tap to confirm.
2. Expect a room with that many bot seats, chat available, no invite link; leaving ends the room.

### V7. Rotation and screen use (FR-033)

In a room, rotate a phone (or emulate) between portrait and landscape and resize a desktop window: the game stage takes the
largest available square, chat reflows, nothing clips or overlaps, and typed chat text and lobby state are preserved.

### V8. Deployment readiness, local (User Story 7; FR-035 to FR-037)

1. `npm start` with `PORT=12345`: the app answers on 12345. With no `PORT`: it answers on 10000.
2. `GET /healthz` returns 200 `ok`; during startup and after `SIGTERM` it returns 503.

## Render deployment verification (must be done on the deployed URL; unavailable checks are recorded as pending)

1. Connect the repository, apply `render.yaml`, and deploy. Expect a successful build and a healthy `/healthz`.
2. Repeat V2 to V4 on the public HTTPS URL (the client must connect over `wss`).
3. **Keepalive** (User Story 8; SC-011): keep two participants in a room doing nothing for 30 minutes. Expect no
   disconnects and an intact lobby and chat. If the service still sleeps, apply the explicit 20-second client heartbeat
   fallback described in [research.md](research.md) (R3).
4. **Spin-down**: close all clients, wait over 15 minutes, then open the site. Expect Render's loading page or the app's
   "waking up" state, then a working Hub within about a minute.
5. **Redeploy**: trigger a deploy while two clients are in a room. Expect "reconnecting", then a clear "room ended" screen
   with a Hub button, with no hung or blank pages.

## Pass criteria

All scenarios above behave as expected on desktop and phone-sized viewports in both orientations, and the Render checks
pass or are explicitly recorded as pending. This satisfies SC-001 to SC-012 in [spec.md](spec.md).
