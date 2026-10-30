# Research: Base Platform and Experience

All Technical Context unknowns are resolved. The one spec open decision (overall capacity) was
settled with the product owner on 2026-10-29: 20 concurrent rooms and 200 total connected
participants, with up to 100 in one room.

## R1. Delivery and hosting

- **Decision**: One Render web service (paid, always-on, single instance) runs the Node.js
  server, which also serves the built React app. Health check at `/healthz`.
- **Rationale**: Same origin means HttpOnly cookies work without CORS, and WebSockets and REST
  share one deployment. Render supports WebSocket connections on web services. Free-tier
  services spin down when idle, which would destroy in-memory rooms, so a non-free instance
  is required.
- **Alternatives considered**: Render static site plus separate web service (cross-origin
  cookies, CORS, and two deploy units for no benefit); multi-instance (needs shared state).
- **Known limitation**: A deploy or restart drops all rooms. Clients get a clear "room
  unavailable" result. Acceptable at friends-and-family scale; revisit if it becomes a pain
  point.

## R2. State storage (PostgreSQL and Redis)

- **Decision**: Hold room, participant, chat, and recovery state in memory behind a
  `RoomStore` port. Do not use PostgreSQL or Redis in this feature.
- **Rationale**: FR-024 requires deleting room data, chat, and recovery data at closure and
  the spec stores no profiles, history, or statistics. All state is transient, and 200
  participants fit comfortably in one process (Principle X).
- **PostgreSQL**: Deferred to the first feature that needs durable data (player profiles,
  match history, scores, statistics). Nothing here blocks adding it.
- **Redis trigger**: Introduce only if (a) more than one server instance is needed, (b)
  load acceptance misses SC-010 on one instance, or (c) rooms must survive restarts. Until
  then it is not introduced.
- **Alternatives considered**: PostgreSQL for room state (adds migrations and TTL deletion for
  data that must not outlive the room); Redis for recovery records (extra moving part with
  no current benefit).

## R3. Membership authentication without accounts

- **Decision**: On create or join, the server issues a 256-bit random opaque member token. It
  is stored only as a SHA-256 hash, compared in constant time, and sent as a cookie:
  `HttpOnly; Secure; SameSite=Strict; Path=/`, one cookie per room. The same token
  authenticates the WebSocket and recovery.
- **Rationale**: FR-023 forbids display names or client IDs as authentication. An HttpOnly
  cookie is not readable by page scripts, which limits XSS theft, and survives refresh and
  phone resume. `SameSite=Strict` and an `Origin` check cover CSRF.
- **Alternatives considered**: Token in `localStorage` (readable by any injected script);
  token in the WebSocket URL (leaks into logs and history); signed JWT (cannot be revoked at
  leave or expiry without server state, which the server already holds).
- **Notes**: Cookie lifetime is not the recovery window. The server enforces the 10 minutes.
  Cookies are cleared on leave and room closure.

## R4. Room codes and invitations

- **Decision**: A 10-character code from a 32-character unambiguous alphabet (50 bits)
  from a CSPRNG. The invite link is `/join/<code>`. The host can regenerate the code, which
  revokes the old one. Join and preview attempts are rate limited per IP.
- **Rationale**: Private-by-unguessability (Principle I) with a code that is typeable on a
  phone. At most 20 live rooms against 2^50 possible codes, plus rate limits, makes guessing
  impractical.
- **Error disclosure**: Invalid, revoked, expired, and closed invitations return one
  `INVITATION_UNAVAILABLE` result so room existence and state are not disclosed. Only a full
  room returns a distinct `ROOM_FULL` result, as FR-019 requires a clear capacity rejection.
- **Alternatives considered**: 6-character codes (too guessable); separate long link token
  (more complexity with no extra privacy at this scale).

## R5. Real-time transport and state synchronization

- **Decision**: One WebSocket per participant with JSON messages validated by shared Zod
  schemas. The server holds a monotonic `roomVersion`. It sends a full snapshot on connect
  and resync, then ordered delta events. A client that sees a version gap requests `resync`.
- **Rationale**: Snapshot plus deltas gives fast updates (SC-010) and simple, correct
  recovery after interruption. Versioning also makes accepted-vs-rejected outcomes
  verifiable.
- **Heartbeat**: The server pings every 20 seconds and marks a participant disconnected
  after two missed intervals or on socket close, which also keeps idle proxies from dropping
  the connection. Clients reconnect on `visibilitychange`, `pageshow`, and `online` with
  exponential backoff and jitter.
- **One connection per participant**: A new connection supersedes the old one (close code
  4009).
- **Limits**: 4 KB maximum frame, chat messages up to 500 characters, per-participant
  intent rate limits, bounded chat history of the last 200 messages.
- **Alternatives considered**: Server-Sent Events plus REST (two channels to keep in
  order); Socket.IO (extra protocol and bundle weight; plain `ws` is sufficient); Redis
  pub/sub (not needed for one instance).

## R6. Idempotency and no duplicate actions

- **Decision**: Every client intent carries a `clientActionId` (UUID). The server remembers
  each participant's recent action results (the last 100 or 10 minutes, whichever is
  smaller) and returns the original ack for a repeat. REST create and join accept an
  `Idempotency-Key` header.
- **Rationale**: Covers refresh, resume, and network loss during create, join, ready, chat,
  start, and handoff (FR-011, SC-004). After reconnect the client resends unacknowledged
  intents and gets the original result instead of a second effect.
- **Alternatives considered**: Rely on client dedup (untrusted); at-most-once with no retry
  (the user cannot tell whether an action succeeded).

## R7. Recovery, handoff, and closure policy

