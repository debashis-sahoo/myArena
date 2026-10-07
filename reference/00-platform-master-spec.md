# myArena Royalty — Platform Master Specification

| | |
|---|---|
| **Product** | myArena Royalty — *"Your friends. Your arena."* |
| **Document** | Base platform (shared by every game) |
| **Version** | 1.2.0 |
| **Game specs** | [Ludo Royalty](./01-ludo-spec.md) · [Snakes & Ladders](./02-snakes-and-ladders-spec.md) · [Housie / Tambola 90](./03-tambola-spec.md) |

This document defines everything the games share: roles, screens, room lifecycle, real-time sync, dice, movement, chat, resilience, security, the HTTP/SSE contract and deployment. Each game spec covers only what is specific to that game.

---

## 1. Product overview

myArena Royalty is a browser-based social board-game arcade. Friends open a link on any phone or desktop and play together instantly, with no accounts and no installs.

**Product principles**

1. **Zero friction.** Pick a display name and play; a room code or invite link is all a friend needs.
2. **Server is the referee.** Every roll, move, draw and claim is decided by the authoritative engine on the server. Clients only display and request.
3. **Fair and private.** Dice use unbiased cryptographic randomness. Players only ever receive the information they are entitled to see (for example, their own Tambola ticket).
4. **Readable motion.** Nothing moves before the die is at rest. Pieces hop square by square so every player can follow what happened.
5. **Resilient on cheap hosting.** Games survive server restarts, deploys, idle spin-downs and flaky mobile connections.
6. **Accessible and responsive.** Keyboard operable, screen-reader friendly, honours *reduce motion*, and the board scales from phones to large monitors.

**Games**

| Game | Players (online) | Solo mode | Spec |
|---|---|---|---|
| Ludo Royalty | 2–4 | You vs 3 AI bots | [01-ludo-spec.md](./01-ludo-spec.md) |
| Snakes & Ladders | 1–4 | You vs 1 AI bot | [02-snakes-and-ladders-spec.md](./02-snakes-and-ladders-spec.md) |
| Housie / Tambola 90 | 1–50 | You alone (practice) | [03-tambola-spec.md](./03-tambola-spec.md) |

A *Future Arena Catalog* (Draw & Guess, Royal Chess, Royal Yacht Dice, Four-in-a-Row) is shown on the landing page as **Coming soon** with disabled buttons; none of them can be launched.

---

## 2. Roles

| Role | Who | Can do |
|---|---|---|
| **Guest / Player** | Anyone who joins a room with its code | Pick a hero, mark ready, play their turns, chat, leave, read the briefing |
| **Host (room admin)** | The player who created the room; passes automatically to the next player if the host leaves | Everything a player can, plus: configure game rules at creation, change Tambola game setup in the lobby, **Start Game**, start a **Rematch** |
| **Caller** (Tambola only) | The host | Draw numbers manually or run the timed auto-caller |
| **AI bot** (solo only) | Local opponents | Roll and move automatically after short "thinking" delays |

There are no accounts and no persistent profiles; identity is a display name plus a per-room secret reconnect token held by the browser.

---

## 3. Screens and navigation

```
Landing ──► Create Room modal ──► Lobby ──► Game stage ──► Results modal
   │              │  (solo) ───────────────►   │   ▲              │
   │              └─► 🎯 Tambola Game Setup     │   └─ Rematch ◄───┤
   └─► Join Room modal ──► Lobby                └─► Leave ──► Landing
```

### 3.1 Header (always visible)
- **Wordmark** (myArena Royalty, tagline and the version badge, e.g. `v1.2.0`). Clicking it returns home; inside a room it **leaves the room** first.
- **🔊 Sound** toggle (persisted).
- **✨ Effects** toggle: *3D Lighting* vs *Flat 2D High-Performance Mode*. Effects off also pauses idle board animation (e.g. slithering snakes).
- **Profile pill** (hero emblem + display name) opens *Player Identity*.

