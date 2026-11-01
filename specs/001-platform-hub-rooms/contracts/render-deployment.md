# Contract: Render Deployment

Production target: one Render **Web Service** on the **Free** plan (spec clarification, constitution Principle I). The
repository root contains a `render.yaml` Blueprint so deployment needs no manual dashboard configuration (FR-037).

## Service definition (target `render.yaml`)

| Setting | Value | Why |
|---------|-------|-----|
| Type | `web` | Accepts WebSocket upgrades on the public URL |
| Runtime | `node` (Node.js 22 LTS via `NODE_VERSION`) | Matches the project runtime |
| Plan | `free` | Per clarification; paid plans need no code change |
| Build command | `npm ci && npm run build` | Installs workspaces, builds shared, server, and client |
| Start command | `npm start` | Single production start command (FR-035) |
| Health check path | `/healthz` | Zero-downtime deploys and readiness (FR-036) |
| Auto deploy | on commit to the main branch of `https://github.com/debashis-sahoo/myArena.git` | Repository requirement |
| Region | any single region | Free plan runs one instance |

## Environment variables

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `PORT` | provided by Render (10000) | `10000` locally | Listening port; the server binds `0.0.0.0` (FR-035) |
| `NODE_ENV` | set in `render.yaml` | `development` | Enables production behaviour (HSTS, caching, quieter logs) |
| `NODE_VERSION` | set in `render.yaml` | n/a | Pins the Node runtime on Render |
| `LOG_LEVEL` | optional | `info` | Log verbosity |
| `MAX_ROOMS` | optional | `100` | Cap on live rooms (research R11) |
| `RECONNECT_WINDOW_MS` | optional | `60000` | Reconnect window (FR-018); shortened for the smoke script |
| `REMOVAL_COOLDOWN_MS` | optional | `60000` | Removed-player cooldown (FR-019); shortened for the smoke script |

No secrets are required by this feature. Any future secrets must be set in Render's dashboard, never committed.

## Runtime behaviour required on Render

1. **Port binding**: read `PORT`, bind `0.0.0.0`, fall back to 10000 only when unset.
2. **Readiness**: `/healthz` returns 503 until the HTTP server and room store are ready, then 200.
3. **Graceful shutdown**: on `SIGTERM` the server reports `draining`, sends `server:restarting`, closes sockets, and exits
   within Render's 30-second window. Rooms end with the process (research R4); reconnecting clients see "room ended".
4. **Keepalive**: Socket.IO heartbeat (4 s interval, 4 s timeout) keeps inbound traffic flowing whenever a room has a
   connected participant, which prevents the 15-minute free-plan spin-down (research R3, FR-039 to FR-041). Nothing is sent
   when no room has a participant.
5. **Proxy awareness**: `trust proxy` is enabled so client IPs are correct for rate limiting behind Render's proxy.
6. **Secure transport**: the client connects relative to the page origin so it uses `wss` in production.
7. **Cold start**: the client shows a "waking up" state and retries for about 90 seconds (research R4, FR-042).

## Deployment verification (maps to constitution quality gates)

Local-only checks do not count as deployment verification. On the deployed URL the quickstart verifies: startup and
readiness, WebSocket connectivity, a two-client room, a 30-minute idle room with no disconnects (SC-011), and a redeploy with
clients reconnecting to a clear "room ended" state.
