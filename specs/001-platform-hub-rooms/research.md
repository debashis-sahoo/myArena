# Phase 0 Research: Platform Core, Visual Hub & Room Engine

All technical unknowns for this feature are resolved below. No `NEEDS CLARIFICATION` items remain.
Render behaviour was checked against Render's documentation (Free instances, WebSockets).

## R1. Language, runtime, and shape of the deployable

- **Decision**: One TypeScript codebase. Node.js 22 LTS runs a single web service that serves the built React single-page
  app, the real-time channel, and the health route from the same origin. The repository is an npm-workspaces monorepo with
  `shared/` (protocol and game registry types), `server/`, and `client/`.
- **Rationale**: The constitution requires one Render Web Service with WebSocket support. A single origin removes CORS and
  mixed-content problems, and one start command satisfies FR-035. Sharing TypeScript types between client and server keeps
  the event contract consistent without extra tooling. The user suggested "standard Node/Python"; Node is the stronger fit
  because Socket.IO and the frontend toolchain share a language.
- **Alternatives considered**:
  - Python (FastAPI + WebSockets): fine on Render, but splits the stack, so protocol types cannot be shared.
  - Separate static site plus API service: doubles deployment and adds CORS and a second free-tier service.
  - Next.js: adds a server-rendering layer the app does not need and makes the long-lived real-time server awkward.

## R2. Real-time transport

- **Decision**: Socket.IO 4 on the same HTTP server, WebSocket transport first (long-polling fallback allowed), served from
  the default path.
- **Rationale**: The constitution names "WebSocket/Socket.io". Socket.IO gives acknowledgements (needed for request/response
  actions like create and join), automatic reconnection with exponential backoff, and built-in ping/pong heartbeats, all of
  which the spec needs (FR-017, FR-018, FR-039, FR-040, FR-042). Clients always use `wss` through the page origin; Render
  redirects plain `ws` handshakes, so the client connects relative to `window.location`.
- **Alternatives considered**: raw `ws` (would require hand-built reconnect, acks, and heartbeats); server-sent events (one
  way only).

## R3. Keepalive on Render's Free plan (FR-039 to FR-042)

- **Findings** (Render docs):
  - A Free web service spins down after 15 minutes without inbound traffic, and inbound traffic includes **WebSocket messages
    from existing connections** as well as HTTP requests.
  - A spun-down service wakes on the next HTTP request or new WebSocket connection, taking about one minute, during which
    Render shows its own loading page to browsers.
  - Render sets no maximum WebSocket duration, but recommends periodic ping/pong from both sides to keep connections healthy
    and detect stale ones, and reconnect logic with exponential backoff on clients.
  - On shutdown Render sends `SIGTERM` and allows 30 seconds for graceful shutdown. Instances can be restarted at any time.
  - Free services cannot scale past one instance and their local filesystem is ephemeral.
- **Decision**: Rely on Socket.IO's own heartbeat with short settings (server ping every 4 s, 4 s timeout). Each client
  reply is an inbound WebSocket message, so while at least one client is connected in a room the service never goes 15
  minutes without inbound traffic. No self-ping to the public URL is used. Sockets are opened only when a visitor creates or
  joins a room, so when nobody is in a room there is no traffic and the service may sleep (FR-041 second clause). The same
  heartbeat detects dead connections within roughly 8 seconds, inside the 10-second budget of SC-003 (FR-040).
- **Rationale**: Uses a documented Render behaviour instead of a workaround. A self-ping to the public URL would add outbound
  bandwidth and keep the service awake even with nobody connected.
- **Fallback if verification fails**: Add an explicit client-to-server `heartbeat` event every 20 seconds while in a room.
  The quickstart includes a 30-minute idle test on Render to confirm.
- **Alternatives considered**: external cron pinger (keeps a service awake forever, wastes free instance hours, and is
  outside the platform); longer ping intervals (cheaper but slower disconnect detection).

## R4. Cold start and redeploy behaviour

