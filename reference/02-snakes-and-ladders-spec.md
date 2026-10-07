# Snakes & Ladders — Game Specification

| | |
|---|---|
| **Game** | Snakes & Ladders |
| **Players** | 1–4 online · solo: you vs Titan Bot |
| **Version** | 1.2.0 |
| **Platform rules** | See the [Platform Master Specification](./00-platform-master-spec.md) for rooms, roles, dice, movement, chat, resilience and the API |

---

## 1. Summary
The classic race on a 100-square serpentine board. Roll, hop forward, climb ladders, slide down snakes, and be the first to reach square 100. Pure luck — there are no decisions after the roll — so the experience focuses on readable, satisfying motion.

---

## 2. Roles

### 2.1 Host (admin)
| Capability | Where |
|---|---|
| Choose online or solo mode, capacity (2–4) and hero | Create Room modal |
| Set the rule presets (§5) | Create Room → *Regional Rule Presets* |
| Share the code / invite link | Lobby → **📋 Copy Invite Link** |
| Start the match when everyone is connected and ready (min 1 player) | Lobby → **Start Game ⚔️** |
| Start a rematch | Results → **⚔️ Play Again (Rematch)** |

The host plays a pawn like everyone else and has no in-game powers.

### 2.2 Player
Joins with the room code, picks a hero, taps **Mark Ready**, and rolls on their turn. The briefing tells them their pawn colour, the finish rule and whether a 6 earns another roll.

### 2.3 AI bot (solo)
**Titan Bot** rolls automatically on its turn after the previous pawn has finished moving (≥ 0.8 s "thinking").

---

## 3. Seats and colours
Pawn colour follows join order: **Red**, **Blue**, **Green**, **Amber**. Each pawn carries its hero emblem. Turns follow the same order.

---

## 4. Board
- 10 × 10 squares numbered 1–100 in a serpentine (boustrophedon) path from bottom-left: row 1 runs left→right, row 2 right→left, and so on.
- Square 1 is a green **START** square; square 100 is gold with a 👑.
- **Ladders** (foot → top): 4→14, 9→31, 20→38, 28→84, 40→59, 51→67, 63→81, 71→91.
- **Snakes** (head → tail): 17→7, 54→34, 62→19, 64→60, 87→24, 93→73, 95→75, 99→78.
- Pawns start **off the board** (position 0); the first roll moves the pawn onto square = roll.

### 4.1 Visual design
| Element | Design |
|---|---|
| Squares | Rounded, bevelled tiles with numbers that scale with the board; multiples of 10 are highlighted in the theme accent |
| Ladders | Shaded wood rails with perpendicular rungs, brass bolts and a drop shadow, overhanging both squares slightly |
| Snakes | Eight distinct skins (python, coral, cobra, viper, amethyst, rattler, mamba, krait) with diamond, band, chevron or blotch markings, scale texture, cylindrical shading and shadows; shaped heads with slit-pupil eyes, nostrils and forked tongues |
| Idle life | Snakes slither in place (a wave travels head → tail, heads sway, tongues flick on their own rhythm) while head and tail stay pinned to their squares. Paused with effects off, reduced motion, or when the board is hidden |
| Tokens | Glossy pawns with a contact shadow; tokens sharing a square spread out; the active pawn glows gold |
| Themes | Royal Arena Gold, Mystic Palace Emerald, Cyber Sapphire (tile and accent colours) |

Tiles and ladders are cached per board size and theme; only snakes and tokens redraw each frame (≈ 1.6 ms per frame).

---

## 5. Rules and admin presets

| Preset (Create Room) | Options | Default | Effect |
|---|---|---|---|
| Finish Behavior | **Exact Roll (Stay if overshot)** / Exact Roll with Bounce Back / Overshoot Wins Immediately | Exact – stay | What happens when a roll would pass 100 |
| Board Visual Theme | Royal Arena Gold / Mystic Palace Emerald / Cyber Sapphire | Royal Arena Gold | Board colours |
| Bonus Turn on Rolling 6 | On / Off | On | A 6 earns another roll (not when the roll wins) |

### 5.1 Turn flow
1. The current player rolls (button or die).
2. The engine resolves the whole turn: target = position + roll, apply the finish rule, then a ladder or snake on the landing square.
3. Reaching 100 wins immediately and ends the match.
4. With *Bonus on 6*, a 6 (that did not win) keeps the turn; otherwise play passes to the next player.

### 5.2 Finish modes
| Mode | Example: on 97, roll 5 |
|---|---|
| Exact – stay | Stays on 97 |
| Exact – bounce | Walks to 100 and bounces back 2 → 98 (a snake or ladder on 98 then applies) |
| Overshoot wins | Wins |

### 5.3 Winning
The first pawn to reach 100 wins and the game ends. The Results podium ranks the winner first, then the other players by how far they got.

---

## 6. User experience

### 6.1 Lobby
Briefing (*Your pawn is Blue*, goal, how to roll, finish rule, bonus-on-6) plus the rules summary (finish, theme, bonus on 6).

### 6.2 Game screen
| Element | Behaviour |
|---|---|
| Turn announcer | "Your Turn (Name)!" or "Name's Turn" |
| Helper line | *Tap Roll Dice to advance!* → *Moving the pawn...* → next player's prompt; others see *Waiting for X...* |
| Roll Dice | Enabled only on your turn, with the die at rest and no pawn moving |
| Activity | Posted when the pawn **arrives**, e.g. "Asha rolled 4 and moved from 0 to 4. Climbed ladder from 4 to 14! 🪜" |

### 6.3 Movement and animation
| Phase | Timing / behaviour |
|---|---|
| Wait for die | Nothing moves until the die is at rest |
| Settle | 160 ms beat |
| Hop | 190 ms per square; parabolic arc ≈ 0.32 cell high, ground shadow, squash on take-off and landing, tick per landing. Bounce-back walks to 100 and back |
| Ladder | Pawn climbs along the ladder (600–1500 ms, ~150 ms per cell of distance) with a rising sound |
| Snake | Pawn slides down the snake's own wriggling body from head to tail with a hiss |
| Arrival | Activity entry, next turn, bot roll and (on a win) the Results modal follow |
| Remote players & bots | Replayed identically from the server's turn record |
| Reduced motion | The pawn jumps to its final square once the die has landed |

Measured example: roll 4 → ladder 4→14: die rests at 1.18 s, pawn arrives at 2.52 s.

---

## 7. Multiplayer specifics
- The server rolls and resolves the full turn; only the current player can roll.
- A player who leaves mid-game is removed; if only one player remains, they win.
- A disconnected player keeps their seat; the table waits for them.

---

## 8. Edge cases
| Case | Behaviour |
|---|---|
| Several pawns on a square | Drawn side by side (2–4 layouts) |
| Exact-stay overshoot | Pawn does not move; the turn still passes (or bonus on 6 applies) |
| Bounce lands on a snake or ladder | The snake or ladder applies after the bounce |
| Winning roll is a 6 | No bonus roll; the game ends |
| Missed updates after reconnect | Pawns snap to the server's positions without replaying |

---

## 9. Acceptance criteria
- [ ] The pawn moves only after the die is at rest, one hop per square.
- [ ] Ladders are climbed along the ladder; snakes are slid down along the snake's body.
- [ ] Roll Dice is disabled while a pawn is moving.
- [ ] The winning move finishes animating before the Results modal opens.
- [ ] Snakes slither while idle and stop with effects off or reduced motion.
- [ ] A joining guest's briefing shows their pawn colour and the room's finish rule.