### 3.2 Landing
- Hero call-to-actions: **✨ Create Private Room**, **🔑 Join with Room Code**, **🤖 Play Solo vs AI** (instant solo Ludo).
- *Playable Games* cards with player counts, duration and a **Play** button that opens Create Room pre-set to that game.
- *Future Arena Catalog* cards (disabled, "Coming soon").
- Opening a link with `?room=ROYAL-XXXX` opens the Join modal with the code pre-filled.

### 3.3 Create Room modal (admin setup)
| Field | Options |
|---|---|
| Select Game | Ludo / Snakes & Ladders / Tambola |
| Mode | **Online Multiplayer** (private room) or **Solo Play** (vs local AI) |
| Player Capacity | 2, 3, 4 (all games); 6, 8, 10, 20, 30, 40, 50 (Tambola only — disabled for other games) |
| Hero Miniature | Iron Armor ⚛, Vibranium Shield ★, Gamma Titan ✊, Thunder God ⚡ |
| Regional Rule Presets | Game-specific (see each game spec). Tambola shows a **🎯 Game Setup** button instead. |

### 3.4 Join Room modal
Room code **or** a full invite link, display name (max 20 characters) and hero. A browser that already holds a reconnect token for that room rejoins its existing seat instead of creating a new one.

### 3.5 Lobby
- Header card: game title, **room code**, **📋 Copy Invite Link**, **Leave**, **Mark Ready / Unready**, and (host only) **Start Game ⚔️**.
- **Player briefing card** (see §6) — personalised for the viewer.
- **Participants (n/max)**: hero emblem, name, Host tag, status (✓ Ready / ⏳ Waiting / ○ Reconnecting). The viewer's own card is highlighted.
- **Active Game Rules** summary (and, for Tambola, the chosen patterns plus the host's **🎯 Game Setup** button).

### 3.6 Game stage
- **Control bar**: turn announcer (avatar + "Your Turn (Name)!" in gold, or "Name's Turn"), **❓ How to Play**, room code badge, **Leave Match**.
- **Board area**: Ludo/Snakes canvas board (square, scales with the window) or the Tambola stage.
- **Side panel**:
  - **Action Dice**: 3D die, **Roll Dice** button, helper line (e.g. *Tap Roll Dice!*, *Rolling...*, *Moving the token...*). Hidden for Tambola.
  - **💬 Room Chat**: "Chatting as *Name*", roster chips with online dots (🤖 marks bots), messages, input + **Send**.
  - **⚔️ Match Activity**: newest first; sized to show the latest two entries, older ones scroll.

### 3.7 Results modal
**👑 Arena Victorious!** with a 1st/2nd/3rd podium, **⚔️ Play Again (Rematch)** and **Leave Arena**. It opens once per game, after the final move has finished animating.

### 3.8 Other modals
*Player Identity* (rename), *❓ How to Play* (in-game briefing), *🎯 Tambola Game Setup* (see the Tambola spec). Every modal closes with ×, its Cancel button, or the primary action.

### 3.9 Toasts and screen-reader announcements
Short toasts confirm actions and report errors ("Joined Arena ROYAL-7K4P", "Connection interrupted. Reconnecting...", "Server restarted - your game was restored"). Turn changes are announced through a polite live region.

---

## 4. Identity and personalisation
- **Display name**: required, trimmed, 1–20 characters, unique (case-insensitive) within a room. Default "Noble Player".
- **Hero**: one of four emblems; drives the pawn emblem and lobby avatar.
- Name, hero, sound and effects preferences persist in `localStorage` (with an in-memory fallback when storage is blocked).

---

## 5. Room lifecycle

### 5.1 States
`LOBBY → IN_GAME → FINISHED → (Rematch) → LOBBY`

### 5.2 Rules
| Topic | Behaviour |
|---|---|
| Room code | `ROYAL-` + 4 characters from an unambiguous alphabet (no I, O, 0, 1). Case-insensitive. |
| Capacity | Ludo and Snakes ≤ 4, Tambola ≤ 50. Clamped by the server. |
| Joining | Only while in `LOBBY` and below capacity. Mid-game, only existing members can rejoin (via reconnect token). |
| Readiness | The host is ready automatically. **Start Game** is enabled only when every player is connected and ready, and the minimum player count is met (Ludo 2, Snakes 1, Tambola 1). The server enforces the same rule. |
| Starting | Engine state is created first; the room only enters `IN_GAME` if that succeeds. |
| Leaving | **Leave / Leave Match / Leave Arena / header logo** remove the player. In a game, their pieces are removed and play continues; if one player remains they win. An empty room is deleted. |
| Host migration | If the host leaves, the next player becomes host deterministically. |
| Disconnects | A dropped player is shown *Reconnecting*. **Mid-game seats are never released.** Lobby seats are released after 5 minutes offline so the room can fill. |
| Rematch | Host only, after `FINISHED`: everyone returns to the lobby, unready except the host. |
| Expiry | Rooms idle for 60 minutes with nobody connected are removed. |

---

## 6. Player briefing (onboarding)

Every player — especially a guest who has just joined — gets a personalised briefing built from the live room:

| Section | Content |
|---|---|
| Identity | "👋 *Name*, here's your briefing", role tag (Host / Player / Solo player), seat (e.g. *You play Green*, *Your pawn is Blue*, *You are the caller*), room code and head count |
| ➡️ Next step | Lobby: *Tap Mark Ready…* / *You're ready! Waiting for the host…* / host: *Waiting for N players…* or *Everyone is ready — press Start Game*. In game: whose turn it is. |
| 🎯 Goal | How to win this game |
| 🎲 How to play | Exactly what to tap and when |
| 📜 Rules in this room | The room's actual settings (not generic defaults) |
| 💡 Good to know | Tactics and edge cases |
| 👑 Host controls | Host only: invite, Game Setup, Start rules, host hand-over |

**Where it appears**
- **Lobby**: always visible above the participant list, updating live (e.g. as players get ready).
- **Game**: the **❓ How to Play** button opens it at any time.
- **First entry**: a guest entering an online match sees it automatically once per game (dismiss with **Got it — let's play!**). The host does not, since they configured the room.

---

## 7. Real-time model

### 7.1 Architecture
- **Server**: zero-dependency Node.js HTTP server (`src/server/server.js`) and in-memory room manager (`src/server/room_manager.js`).
- **Engines**: pure, deterministic rule engines (`src/engine/ludo.js`, `snakes.js`, `tambola.js`, `ai.js`) written UMD-style so the same code runs on the server (authoritative) and in the browser (solo mode).
- **Client**: a single-page app (`src/client/index.html` + `app.js`), no framework, no build step.
- **Transport**: REST `POST` for actions; **Server-Sent Events** (`GET /api/rooms/:code/stream`) push every state change. Heartbeat comments every 15 s keep proxies from closing the stream.

### 7.2 Personalised broadcasts
Every broadcast is built **per subscriber**: Tambola tickets are filtered to the viewer's own, and the ball pool and audit log are never sent. Each event also carries the latest **room checkpoint** (§12).

### 7.3 Sequencing for animation
State updates can arrive faster than they are animated. Engines therefore record monotonically increasing sequences that clients replay exactly once and in order:
- `lastRoll { seq, value, playerId }` — drives the die.
- Ludo `lastMove { seq, playerId, tokenIndex, fromStep, toStep, captured }` and Snakes `lastAction { fromPos, intermediatePos, toPos, shortcutType, bounce }` — drive piece movement.

If a client misses updates (e.g. after reconnecting), it snaps straight to the server's positions instead of replaying stale moves.

---

## 8. Dice

| Aspect | Specification |
|---|---|
| Randomness | Uniform 1–6 via `crypto.getRandomValues` with rejection sampling (no modulo bias); `Math.random` fallback only where Web Crypto is missing. |
| Rendering | One solid, rounded ivory die rendered with WebGL (signed-distance ray-marching, dimpled pips, opposite faces sum to 7). Falls back to a CSS 3D cube if WebGL is unavailable or the context is lost. |
| Size | 124 px (Ludo desktop), 108 px (Ludo ≤ 540 px wide), 96 px (Snakes). |
| Throw | 1.18 s: thrown from the side, tumbles with decaying spin, three shrinking bounces, settles at a ¾ resting angle; a contact shadow scales with height. The value is revealed at 0.47 s, mid-air. |
| Ownership | Each new `lastRoll.seq` animates once and lands on exactly that value; rolls arriving mid-throw are queued. Remote players' and bots' rolls animate too. |
| Controls | **Roll Dice** button, or click / Enter / Space on the die. Disabled when it is not your turn, while the die is rolling, while a piece is moving, or once the game has finished. |
| Reduced motion | 180 ms update instead of the throw. |

---

## 9. Piece movement (all boards)

**Golden rule: no piece moves until the die is at rest.**

| Phase | Behaviour |
|---|---|
| Settle | A short beat after the die lands (80–160 ms). |
| Hop | The piece hops one square at a time on a parabolic arc; its **ground shadow** stays on the board and shrinks as the piece rises; a small **squash** on take-off and landing; a tick sound per landing. |
| Special moves | Game-specific: Ludo captured tokens fly back to their yard on a high arc; Snakes pawns climb ladders and slide down the snake's own body. |
| Afterwards | The activity entry, the next player's **Roll Dice**, bot turns and the Results modal all wait until the piece has arrived. |
| Reduced motion | Pieces jump straight to their destination once the die has landed. |

---

## 10. Chat and activity
- **Chat** is available in every match. Online messages are authenticated, 1–200 characters, rendered as plain text (never HTML), and the latest 50 are kept per room and synced over SSE. Solo chat is local only. Your own messages are highlighted; roster chips show who is online.
- **Match Activity** lists engine messages (rolls, moves, captures, claims, wins), newest first, keeping the 50 most recent.

---

## 11. Board presentation
- Boards are square and **resize with the window** (`min(width, viewport height − 150 px)`, up to 1080 px). The canvas backing store is re-allocated at device-pixel-ratio (≤ 2×) so it is crisp at any size.
- The side panel stacks below the board under 960 px wide; no horizontal scrolling down to 390 px phones.
- Idle animation (e.g. snakes) runs ≤ 30 fps, backs off on slow devices, and stops when the board is not visible, the tab is hidden, effects are off, or reduced motion is on.

---

## 12. Connection resilience

| Mechanism | Specification |
|---|---|
| Checkpoints | After every change the server sends members an **AES-256-GCM encrypted, deflate-compressed checkpoint** of the room. Clients keep the newest one (`localStorage`). |
| Restore | If the server answers *room not found* (restart, deploy, spin-down), the first member to reconnect sends the checkpoint to `POST /api/rooms/restore` and the game resumes exactly where it was. Only members can restore; tampered or expired (> 12 h) checkpoints are rejected; an older checkpoint never overwrites a newer room; a reused room code is never overwritten (409). |
| Reconnect | Automatic with exponential back-off (1 s → 15 s), plus immediate checks on returning to the tab and on regaining network. Rejoining from an invite link after a reload also restores. |
| Keep-alive | While an online room is open each client pings every 4 minutes, keeping free-tier instances awake. |
| Secret | `MYARENA_CHECKPOINT_SECRET` must be set and stable across deploys; without it the server logs a warning and checkpoints cannot survive a restart. |

---

## 13. Security and privacy
- **Authentication**: each player receives a random 128-bit reconnect token. Every mutating request sends it as `X-Reconnect-Token`; the SSE stream sends it as `?token=`. Tokens are never broadcast to other players.
- **Authorisation**: host-only actions (start, settings, rematch) and caller-only actions (draw) are enforced by the server; client-supplied player or host IDs are ignored.
- **Input hygiene**: rule objects are whitelisted per game (e.g. Tambola accepts only catalogue pattern IDs); names ≤ 20 characters; chat ≤ 200 characters; JSON bodies ≤ 1 MB.
- **Output hygiene**: all user text is escaped or inserted as text nodes.
- **Static files**: served from an explicit allow-list (no path traversal).
- **Status codes**: 400 bad request, 401 missing/invalid token, 404 room not found, 409 code collision, 410 checkpoint expired.

---

## 14. HTTP and SSE contract

| Method & path | Auth | Purpose |
|---|---|---|
| `POST /api/rooms/create` | — | Create room `{ hostName, gameType, maxPlayers, rules, heroId }` → code, player, token, room, checkpoint |
| `POST /api/rooms/join` | token optional | Join `{ roomCode, playerName, heroId, reconnectToken? }` (reconnects if the token matches) |
| `POST /api/rooms/leave` | token | Leave the room |
| `POST /api/rooms/ready` | token | `{ roomCode, isReady }` |
| `POST /api/rooms/hero` | token | `{ roomCode, heroId }` (lobby only) |
| `POST /api/rooms/settings` | token, host | `{ roomCode, rules, maxPlayers? }` (lobby only) |
| `POST /api/rooms/start` | token, host | Start the game |
| `POST /api/rooms/action` | token | `ROLL_DICE`, `MOVE_TOKEN { tokenIndex }`, `DRAW_BALL`, `CLAIM_WIN { patternId }` |
| `POST /api/rooms/rematch` | token, host | Back to lobby after `FINISHED` |
| `POST /api/rooms/chat` | token | `{ roomCode, message }` |
| `POST /api/rooms/ping` | token | Keep-alive / existence check |
| `POST /api/rooms/restore` | token | `{ checkpoint }` rebuild a lost room |
| `GET /api/rooms/:code` | — | Public room summary (no game state) |
| `GET /api/rooms/:code/stream?token=` | token | SSE stream (initial `ROOM_SYNC` snapshot) |

**SSE event types**: `ROOM_SYNC`, `ROOM_RESTORED`, `PLAYER_JOINED`, `PLAYER_LEFT`, `PLAYER_RECONNECTED`, `PLAYER_CONNECTION_CHANGED`, `PLAYER_READY_CHANGED`, `HERO_CHANGED`, `SETTINGS_UPDATED`, `GAME_STARTED`, `GAME_STATE_UPDATED`, `GAME_RESET_TO_LOBBY`, `CHAT_MESSAGE`. Each carries a `checkpoint`.

---

## 15. Client storage keys
| Key | Purpose |
|---|---|
| `myarena_name`, `myarena_hero` | Identity |
| `myarena_muted`, `myarena_3d` | Preferences |
| `myarena_rec_<CODE>`, `myarena_pid_<CODE>` | Reconnect token and player ID for a room |
| `myarena_cp_<CODE>` | Latest encrypted room checkpoint |
| `myarena_brief_<CODE>_<gameId>` | Briefing already shown for this match |

---

## 16. Accessibility
- All controls are buttons or have `role="button"` with keyboard activation (Enter/Space), visible focus rings and ≥ 44 px touch targets.
- Dice announce `Dice showing N`; Tambola ticket numbers expose `aria-pressed` and "Number N, crossed out".
- Turn changes and chat use polite live regions.
- `prefers-reduced-motion` removes throws, hops, slithering and cross-mark animations.

---

## 17. Deployment and operations
- **Run**: `npm start`. Node 18+ works; **Node 20+ is recommended**, because older versions lack the global Web Crypto API and server-side dice then fall back to `Math.random`. `PORT` is honoured.
- **Render**: `render.yaml` defines a free web service and generates `MYARENA_CHECKPOINT_SECRET`. For an existing service, set that variable manually and keep it constant.
- **Scale model**: single instance, in-memory rooms; checkpoints cover restarts, not multi-instance sharding.

## 18. Quality gates
| Suite | Command | Covers |
|---|---|---|
| Engine unit tests | `npm test` (part 1) | Rules of all three games, pattern catalogue, dice fairness, move records |
| Multiplayer integration | `npm test` (part 2) | Auth, readiness, privacy, host migration, chat, restarts/checkpoints, 40-player Tambola |
| Browser E2E | `python test/e2e_selenium.py` | Landing, solo games, dice/board sync, chat, activity, mobile layout, Tambola setup |

Every release bumps the version shown in the header, `package.json` and the README.

## 19. Known limitations
- One server instance; rooms are not shared across instances.
- Tambola ticket crosses are local to the browser (claims are verified server-side regardless).
- A disconnected player's turn is not skipped automatically; the table waits for them (or for them to leave).
- The Tambola auto-caller timer runs in the host's browser; it pauses if the host closes the tab.