- **Decision**:
  - Cold start: the client shows a "Waking up the arena" state and keeps retrying with exponential backoff (cap 10 s) for up
    to about 90 seconds before showing a manual retry.
  - Redeploy or restart: rooms are held in memory and **end** when the process is replaced. On `SIGTERM` the server sends a
    `server:restarting` notice, closes sockets, and exits within the 30-second window. Reconnecting clients receive
    `ROOM_NOT_FOUND` and see a friendly "this room ended" screen with a way back to the Hub.
- **Rationale**: The constitution requires deployment plans to say how room state is recovered or explicitly ended. Ending
  rooms is consistent with the spec's assumption that rooms are temporary and not guaranteed to survive a restart. Persisting
  state would need paid infrastructure (disk, Postgres, or Key Value) for little value in a casual guest-only product.
- **Spec correction**: the spec assumed a cold start of "several seconds"; Render documents about one minute. The spec
  assumption was updated.

## R5. Room state and storage

- **Decision**: In-memory only (a `Map` of rooms keyed by room ID), owned by the server. No database.
- **Rationale**: Matches FR-024 (temporary rooms), the free plan (single instance, ephemeral filesystem), and the minimal
  early-development policy. SC-009 (50 rooms, 200 connections) is trivial in memory.
- **Alternatives considered**: Redis or Postgres (adds cost, complexity, and a second failure mode, and would only matter
  for multi-instance scaling, which the free plan does not allow).

## R6. Room IDs and guest identity

- **Decision**:
  - Room ID: 8 characters drawn with `crypto.randomInt` from an unambiguous 31-character alphabet (no `0/O/1/I/L`), shown to
    people as `XXXX-XXXX`. Creation retries on collision. Joining is rate limited per connection and per IP, so guessing is
    impractical.
  - Guest identity: the browser generates a random `guestId` (UUID) and keeps it, with display name, avatar, and sound
    preference, in `localStorage`. The `guestId` is a private bearer secret used only to reclaim a seat after a reconnect and
    is **never** broadcast. Other participants see only a separate, server-issued public `playerId`.
- **Rationale**: Satisfies FR-006, FR-013, FR-018 and the "same guest in two tabs keeps one seat" edge case with no accounts.
  Removed-player cooldown (FR-019) is keyed on a hash of the `guestId`; a determined user can bypass it with a new browser
  profile, which is acceptable for a casual 60-second cooldown.
- **Alternatives considered**: signed cookies (more machinery, no benefit without accounts); UUID room IDs (not shareable by
  voice).

## R7. Authoritative host, presence, and reconnect rules

- **Decision**: All state transitions happen on the server in one place per room.
  - Exactly one host: stored as `hostPlayerId`. Every host-only event checks the sender against it.
  - Disconnect: marks the player `disconnected`, starts a 60-second timer, and announces it. Reconnect with the same `guestId`
    inside the window clears the timer and restores the seat. At expiry the seat is released (lobby: reopens; match: released
    and the game module is informed, match continues).
  - Host handover: when the host leaves or the timer expires, the connected player with the lowest join sequence becomes host
    in the same synchronous step, so the room never shows zero or two hosts.
  - Room closure: immediately when the last participant explicitly leaves; when the reconnect window ends with nobody
    connected; the "Play with AI" room closes when the human leaves.
  - Clients receive full room state with a monotonically increasing `rev`; stale updates are ignored.
- **Rationale**: Directly implements FR-017 to FR-022, SC-012, and clarification answers. Full state pushes (at most 4 seats
  and a few fields) are simpler and easier to verify than diffs.

## R8. Chat

- **Decision**: Server-owned chat per room. A ring buffer of the last 50 messages is returned on join and reconnect. Payloads
  are validated with a schema (trimmed, 1 to 500 characters, control characters stripped). Rate limit is a token bucket of 5
  messages burst and 1 per second sustained per player; rejected sends return a coded error the UI shows. The client renders
  all text as text (React escapes by default), never as HTML. System announcements are server-generated.
- **Rationale**: FR-025 to FR-031 and the constitution's server-authority principle; also covers the markup-injection edge case
  (OWASP injection/XSS).

## R9. Frontend stack and visual system

