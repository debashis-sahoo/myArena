# Ludo Royalty — Game Specification

| | |
|---|---|
| **Game** | Ludo Royalty |
| **Players** | 2–4 online · solo: you vs 3 AI bots |
| **Version** | 1.2.0 |
| **Platform rules** | See the [Platform Master Specification](./00-platform-master-spec.md) for rooms, roles, dice, movement, chat, resilience and the API |

---

## 1. Summary
Classic Ludo for up to four players. Each player races four tokens once around a 52-square track, up their private home column and into the centre. Captures, safe stars, bonus rolls and the three-sixes penalty are configurable regional rules.

---

## 2. Roles

### 2.1 Host (admin)
| Capability | Where |
|---|---|
| Choose online or solo mode, capacity (2–4) and hero | Create Room modal |
| Set the rule presets (§5) | Create Room → *Regional Rule Presets* |
| Share the code / invite link | Lobby → **📋 Copy Invite Link** |
| Start the match when everyone is connected and ready (min 2 players) | Lobby → **Start Game ⚔️** |
| Start a rematch | Results → **⚔️ Play Again (Rematch)** |

The host plays a seat like everyone else; their turns have no extra powers. If the host leaves, host rights pass to the next player.

### 2.2 Player
Joins with the room code, picks a hero, taps **Mark Ready**, then plays their turns. Their briefing tells them their colour, the goal, the room's rules and what to do next.

### 2.3 AI bots (solo)
Gamma Bot (Green), Thor Bot (Yellow) and Cap Bot (Blue); the human is always Red.

---

## 3. Seats, colours and turn order
| Seat (join order) | Colour | Start square (track index) | Yard |
|---|---|---|---|
| 1st (host) | **Red** | 0 | Top-left |
| 2nd | **Green** | 13 | Top-right |
| 3rd | **Yellow** | 26 | Bottom-right |
| 4th | **Blue** | 39 | Bottom-left |

Turns go clockwise: Red → Green → Yellow → Blue, skipping players who have finished.

---

## 4. Board
- 15 × 15 grid: four 6 × 6 coloured yards, a cross-shaped 52-square track, four 5-square home columns and a centre home of four coloured triangles.
- Each token's progress is a **step**: `-1` in the yard, `0–50` on the shared track (relative to the player's start square), `51–55` in the home column, `56` home.
- **Safe squares** (track indices 0, 8, 13, 21, 26, 34, 39, 47): the four start squares and four squares marked with a ★.
- Yard tokens sit on the four white circles of their yard; tokens at home sit inside their colour's triangle.

---

## 5. Rules and admin presets

| Preset (Create Room) | Options | Default | Effect |
|---|---|---|---|
| Entry Roll Requirement | **Six Only (Standard)** / Six or One (Casual Fast) | Six only | Roll needed to move a token from the yard onto its start square |
| Bonus Roll on Six | On / Off | On | Rolling a 6 grants another roll (also when no token could move) |
| Three Consecutive Sixes Penalty | On / Off | On | The third 6 in a row voids the roll and passes the turn |
| Capture Bonus Turn | On / Off | On | Capturing grants another roll |
| Star Safe Squares | On / Off | On | Tokens on safe squares cannot be captured |
| Exact Home Finish | On / Off | On | On: a roll that overshoots home is not allowed for that token. Off: overshooting counts as reaching home |
| *(fixed)* Bonus on reaching home | — | On | Bringing a token home grants another roll |

### 5.1 Turn flow
1. **Roll.** The current player rolls (button or die).
2. **Legal moves** are computed:
   - Yard token: legal only with an entry roll; it goes to step 0.
   - Board token: moves `roll` steps if it does not pass home (or, with exact finish off, it may finish).
3. **No legal move** → the turn passes automatically (unless a 6 earned a bonus roll).
4. **Choose.** Once the die is at rest, movable tokens glow gold; the player taps one.
5. **Resolve.** Landing on opponents on a non-safe square captures **every** opponent token there (each goes back to its yard). Landing on a safe square never captures.
6. **Extra roll** if the move captured, reached home, or the roll was a 6 (per presets); otherwise the turn advances.

