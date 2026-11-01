# Verification Evidence: Platform Core, Visual Hub & Room Engine

Recorded during implementation on 2026-11-01. Format follows constitution Principle III: scenario, expected result,
observed result. Measurements were taken in real browsers (Chromium via the integrated browser, fresh isolated contexts per
viewport) against the production build served by `npm start`, plus the headless script `npm run smoke`.

**Limits of this evidence**

- Visual checks are geometry and behaviour measurements (bounding boxes, overflow, computed styles) plus a few viewed
  screenshots. The embedded browser's screenshot output for emulated viewports was unreliable (it painted narrower than the
  viewport), so numbers are the authority; a human pass on real devices is still recommended.
- Nothing here was run on Render. Render checks are listed as **pending** at the end.

## Automated and scripted checks

| Check | Expected | Observed |
|-------|----------|----------|
| `npm run build` (shared, server, client type-check + Vite build) | No errors | Passed |
| `npm run smoke` (14 checks) | All pass | All 14 PASS, including "every `room:state` had exactly one host (violations: 0)" |
| `npm run smoke -- --rooms 50` (SC-009) | 50 rooms, about 200 sockets; create/join <= 2 s, chat <= 1 s at p95 | 50 rooms / 200 sockets in 174 ms; p95 create 61 ms, join 38 ms, chat 6 ms. PASS |
| `npm audit` | No known vulnerabilities | 0 (zod upgraded from a version with a high-severity advisory) |
| Contrast (WCAG) for 31 text/background pairs incl. gradient endpoints | >= 4.5:1 | All pass after darkening three gradient endpoints |

## Quickstart scenarios

### V1. Hub visuals and responsiveness (US1; SC-005, SC-008) - PASS

| Viewport | Observed |
|----------|----------|
| 320x568, 390x844 | 1 column, cards 285x340 and 355x340, uniform, no horizontal overflow |
| 844x390 (phone landscape) | 3 columns, cards 400x250, uniform, no overflow |
| 768x1024 | 2 columns, cards 356x429 |
| 1024x768, 1440x800 | 2x2, cards 484x301 and 691x312, no scroll at all |
| 1920x1080, 2560x1440 | 2x2, cards 924x437 and 1064x617, no scroll |
| 3440x1440 (ultra-wide) | one row of 4, uniform |

- "myArena Hub" header, guest profile (avatar + name), sound toggle, four cards, Ludo "PLAY NOW", others "Coming Soon" with
  frosted overlay: present. Coming-soon cards have no action.
- Cards lift on hover/tap and the button pulses (CSS). Reduced motion (`prefers-reduced-motion: reduce`): card, button and
  logo animations are `none`, confetti hidden, all cards visible and all badges present. PASS.
- Defects found and fixed during verification: modal rendered off-screen (global stacking rule; now a portal), card art
  cramped on wide short cards (horizontal card layout via container query), one-row grid on 1920 px (now ultra-wide only).

### V2. Launch modal and create room (US2; SC-001, SC-002) - PASS

- Click Ludo: modal with "Play with AI" and "Play Online". Dismissal by Escape, outside click, and the close button all work;
  focus returns to the PLAY NOW button; Tab stays inside the modal.
- Keyboard-only (focus PLAY NOW, Enter): modal opens with focus inside it.
- "Play Online": room page `/room/ludo/XXXXXXXX`, room code `XXXX-XXXX`, invite URL, creator is the only host. Room creation
  was far below the 2 s target in every run (local).
- "Copy Invite Link": shows "Copied!". (Clipboard permission could not be granted in the embedded browser, so the
  denied-clipboard fallback was not exercised separately.)
- Dismissing the modal at any step creates no room (server room count unchanged).

### V3. Join and presence (US3; SC-003) - PASS

- Second isolated browser context opens the invite link: join gate (name + avatar), then the guest appears in the host's
  lobby without refresh. Duplicate names are disambiguated ("Guest Gina", "Guest Gina 2").
- Unknown room code: "Room not found" with Back to Hub. Full room: "This room is full". Started match: "Match in progress".
- Refresh of a joined tab resumes the same seat without the gate; host sees "lost connection" then "is back"; seat count
  unchanged, one host.
- Headless: abrupt disconnect marks the player disconnected, a rejoin within the window resumes the seat, and the seat is
  released after the window (smoke checks).
- Not measured: a phone screen lock for 30 s (G3), because it needs a physical device.

### V4. Chat (US4; SC-004) - PASS

- Both directions delivered in 21 ms and 12 ms (target 1 s). Bubbles show name, color tag, time; system lines for joins, leaves,
  reconnects, capacity changes, start, host change.
- `<img src=x onerror=alert(1)>` is shown as literal text (0 `<img>` elements in the chat log).
- Empty, 501-character, and burst messages are rejected; bursts are rate limited (smoke).
- Desktop/landscape: chat docked beside the board. Phone portrait: collapsed bottom drawer with an unread badge (showed 2
  while collapsed, cleared on open).
- Defect found and fixed: fast typing was wiped when a send was acknowledged (input now clears immediately and is restored on
  failure).

### V5. Host controls and single host (US5; SC-012) - PASS

- Capacity 4 to 3 to 2 updates for all; lowering below the seated count is blocked with "More players are seated than that.
  Remove a player first."; Start disabled with an explanation below the minimum.
- Guests see no host controls (0 elements) and host-only events return `NOT_HOST` (smoke).
- Start: all participants switch to "Match in progress"; late joiners are told the match is in progress.
- Remove: the player sees "You were removed ... rejoin in 60s"; blocked during the cooldown, allowed after (smoke).
- Host leaves: the longest-present player becomes host; exactly one host badge before, during, and after; announcement
  "X is now the host". A returning former host joins as a regular player.

