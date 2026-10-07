# 👑 myArena Royalty — "Your friends. Your arena."

Current version: **1.1.1**

A browser-based social board-game arcade designed for friends to play instantly across desktop, iPhone, and Android without account creation.

Version 1.1.1 waits for the die to come to rest before any piece moves: Snakes & Ladders pawns then hop square by square, climb ladders and slide down the snake itself, with the activity message and next turn following the move. Version 1.1.0 adds a Tambola admin game setup with 52 popularity-rated winning patterns and rooms of up to 50 players. Version 1.0.10 brings the snakes to life: they slither in place on their squares and flick their tongues (paused with the effects toggle or reduced-motion settings). Version 1.0.9 redraws Snakes & Ladders with realistic patterned snakes, wooden ladders, bevelled theme-aware tiles and glossy tokens. Version 1.0.8 renders the die with WebGL as a single solid, seamlessly rounded body (falling back to CSS where WebGL is unavailable). Version 1.0.7 keeps online games alive on hosts like Render: rooms are restored automatically after server restarts, deploys and spin-downs, disconnected players keep their seat, and clients reconnect on their own. Version 1.0.6 rounds the die edges, shows room chat by default with each player's sign-in name and an online roster, and trims match activity to the latest two entries with scroll. Version 1.0.5 fixes the Ludo die showing the wrong number (often 1) and AI turns occasionally rolling for a human player. Version 1.0.4 adds a seamless physics-style 3D die, cryptographically backed unbiased dice rolls when the platform supports Web Crypto, a board that resizes its CSS and high-DPI canvas surfaces with the browser, and authenticated real-time room chat.

---

## 🎮 Playable Games Overview (MVP)

### 1. Ludo Royalty (2–4 Players + Solo vs Local AI)
- **Token System & Paths**: 4 character pawns per player, 52-square perimeter track, private 5-cell home stretch, and center victory triangle (56 total steps).
- **Tactile 3D Character Miniatures (Avengers Themed)**:
  - **Red Team**: Iron Armor (*Iron Man* inspired) — Crimson & Gold metallic armor with Arc Reactor emblem (`⚛`).
  - **Blue Team**: Vibranium Shield (*Captain America* inspired) — Royal Blue & Silver with Star Shield emblem (`★`).
  - **Green Team**: Gamma Titan (*Hulk* inspired) — Emerald & Purple with Fist emblem (`✊`).
  - **Yellow Team**: Thunder God (*Thor* inspired) — Golden Amber & Sky Blue with Mjolnir emblem (`⚡`).
- **Regional Rule Presets**:
  - *Entry Roll*: Six Only (Standard) or Six/One (Casual Fast).
  - *Bonus Turn on Six*: Additional roll on rolling a 6.
  - *Three Consecutive Sixes Penalty*: Rolling three 6s in a row voids the turn.
  - *Capture Bonus*: Sending an opponent token back to yard awards an extra roll.
  - *Star Safe Squares*: 8 safe squares (4 start squares + 4 star squares) where pawns cannot be captured.
  - *Exact Finish*: Exact roll required to reach Home (step 56).
- **Solo AI**: Deterministic, transparent heuristic evaluation prioritizing Home, Captures, Base Exits, and Safe Squares without LLM dependencies.

### 2. Snakes & Ladders (1–4 Players + Solo vs Local AI)
- **Board Structure**: 100-cell boustrophedon (serpentine) grid numbered 1 to 100 from bottom-left to top.
- **Verified Layout**: Non-overlapping, non-cyclic shortcuts:
  - *Ladders*: 4→14, 9→31, 20→38, 28→84, 40→59, 51→67, 63→81, 71→91
  - *Snakes*: 17→7, 54→34, 62→19, 64→60, 87→24, 93→73, 95→75, 99→78
- **Finish Modes**:
  - `exact_stay`: Must roll exact number to hit 100; overshooting keeps pawn in place.
  - `exact_bounce`: Overshooting bounces back by the remainder.
  - `overshoot_wins`: Any roll meeting or exceeding 100 wins immediately.
- **Themes**: *Royal Arena Gold*, *Mystic Palace Emerald*, *Cyber Sapphire*.

