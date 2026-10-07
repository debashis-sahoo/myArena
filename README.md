# 👑 myArena Royalty — "Your friends. Your arena."

Current version: **1.0.1**

A browser-based social board-game arcade designed for friends to play instantly across desktop, iPhone, and Android without account creation.

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

### 3. Housie / Tambola 90 (2–8 Players)
- **Authentic 90-Ball Tickets**: 3 rows by 9 columns (27 cells total). Exactly 15 numbers (5 per row, 4 blanks per row). Each column covers its standard range (Col 1: 1–9, Col 2: 10–19, ..., Col 9: 80–90) sorted ascending top-to-bottom.
- **Drawing System**: Shuffled 1–90 pool drawn without replacement.
- **Roles**: Host Caller, Assigned Participant Caller, or Automatic Caller (configurable interval e.g. 7s).
- **Winning Combinations & Claims**:
  - *Early Five*: First to mark any 5 called numbers.
  - *Top Line / Middle Line / Bottom Line*: All 5 numbers of row 1, 2, or 3.
  - *Four Corners*: 1st and last numbers of top and bottom rows.
  - *Full House*: All 15 numbers on the ticket.
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
2. **Session & Identity Management**:
   - Guest participation: Display name validation preventing duplicate names in the same room.
   - Short room codes (`ROYAL-XXXX`) and direct invite URLs (`?room=ROYAL-XXXX`).
   - Deterministic host handoff if the host disconnects or leaves.
   - Reconnect tokens authenticate every room mutation and SSE stream.
   - Personalized state serialization keeps Tambola tickets and future ball order private.
3. **Firebase / Cloud Deployment Guide**:
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
