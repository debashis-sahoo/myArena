# myArena

myArena is a multiplayer game platform: a colorful **myArena Hub**, private rooms with shareable invite links, a single
authoritative host per room, real-time presence and chat. Ludo, Housie, Bingo and UNO are live on the Hub; Snakes & Ladders is
coming soon.

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
| `specs/003-housie-tambola-module/` | Housie: spec, plan, contracts, tasks, quickstart, mockups and verification notes |
| `specs/005-bingo-75-ball-module/` | Bingo: spec, plan, contracts, tasks, quickstart and verification notes |
| `specs/006-uno-game-module/` | UNO: spec, plan, contracts, tasks, quickstart, verification notes and screenshot evidence |

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

Ludo's Chat shows only what people type, plus an occasional playful line from the server (one every 45 to 90 seconds while someone is
connected); rolls, moves, captures, connection changes and the like are listed in the **Activity** tab. When a match ends, the host can
press **Play again**, which deals a new match at once to everyone still seated (at least two players), skipping the lobby.

## Housie (Tambola)

Play Online from the Hub. The host sets the player limit (2 to 200, counting the host), the most tickets each person may take
(1 to 4, default 1), whether the host also plays, how balls are called (manual, or automatically every 5, 8 or 10 seconds) and
which of 40 winning combinations are in play. The server generates valid, unique 3 x 9 tickets, draws every ball and checks every
claim; players cross numbers by hand and press CLAIM on a combination tile, which is valid only if every cell of that pattern on
the chosen ticket is both called and crossed. The match screen is two columns in landscape (tickets over combinations; ball
console over chat) and stacked with a chat drawer in portrait, with no page scrolling. Chat shows only typed messages and one line
per accepted win during a match. Design, protocol and the browser verification guide are in
[specs/003-housie-tambola-module](specs/003-housie-tambola-module/).

## Bingo (75-ball)

Play Online from the Hub. The host sets the player limit (2 to 200, counting the host), the most cards each person may take
(1 to 3, default 1), whether the host also plays, how balls are called (manual, or automatically every 5, 8 or 10 seconds) and
which of 27 winning patterns are in play, in four groups: Standard (Single Line, Four Corners, Letter X, Letter L, Blackout), Letters (T, H, Z, N, C, U,
I, Y), Shapes (Postage Stamp, Diamond, Kite, Inner Square, Plus Sign, Picture Frame, Heart, Pyramid, Checkers, Railroad Tracks, Sandwich, Four Stamps,
Dice Five) and Multi-line (Two Lines). The server generates valid, unique 5 x 5 cards on the standard 75-ball distribution, draws every ball
(shown as a letter and number such as G-54) and checks every claim. Players daub called numbers by hand (the FREE space is already
marked, as on a paper card), and press one BINGO! button: the server checks the selected card against every open pattern,
awards each one it completes, and only counts cells that are FREE or both called and daubed. The match screen is two columns in
landscape (cards over patterns; ball console over chat), a compact two-column layout on landscape phones, and stacked with a chat
drawer in portrait, with no page scrolling. Chat shows only typed messages; the server never writes a system line during a match.
Design, protocol and the browser verification guide are in [specs/005-bingo-75-ball-module](specs/005-bingo-75-ball-module/).

## UNO

Play with AI (1 to 4 bots, 3 preselected, the table opens at once) or Play Online (2 to 5 players, 4 preselected, with an invite
link). In an online lobby the host can press **Fill empty slots with AI**, which seats a bot in every open slot and starts the match
at once. The table shows the discard and draw piles as large as the screen allows, a glowing aura in the active colour, direction
arrows, every opponent with a card count, and your own hand as a fan along the bottom (it tightens and scrolls sideways inside its
band when it grows). Tap or click a playable card to throw it; Wild and Wild Draw 4 open a four-colour wheel.

Rules in short: match the top card by colour, number or symbol; Skip, Reverse (acts as Skip with two players), Draw 2, Wild and Wild
Draw 4 work as in the classic game. **Draw 2 stacks only on a Draw 2 and Wild Draw 4 only on a Wild Draw 4**, a Wild Draw 4 may be
played at any time, and a player who cannot stack draws the whole running total and loses the turn. Press **UNO!** when you are down
to one card; anyone who forgets can be caught with **Catch** during a fixed **5-second window** and draws 2 cards. A turn has a
30-second countdown: a miss draws one card and passes, a warning shows after two misses and the seat is released after three.
The server is authoritative for every deal, draw and move, and never sends another player's hand or the draw-pile order to a
client. At the end the standings show and the host can press **Play again**, which deals a new match at once with the first player
moving one seat. Chat shows only typed messages in online rooms and is hidden in solo rooms. Design, protocol and the browser
verification guide are in [specs/006-uno-game-module](specs/006-uno-game-module/).

A turn strip always says whose turn it is (and what is pending, such as a Draw 2 to stack), your hand is framed on your turn, and a
tapped card lifts at once and is thrown only when the server confirms the move. In online rooms the chat can be minimized to a narrow
rail (or closed, on phones) and restored without losing the half-typed message or the unread count.