### 3. Housie / Tambola 90 (2–50 Players)
- **Authentic 90-Ball Tickets**: 3 rows by 9 columns (27 cells total). Exactly 15 numbers (5 per row, 4 blanks per row). Each column covers its standard range (Col 1: 1–9, Col 2: 10–19, ..., Col 9: 80–90) sorted ascending top-to-bottom.
- **Drawing System**: Shuffled 1–90 pool drawn without replacement.
- **Large Rooms**: Up to 50 players per room. Each player only ever receives their own ticket, and a draw is broadcast to 40 players in a few milliseconds.
- **Admin Game Setup**: The host (who draws the numbers) opens **🎯 Game Setup** before creating the room or from the lobby to choose the caller mode (manual, or automatic every 5–20 seconds) and the winning patterns. The picker offers presets (Classic 6, Popular ★4+, Party Mix ★3+, All), search, category filters and a mini ticket diagram for each pattern. The server accepts only known pattern ids.
- **52 Winning Patterns**, rated by popularity from how widely they appear across popular Tambola/Housie guides (★★★★★ = the classic six played almost everywhere, ★★ = regional and niche variations):
  - ★★★★★ Early Five (Jaldi 5), Top Line, Middle Line, Bottom Line, Four Corners, Full House
  - ★★★★ Second Full House, Star, Pyramid, Temperature, Bamboo, Six Corners, Breakfast, Lunch, Dinner, Odd Numbers, Even Numbers, Any Two Lines, Early Seven
  - ★★★ Third Full House, Early Three, King's Corners, Queen's Corners, First Half (1–45), Second Half (46–90), Laddu, Fat Ladies, Smallest Five, Biggest Five, Letter H, Letter T, Letter L, Border, Red Cross
  - ★★ Anda, Danda, Ugly Ducklings, Pandavas, Hockey Sticks, Double Temperature, Ladder, Reverse Pyramid, Railway Track, First Twins, Last Twins, Hum Tum, I Love You (143), Drum, Safe, Odd Positions, Diamond, Ab Tak Chappan
  - Shape patterns refer to the 1st–5th printed number of each line, so every definition is exact on any ticket (for example, Pyramid = 3rd of the top line, 2nd & 4th of the middle, 1st, 3rd & 5th of the bottom).
  - *Second / Third Full House* open only after the previous Full House is won and must go to a different player; the game ends when its final Full House is claimed or every pattern is closed.
  - *Automated Claim Verification*: Server validates ticket authenticity, verifies every required number was called on or before the current ball, and records auditable win logs or rejects bogey claims.

---

## 🔮 Curated Future Roadmap Catalog (Labeled "Coming soon")
- **Party & Role-Based**: *Draw & Guess Arena* (3–8 players), *Word Scepter* (4–10 players), *Royal Charades* (4–12 players).
- **Classic Quick Games**: *Royal Chess* (2 players), *Four-in-a-Row* (2 players), *Dots & Boxes* (2–4 players), *Memory Match* (1–4 players).
- **Dice & Card Games**: *Royal Yacht Dice* (1–4 players), *Palace Shedding* (2–5 players).

All roadmap cards are clearly labeled "Coming soon" with disabled action buttons to ensure no broken or fake games can be launched.

---

## 🌐 Authoritative Architecture & Multiplayer Synchronization

### Real-Time Stack
1. **Server (`src/server/server.js`)**:
   - Zero-dependency Node.js HTTP server.
   - Authoritative Game State Engine (`src/engine/ludo.js`, `src/engine/snakes.js`, `src/engine/tambola.js`).
   - Server-Sent Events (SSE) stream (`GET /api/rooms/:code/stream`) for real-time room and turn broadcasts.
   - REST endpoints for room creation, joining, ready states, hero selection, turn execution, and rematching.
   - Authenticated room chat with the most recent 50 messages synchronized over SSE.
2. **Session & Identity Management**:
   - Guest participation: Display name validation preventing duplicate names in the same room.
   - Short room codes (`ROYAL-XXXX`) and direct invite URLs (`?room=ROYAL-XXXX`).
   - Deterministic host handoff if the host disconnects or leaves.
   - Reconnect tokens authenticate every room mutation and SSE stream.
   - Personalized state serialization keeps Tambola tickets and future ball order private.
   - Disconnected players keep their seat for the whole match (phones locking or switching apps no longer forfeit the game); idle lobby seats are released after 5 minutes.
3. **Surviving Restarts (Render & Other Hosts)**:
   - Rooms live in server memory. Hosts such as Render restart instances on every deploy, may restart them at any time, and spin free instances down after 15 minutes without inbound requests, which wipes that memory.
   - After every change the server sends each player an AES-256-GCM encrypted, tamper-proof checkpoint of the room. If the server comes back without the room, the first player to reconnect sends it back (`POST /api/rooms/restore`) and the game resumes exactly where it was: turn, board, dice, chat and seats. Only room members can restore, tampered or expired (12h) checkpoints are rejected, and an older checkpoint never overwrites a newer one.
   - Clients reconnect automatically with backoff, on returning to the tab, and on regaining network, and also when rejoining from an invite link after a page reload.
   - While a multiplayer room is open, clients ping the server every 4 minutes so a free instance is not spun down mid-game.
4. **Deploying on Render**:
   - **Set `MYARENA_CHECKPOINT_SECRET`** (Dashboard → your service → Environment) to a long random value and keep it unchanged across deploys. Without it the server logs a warning and rooms cannot be restored after a restart.
   - The included [`render.yaml`](./render.yaml) Blueprint configures the service and generates this secret automatically.
   - Build command `npm install`, start command `npm start`.
5. **Firebase / Cloud Deployment Guide**:
   - To deploy for public online multiplayer across separate networks without maintaining a continuous Node.js server process:
     1. Enable Firebase Realtime Database or Firestore.
     2. Place room state under `/rooms/{roomCode}`.
     3. Security rules: Validate player membership, ensure `turnIndex` can only be advanced by the current player, and prevent unauthorized claims.
     4. Cloud Functions: Use Cloud Functions for authoritative dice rolling and Tambola ball drawing.

---

## 🧪 Testing & Verification

Run all test suites from the project root:

```bash
# Game engine and authoritative multiplayer integration tests
npm test

# Headless Chromium / Selenium end-to-end tests
python -m pip install -r requirements.txt
python test/e2e_selenium.py
```