- **Decision** (the published policy required by FR-013 and the edge cases):
  - Disconnect starts a 10-minute recovery window. Reconnect inside it restores the seat,
    role, readiness, and state. After it expires, the seat and recovery record are deleted
    (FR-024). A returning client that still presents that room's member cookie is rejected
    with `RECOVERY_EXPIRED` and nothing is restored (FR-025). Join requests that carry the
    cookie of a room they no longer hold a seat in are rejected the same way.
  - Because accounts are not used and recovery data is deleted at expiry, the server cannot
    recognize a visitor who clears the cookie and joins through a valid invitation. That
    visitor is a new participant with a new seat, not a restoration. This was confirmed
    for FR-025 on 2026-10-29.
  - Explicit Leave releases the seat immediately and deletes that recovery record.
  - If the host leaves or their window expires, the host role transfers to the eligible
    participant who holds a seat, preferring connected participants, then earliest
    `joinedAt`. If none exists, the room closes.
  - A room closes when the host closes it, when no seat holders remain, or when no
    handoff is possible. Closure deletes room, chat, and recovery data and cookies are
    cleared on next contact.
- **Rationale**: Gives a deterministic single-host outcome with no global admin and meets
  FR-010 through FR-013, FR-024, and FR-025.
- **Alternatives considered**: Hold the room open indefinitely with no host (violates the
  published handoff requirement); let expired participants rejoin (forbidden by FR-025).
- **Removal**: The host can remove another member (FR-005). Removal releases the seat and
  deletes recovery data immediately, closes the member's socket with 4012, and is not a ban:
  the removed browser clears its credential through Leave and can only return as a new
  participant through a valid invitation. The host can regenerate the invitation to stop
  that.

## R8. Server-authoritative boundary with games

- **Decision**: `packages/game-sdk` exposes only a `GameDescriptor` (id, name, minimum and
  maximum participants, settings schema) and a lifecycle contract (`onMatchStart`,
  `onMatchEnd`). The room module starts and ends matches through it and contains no game
  rules. A test-only stub game exercises start and rematch.
- **Rationale**: FR-020 and Principle VIII. Turns, moves, timers, scores, and 3D are
  defined with the first game that needs them (Ludo), so the SDK is shaped by real use.
- **Match end**: The lifecycle passes `onMatchStart` a `MatchContext` with `endMatch()`.
  A game calls it when its rules finish a match, and the platform sets the match to
  `ENDED`, calls `onMatchEnd`, and enables rematch. The stub game ends after a
  `durationSeconds` setting (1 to 3600, default 30).
- **Match start policy**: The host can start when a game is selected, the participant count
  is within the game's range, and every PLAYER seat is connected and ready. Otherwise the
  host gets a specific reason. Rematch is available after the match has ended.
- **Alternatives considered**: Build the full SDK now (speculative and likely wrong before
  game 1).

## R9. Front-end approach

- **Decision**: React 19 with TypeScript and Vite. Routes: entry, join, and room. Room
  state is held in a reducer fed by the WebSocket client. Plain CSS with custom properties
  gives light and dark themes, `prefers-color-scheme` as default, and a manual override.
  Layout uses CSS grid and `dvh` units and respects safe areas, so orientation changes
  reflow without horizontal overflow.
- **Accessibility**: Native elements first, visible focus rings, `aria-live` regions for
  status and errors, focus moved to the error summary on failure, and a
  `prefers-reduced-motion` hook that removes non-essential motion. Automated axe checks
  complement manual keyboard, screen-reader, and reduced-motion acceptance.
- **Babylon.js**: Not used in this feature. It will be code-split and lazy-loaded by game
  features so it never loads for entry or lobby.
- **Alternatives considered**: Component kit (extra weight, still needs a11y verification);
  Next.js (server rendering not needed for a private-room SPA).

## R10. Browser support

- **Decision**: browserslist targets the current and previous major versions of Chrome, Edge,
  Firefox, Safari, Chrome for Android, and iOS Safari. All iOS browsers use WebKit, so
  iPhone acceptance uses Safari and records any additional browsers tested.
- **Rationale**: Matches the clarified policy in FR-014. The exact OS and browser release
  matrix is recorded at acceptance planning.

## R11. Security controls

- **Decision**: Helmet with a strict CSP (self-only scripts, no inline scripts); WebSocket
  and state-changing REST `Origin` allow-list; per-IP rate limits on create, join, and
  preview; per-participant limits on intents and chat; request size limits; text-only chat
  rendering (React escaping, no HTML); display names NFC-normalized and stripped of control
  and bidirectional override characters; Pino redaction for tokens, cookies, and invitation
  codes; secrets only in Render environment variables, never committed.
- **Rationale**: Principle V, FR-018, FR-023, and the OWASP Top 10 categories that apply to
  an account-free real-time app: access control, injection and XSS, and logging.
- **Alternatives considered**: CAPTCHA on join (friction against the 2-minute goal;
  revisit if abuse appears).

## R12. Testing and evidence

- **Decision**: Vitest unit tests for rooms, auth, and policy logic; server integration
  tests with real WebSocket clients for authority, privacy, recovery, expiry, handoff
  races, and idempotency; contract tests against `contracts/`; Playwright multi-context E2E
  with axe for core journeys (emulation is development-only); a load harness for capacity
  (SC-009, SC-010); manual real-device records in `acceptance/` covering device, OS, browser
  and version, tester, date, and scenario outcomes (FR-021, FR-022).
- **Rationale**: Principle IX and the quality gates require automated tests for
  authority, reconnection, and permissions where practicable, and manual evidence for the
  rest.
- **Note**: Emulated viewports never count toward SC-003 or SC-006.