## Audio

Every room header and the Hub header have one audio button that opens two controls: **Sound effects** and **Music**, each with its own
switch and a 0 to 100% volume slider. By default Sound is on at 80% and Music is off at 30%. Choices stay on this device (they
survive reloads and changing games). Music is optional and generated in the browser (a different theme for Ludo, Housie, Bingo and UNO;
no audio files); it plays only while a game is open and the page is visible. Browsers only allow audio after a tap or key press, so a
room opened directly with Music on starts it on your first tap.

## Environment variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | `10000` | Listening port (Render provides it). The server binds `0.0.0.0` |
| `NODE_ENV` | `development` | Set to `production` on Render |
| `LOG_LEVEL` | `info` | Log verbosity (JSON lines on stdout) |
| `MAX_ROOMS` | `100` | Cap on live rooms |
| `RECONNECT_WINDOW_MS` | `60000` | How long a disconnected player keeps their seat |
| `REMOVAL_COOLDOWN_MS` | `60000` | How long a removed player must wait before rejoining |
| `HOUSIE_MAX_PLAYERS` | `200` | Optional. The most people a Housie room may hold (2 to 500); raise or lower it without code changes |
| `BINGO_MAX_PLAYERS` | `200` | Optional. The most people a Bingo room may hold (2 to 500); independent of `HOUSIE_MAX_PLAYERS` |
| `MAX_SOCKETS` | `1500` | Optional. New rooms and new seats are refused (`SERVER_BUSY`) above this many connections; returning players are never refused |

No secrets are required.

### Ludo development-only variables

These make browser verification repeatable. They are read only when `NODE_ENV` is not `production`; **production ignores them**
(and logs a warning at startup if they are set), so no environment or client can influence real results.

| Variable | Example | Effect |
|----------|---------|--------|
| `LUDO_DEV_DICE` | `6,6,4,6,3,2,6` | Die values used in order for each new match, then random dice resume |
| `LUDO_DEV_SCENARIO` | `endgame` | Each player starts with three pawns home and one at progress 50 |
| `LUDO_TURN_MS` | `3000` | Replaces the 15 s countdown (auto-play, warning and removal checks) |
| `LUDO_DEV_HUMOR_MS` | `2000` | Replaces the 45 to 90 s gap between humor lines in Ludo's Chat (at least 500) |

```powershell
$env:LUDO_DEV_DICE = "6,6,4,6,3,2,6"; npm start
```

### Housie development-only variables

Same rule as above: read only outside production, ignored (with a startup warning) in production.

| Variable | Example | Effect |
|----------|---------|--------|
| `HOUSIE_DEV_DECK` | `first-ticket` | The call order starts with the first seated ticket holder's first ticket (row by row), so a valid claim is reproducible |
| `HOUSIE_DEV_BALLS` | `42,7,19` | The call order starts with these numbers |
| `HOUSIE_DEV_TICKET_AUDIT` | `500` | At start-up, generates N tickets and logs how many are valid and unique |
| `HOUSIE_CLAIM_PACE_MS` | `300` | Replaces the 2000 ms pause between a player's claims |

### Bingo development-only variables

Same rule as above: read only outside production, ignored (with a startup warning) in production.

| Variable | Example | Effect |
|----------|---------|--------|
| `BINGO_DEV_DECK` | `first-card` | The call order starts with the first seated card holder's first card (top row first, then row by row, skipping FREE), so a valid claim is reproducible |
| `BINGO_DEV_BALLS` | `54,7,19` | The call order starts with these numbers |
| `BINGO_DEV_CARD_AUDIT` | `500` | At start-up, generates N cards and logs how many are valid and unique |
| `BINGO_CLAIM_PACE_MS` | `300` | Replaces the 2000 ms pause between a player's claims |

### UNO development-only variables

Same rule as above: read only outside production, ignored (with one startup warning naming them) in production, so real deals,
bot pauses, countdowns and UNO! behaviour can never be influenced.

| Variable | Example | Effect |
|----------|---------|--------|
| `UNO_DEV_DECK` | `wild` | A fixed opening deal for repeatable checks (seat 1 is the host): `wild` (a Wild and a Wild Draw 4 plus red numbers), `reverse` (a red Reverse plus red numbers), `uno` (two cards, one play from UNO!), `stack` (the first two seats each hold a Draw 2 and a Wild Draw 4), `short-pile` (a 4-card draw pile, so the discard pile is reshuffled), `endgame` (one card, so the first play wins) |
| `UNO_DEV_BOT_MS` | `500` | Replaces the 1.5 to 2.0 s bot pause (and the catch delay) with this many milliseconds |
| `UNO_DEV_TURN_MS` | `3000` | Replaces the 30 s turn countdown (auto-draw, warning and removal checks) |
| `UNO_DEV_FORGET` | `always` | `always` makes bots forget to call UNO!, `never` makes them always call; unset keeps the random mix |
