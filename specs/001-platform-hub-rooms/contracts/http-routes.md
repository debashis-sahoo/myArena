# Contract: HTTP Routes

The service exposes only a few HTTP routes. All room behaviour uses the real-time channel
([realtime-events.md](realtime-events.md)).

| Method and path | Purpose | Response |
|-----------------|---------|----------|
| `GET /healthz` | Render health check and readiness probe (FR-036) | See below |
| `GET /assets/*`, `GET /favicon.*` and other built static files | Client bundle, art, fonts | Static files with long-lived caching for hashed assets |
| `GET /` and `GET /room/:gameId/:roomId` (and any other non-API path) | Single-page app entry; the client router decides what to show | `index.html`, never cached |
| Socket.IO upgrade (default path) | Real-time channel | WebSocket / polling |

## `GET /healthz`

- No authentication, no session, no cookies (FR-036).
- Must respond in well under one second and must not touch room state in any blocking way.
- **200** while ready:

  ```json
  { "status": "ok", "uptimeSec": 1234, "rooms": 3, "connections": 7 }
  ```

- **503** before the server has finished starting (`{ "status": "starting" }`) and after `SIGTERM` while draining
  (`{ "status": "draining" }`). This lets Render keep routing to the old instance until the new one is ready and stop
  sending new traffic to an instance that is shutting down.
- The route is excluded from request logging noise (logged at debug level only).

## Security headers

- `Content-Security-Policy`: `default-src 'self'`; `connect-src 'self' wss:`; `img-src 'self' data:`;
  `style-src 'self' 'unsafe-inline'` only if inline styles are required by the animation approach; `frame-ancestors 'none'`.
- `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, HSTS in production.
- No CORS headers: the client is always same-origin.
- Static responses must not reveal framework or version details.

## Client routes

| Path | Screen |
|------|--------|
| `/` | myArena Hub (header, guest profile, audio toggle, four game cards, launch modal) |
| `/room/:gameId/:roomId` | Universal room shell. Handles lobby, in-progress placeholder, join errors (not found, full, in progress, removed), and reconnecting banner |

Unknown game IDs or malformed room IDs in the path show the same "room not found" screen, so the server never needs a route
per room.