- **Decision**: React 19 with Vite and TypeScript; `react-router` for `/` and `/room/:gameId/:roomId`; plain CSS with custom
  properties (no component library). Animations use CSS transitions, keyframes, and the Web Animations API. All art (game
  cards, pawns, dice, avatars) is authored as inline SVG and CSS so there are no licensing or loading concerns. Sound effects
  are generated with the Web Audio API (short synthesized blips), toggled from the header and remembered in `localStorage`.
- **Rationale**: The constitution makes graphics a Tier-1 requirement. A component model lets a game's board "mount directly
  inside" the room wrapper (Principle IV). Framework-free CSS keeps the bundle small for free-plan bandwidth and mobile loads.
  The reference image's art cannot be reused, so custom SVG art is designed to match its style.
- **Alternatives considered**: Tailwind or a UI kit (faster generic UI, but harder to reach the bespoke neon arcade look and
  adds weight); a canvas or game engine for the Hub (unnecessary for cards and modals; reserved for game boards later).

## R10. Responsive layout and screen-space strategy

- **Decision**:
  - Hub grid: `repeat(auto-fit, minmax())` with equal card size. One column on phones and a 2x2 grid on tablets and standard
    desktops; one row on very wide screens (width of four cards or more) with identical card dimensions.
  - Room shell: CSS grid with named areas that change by viewport shape. Landscape or wide: game stage on the left,
    chat docked right. Portrait phone: stage on top, chat as a bottom drawer. The stage is a square sized to the largest value
    that fits (`min()` of available width and height using `dvh`/container units), so the board never scrolls or clips.
  - `env(safe-area-inset-*)` padding; `dvh` units so mobile browser bars do not break height; `prefers-reduced-motion`
    replaces motion with static feedback.
- **Rationale**: FR-007, FR-028, FR-033 and constitution Principle II (maximum screen use by device and orientation).

## R11. Security and abuse controls (OWASP-oriented)

- **Decision**: `helmet` headers with a Content Security Policy (`default-src 'self'`, `connect-src 'self' wss:`); Express
  `trust proxy` so rate limits see client IPs behind Render's proxy; schema validation (zod) on every inbound event and
  rejection of unknown fields; per-IP and per-connection rate limits on room creation, joins, and chat; caps on total rooms
  (100) and per-room connections (capacity); host-only events authorized server-side; same-origin only Socket.IO (no wildcard
  CORS); no secrets in source (the app needs none).
- **Rationale**: Constitution Principle V and the security requirements (broken access control, injection, DoS). No auth
  system is needed (guests only).

## R12. Observability

- **Decision**: Structured one-line JSON logs to stdout (Render captures them) for room lifecycle, host changes, rejected
  actions, and shutdown. The health route also reports uptime and current room and connection counts.
- **Rationale**: Enough to diagnose the free-plan behaviour (sleeps, restarts) without adding a metrics stack.

## R13. Testing approach (constitution Principle III)

- **Decision**: No unit or integration suites. One small headless smoke script (`npm run smoke`) drives two real Socket.IO
  clients through create, join, presence, chat, capacity rules, host handover, and reconnect against a running server. It
  covers the multi-client checks the constitution requires, which are slower and less repeatable by hand. Everything else is
  verified manually through the quickstart (visuals at phone, tablet, and desktop sizes in portrait and landscape, and the
  Render deployment checks).
- **Rationale**: The script is cheaper than repeating a two-browser test on every change, as Principle III permits, and avoids
  mock harnesses.

## R14. Render configuration

- **Decision**: A `render.yaml` Blueprint defines one `web` service: Node runtime, `plan: free`, build command
  `npm ci && npm run build`, start command `npm start`, `healthCheckPath: /healthz`, and `NODE_VERSION`. The server reads
  `PORT` (Render's default is 10000) and binds `0.0.0.0`; locally it defaults to 10000 as well.
- **Rationale**: FR-035 to FR-037 and constitution Principle I. A health check lets Render hold traffic on the old instance
  until the new one reports healthy, which is how zero-downtime deploys work. It reports unhealthy (503) until the server is
  listening and initialized. Zero-downtime replacement on the Free plan is assumed from the health check and is verified in
  task T093.
