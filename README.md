# myArena

myArena is a multiplayer game platform: a colorful **myArena Hub**, private rooms with shareable invite links, a single
authoritative host per room, real-time presence and chat. Ludo is the first game on the Hub; Snakes & Ladders, Housie and
Bingo are coming soon.

Repository: https://github.com/debashis-sahoo/myArena.git

## What is in this repo

| Path | Purpose |
|------|---------|
| `shared/` | Types and constants shared by client and server (wire protocol, game registry, limits) |
| `server/` | Node.js service: HTTP, Socket.IO, room engine (authoritative), health check |
| `client/` | React + Vite single-page app (Hub, launch modal, room, chat) |
| `render.yaml` | Render Blueprint for the production web service |
| `specs/001-platform-hub-rooms/` | Spec, plan, contracts, tasks and verification notes |
| `specs/002-ludo-game-module/` | Ludo: spec, plan, contracts, tasks, quickstart and verification notes |

The server serves the built client from the same origin, so production needs one process, one port and no CORS.

## Run locally

Requires Node.js 22 or newer.

```powershell
npm install
npm run dev          # shared watch + server on :10000 + Vite on :5173 (open http://localhost:5173)
```

Production-style run (what Render does):

```powershell
npm run build
npm start            # http://localhost:10000
```

Open `/healthz` to confirm it is ready (`{"status":"ok", ...}`).

## Checks

```powershell
npm run smoke                  # headless two-client check of the room engine (starts its own server)
npm run smoke -- --rooms 50    # optional load check: 50 rooms, about 200 sockets
```

Both need `npm run build -w shared -w server` first. Visual and multi-device checks are manual: see
[specs/001-platform-hub-rooms/quickstart.md](specs/001-platform-hub-rooms/quickstart.md).

## Deploy to Render

1. In Render choose **New > Blueprint** and connect `https://github.com/debashis-sahoo/myArena.git`. Render reads
   `render.yaml` (Web Service, Free plan, build `npm ci --include=dev && npm run build`, start `npm start`, health check
   `/healthz`).
2. After the first deploy, open the service URL and run the Render checks in the quickstart.

Notes for the Free plan:

- The service sleeps after about 15 minutes without inbound traffic and takes about a minute to wake. While anyone is in a
  room, the Socket.IO heartbeat (every 4 s) keeps the connection and the service awake. The site shows "Waking up the
  arena" while it starts.
- A redeploy or restart ends all rooms. Players see a "room ended" screen and can start a new one.

## Ludo

Start a match from the Hub (Play with AI, or Play Online with an invite link). The match screen shows a 15 x 15 board that is
always the largest square that fits (three columns in landscape, stacked with a chat drawer in portrait), a 3D-style die
and hopping pawns. The server decides every roll and move; clients only send `roll` and `move` intents. Rules, timing, and the
wire protocol are in [specs/002-ludo-game-module](specs/002-ludo-game-module/); the browser verification guide is
[quickstart.md](specs/002-ludo-game-module/quickstart.md).

## Environment variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | `10000` | Listening port (Render provides it). The server binds `0.0.0.0` |
| `NODE_ENV` | `development` | Set to `production` on Render |
| `LOG_LEVEL` | `info` | Log verbosity (JSON lines on stdout) |
| `MAX_ROOMS` | `100` | Cap on live rooms |
| `RECONNECT_WINDOW_MS` | `60000` | How long a disconnected player keeps their seat |
| `REMOVAL_COOLDOWN_MS` | `60000` | How long a removed player must wait before rejoining |

No secrets are required.

### Ludo development-only variables

These make browser verification repeatable. They are read only when `NODE_ENV` is not `production`; **production ignores them**
(and logs a warning at startup if they are set), so no environment or client can influence real results.

| Variable | Example | Effect |
|----------|---------|--------|
| `LUDO_DEV_DICE` | `6,6,4,6,3,2,6` | Die values used in order for each new match, then random dice resume |
| `LUDO_DEV_SCENARIO` | `endgame` | Each player starts with three pawns home and one at progress 50 |
| `LUDO_TURN_MS` | `3000` | Replaces the 15 s countdown (auto-play, warning and removal checks) |

```powershell
$env:LUDO_DEV_DICE = "6,6,4,6,3,2,6"; npm start
```