### 5.2 Winning
A player finishes when all four tokens are home and receives the next rank. The match ends when only one player still has tokens on the board; that player takes the last rank. The Results podium shows 1st–3rd (if a player left early, remaining unranked players are ordered by progress).

---

## 6. User experience

### 6.1 Lobby
- Briefing: *You play Red/Green/Yellow/Blue*, the goal, how a turn works, and every preset value of this room.
- Participant cards and the rules summary (entry roll, bonus on six, three-sixes penalty, safe stars, exact finish).

### 6.2 Game screen
| Element | Behaviour |
|---|---|
| Turn announcer | "Your Turn (Name)!" in gold, or "Name's Turn" |
| Helper line | *Tap Roll Dice!* → *Rolling...* → *Tap a glowing legal token to move!* → *Moving the token...*; for others: *Waiting for X to roll...* / *X is selecting a token...* |
| Roll Dice | Enabled only on your roll phase, with the die at rest and no token moving |
| Legal tokens | Gold halo **after the die has settled**; the tap target scales with the board size |
| Activity | e.g. "Asha rolled a 6 with 4 possible move(s).", "Asha moved token 1 to step 0. Bonus turn awarded (ROLLED_SIX_BONUS)!" |

### 6.3 Movement and animation
| Event | Animation |
|---|---|
| Leave yard | Single hop from the yard circle onto the start square |
| Move *n* squares | *n* hops of 170 ms each, starting 80 ms after the die settles; parabolic arc ≈ 0.42 cell high, ground shadow, squash on take-off and landing, tick sound per landing |
| Home column / home | Hops continue up the home column into the centre triangle |
| Capture | After the mover lands, a capture sound plays and every captured token flies back to its yard on a high arc (560 ms) |
| Opponents & bots | Replayed identically from the server's `lastMove` record on every screen |
| Reduced motion | Tokens jump to their destination once the die has landed |

The next roll, the bot's next action and the Results modal all wait until the move (including any capture flight) has finished.

### 6.4 Solo AI behaviour
Bots wait for the previous die and token animation, then roll (≥ 0.8 s "thinking") and pick a move (≥ 0.6 s after their die lands) using a transparent heuristic score:

| Situation | Score |
|---|---|
| Reaching home | +1000 |
| Capturing an opponent | +500 |
| Leaving the yard | +250 |
| Landing on a safe square | +100 |
| Moving a threatened token | +80 |
| Progress | +2 per step of the target |

Bots never act on a human's turn; each bot step re-checks that it still owns the turn.

---

## 7. Multiplayer specifics
- The server is authoritative for rolls, legal moves, captures and turn order; a request from a player whose turn it is not is rejected ("It is X's turn, not yours!").
- A player who leaves mid-game has their tokens removed; if only one player remains, they win.
- A disconnected player keeps their seat; the table waits for them.

---

## 8. Edge cases
| Case | Behaviour |
|---|---|
| Six with no legal move | Roll is logged ("No moves available"); with *Bonus on six* the same player rolls again |
| Third consecutive six | Roll voided, logged as a penalty, turn passes; the counter resets on every turn change |
| Two of your tokens on one square | Allowed; tokens are drawn on the same square |
| Several opponent tokens on your landing square | All are captured and all fly home |
| Exact finish on, token needs 2 and rolls 5 | That token cannot move; another token may |
| Tap before the die stops | Ignored |

---

## 9. Acceptance criteria
- [ ] No token moves and no token glows until the die is at rest.
- [ ] Every token move hops one square at a time with a ground shadow; captures fly back to the yard.
- [ ] Roll Dice is disabled while any token is moving.
- [ ] The die always lands on the value the server rolled.
- [ ] Results appear only after the final move has finished animating.
- [ ] A joining guest's briefing shows their colour and the room's actual presets.