### V6. Play with AI (US6) - PASS

- Opponent picker shows 1 to 3 with 3 preselected; choosing 2 creates a room with 2 bot seats ("Bot" tags), chat available,
  no invite bar and no capacity stepper; Start works and shows "Match in progress". Room closes when the human leaves and
  other visitors cannot join (smoke).

### V7. Rotation and screen use - PASS

| Viewport | Layout | Board |
|----------|--------|-------|
| 390x844 | stacked, chat drawer | 355x355, full width |
| 844x390, 667x375 | side by side | 316x316 and 301x301, fits height |
| 768x1024 | stacked, chat docked beside lobby | 593x593 |
| 1366x768, 1440x800 | side by side, chat docked | 660 and 690 square |
| 2560x1440 | side by side, chat docked | 1316 square |

- In-place rotation 844x390 -> 390x844 -> 844x390: layout flips, half-typed chat text preserved, lobby and one host intact, no
  horizontal overflow. Defect found and fixed: the collapsed drawer overlapped the Start button in phone landscape; short or
  small screens now use the drawer instead of docking chat, and the panel keeps clearance.

### V8. Deployment readiness, local (US7) - PASS

- `PORT=12345`: service answers on 12345 (`/healthz` 200). Default port 10000 otherwise.
- `/healthz`: 200 `{"status":"ok", uptimeSec, rooms, connections}`, `Cache-Control: no-store`, no cookies.
- `SIGTERM` (real handler): `/healthz` returns 503 `{"status":"draining"}`, clients receive `server:restarting` and
  `room:closed` (`server_restart`), process exits 0. (A defect was found: everything closed in one tick; a 1 s drain was
  added.)
- Headers on `/`: CSP (`default-src 'self'` ... `connect-src 'self' wss:`, `frame-ancestors 'none'`), HSTS, nosniff,
  referrer-policy no-referrer; no `X-Powered-By`; no CORS header. SPA deep link `/room/ludo/ABCDEFGH` serves the app. Hashed
  assets: `Cache-Control: public, max-age=31536000, immutable`. Socket.IO polling handshake reachable.
- Server restart while two tabs are in rooms: banner "Connection lost. Reconnecting..."; once the server is back the tab shows
  "This room has ended" with a Back to Hub button (FR-042).

## Security review (T104)

- All 7 socket handlers parse their payload with a strict zod schema (unknown fields rejected). Host-only actions are checked
  against `hostPlayerId` on the server. Rate limits: create (5 burst, 1 per 6 s per IP), join (per IP and per socket), chat
  (5 burst, 1 per s per socket). A cap of 100 rooms. Socket.IO payloads capped at 10 KB.
- `guestId` is never logged or broadcast (grep of `server/src`); removal cooldown stores only a SHA-256 hash.
- Client: no `innerHTML`, `dangerouslySetInnerHTML`, `eval`, or `new Function`; chat text rendered through React text nodes.
- CSP matches `contracts/http-routes.md`. `npm audit`: 0 vulnerabilities.

## Constitution compliance review (T106)

| Principle / rule | Status | Evidence |
|------------------|--------|----------|
| I. Repository and Render-ready hosting | Met locally; Render pending | `origin` is `https://github.com/debashis-sahoo/myArena.git`; `render.yaml`, `PORT` binding, `/healthz`, graceful `SIGTERM`; Render run **pending** |
| II. Graphics-first | Met for this feature | Saturated neon theme, tactile button states, glowing host marker, responsive and orientation-aware layouts, reduced motion, safe-area padding. Dice animation, token movement, and active-turn indicators are deferred to the Ludo feature (no dice or turns exist yet) |
| III. Velocity and pragmatic verification | Met | No unit/integration suites; one cheap two-client script plus recorded manual evidence |
| IV. Platform and game decoupling | Met | Room shell owns lobby/invites/host controls/chat; `GameEngine` and `GameBoardProps` contracts; client `games/registry.ts` mounts the board by `gameId` |
| V. Server-authoritative real-time play | Met | Server owns rooms, seats, host, capacity, start, chat; `rev` ordering; resume returns a full snapshot; bots seated server-side |
| Runtime: readiness, secure transport, redeploy behaviour | Met locally | `/healthz` readiness and draining; rooms explicitly end on restart with a clear screen; same-origin `wss` in production |
| Workflow: UI at phone, tablet, desktop in both orientations | Met | V1 and V7 |
| Workflow: room-flow and two-client checks | Met | V2 to V5 and the smoke script |
| Workflow: deployment verified on Render | **Pending** | See below |

## Pending (needs a Render account or a person)

- **T088**: push to GitHub, create the Render Blueprint, confirm a successful build, healthy `/healthz`, and a working `wss`
  connection; confirm the service is connected to the GitHub repository.
- **T093**: on the deployed URL repeat V2 to V4 over HTTPS; run the 30-minute idle-room test (SC-011), the over-15-minute
  spin-down and wake check, and a redeploy with clients in a room; confirm the previous instance keeps serving until the new
  one is healthy (zero-downtime rule). If the service still sleeps or drops connections, add the 20-second client
  `heartbeat` fallback from `research.md` R3.
- **T105 (remainder)**: reviewer sign-off against the reference image (SC-010); a phone screen-lock check (G3); one pass on real
  phones, since the emulated-viewport screenshots here were unreliable.
