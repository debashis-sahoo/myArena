# Housie / Tambola 90 — Game Specification

| | |
|---|---|
| **Game** | Housie / Tambola 90 (90-ball bingo) |
| **Players** | 1–50 online · solo practice (you are caller and player) |
| **Version** | 1.2.0 |
| **Platform rules** | See the [Platform Master Specification](./00-platform-master-spec.md) for rooms, roles, chat, resilience and the API |

---

## 1. Summary
Each player receives an authentic 90-ball ticket. The host calls numbers from 1–90; players cross them off and race to claim **winning patterns** (dividends) such as Early Five, lines, corners and Full House. The host chooses the patterns from a catalogue of 52, rated by popularity. Claims are verified instantly by the server.

---

## 2. Roles

### 2.1 Host = Caller (admin)
| Capability | Where |
|---|---|
| Choose online or solo mode, capacity (2 … 50) and hero | Create Room modal |
| Open **🎯 Game Setup** to pick the caller mode, auto interval and winning patterns | Create Room (before the room exists) **and** the lobby (any time before starting) |
| Share the code / invite link | Lobby → **📋 Copy Invite Link** |
| Start when everyone is connected and ready (min 1 player) | Lobby → **Start Game ⚔️** |
| **Draw Next Number** (manual) or **▶ Auto-Call / ⏸ Pause Auto-Call** (automatic) | Game stage, caller header |
| Play their own ticket and claim patterns | Game stage |
| Start a rematch | Results → **⚔️ Play Again (Rematch)** |

Only the caller can draw; the server rejects draws from anyone else.

### 2.2 Player
Joins with the room code, marks ready, receives a ticket when the game starts, crosses off called numbers and claims patterns. The briefing lists every pattern in play with its definition.

---

## 3. Admin game setup (🎯 Game Setup)

### 3.1 Layout
| Section | Content |
|---|---|
| **Number Caller** | *Draw mode*: Manual — I draw each number / Automatic — timed draws. *Auto interval*: every 5, 7, 10, 15 or 20 seconds (enabled only for Automatic). |
| **Winning Patterns** header | Live count, e.g. **19 of 52 selected** |
| **Presets** | **Classic 6** (6), **Popular ★4+** (19), **Party Mix ★3+** (34), **All** (52), **Clear** |
| **Search** | Matches name, alternate name, description and category (e.g. *pyramid*, *corners*, *jaldi*) |
| **Category tabs** | All · Quick · Lines · Corners · Shapes · Letters · Columns · Values · Digits · Full House |
| **Pattern cards** | Checkbox, name · alternate name, popularity stars, exact definition, and a mini diagram: a 3 × 5 grid for line shapes (positions are the 1st–5th printed number of each line), a 3 × 9 grid for column patterns, or a badge for value rules (*Any 5*, *Has 8*, *1–45*, *2 low + 2 high*) |
| Actions | **Cancel** / **Save Setup** (at least one pattern required) |

On phones the modal becomes a single scrolling column with full-width controls.

### 3.2 Behaviour
- **Before creating the room**: the saved setup is shown as a summary under *Regional Rule Presets* and sent with the create request (also used for solo games).
- **In the lobby**: saving sends `POST /api/rooms/settings`; every player's lobby and briefing update immediately (`SETTINGS_UPDATED`).
- **Server sanitisation**: only catalogue IDs are accepted (unknown IDs and any client-supplied pattern definitions are discarded); duplicates are removed; Full House tiers are always ordered last; an empty list falls back to the Classic 6; caller mode is `HOST` or `AUTO`; the interval is clamped to 3–30 s.

---

## 4. Ticket and draw

### 4.1 Ticket
- 3 rows × 9 columns, exactly **15 numbers**: 5 per row, 4 blanks per row, every column holding 1–3 numbers.
- Column ranges: 1–9, 10–19, 20–29, …, 70–79, 80–90; numbers ascend down each column.
- Each player (including the host) receives one ticket. **A player only ever receives their own ticket.**

### 4.2 Draw
- A shuffled pool of 1–90 drawn without replacement. The pool order is never sent to clients.
- Each draw updates the **current number** ball, the "Called: n / 90" counter and the **1–90 board** (called numbers highlighted, latest number emphasised) for everyone.
- Auto-call runs on a timer in the caller's browser at the chosen interval and can be paused/resumed; closing the caller's tab pauses it.

---

## 5. Marking (user experience)
- Tap a number on your ticket to **cross it out**: two translucent red strokes form an ✕ over the cell, so the number stays clearly readable. The cell tints warm and the cross draws in with a quick stroke (no animation under reduced motion).
- Tap again to remove the cross. Keyboard: Tab to a number, Enter/Space toggles it. Screen readers hear "Number 45, crossed out".
- Crosses are a personal aid stored only in the browser; **claims are verified against the numbers actually called**, so a wrong cross can never win and a missed cross can never lose a valid claim.

---

## 6. Claims

### 6.1 Claim cards
Below the ticket, one card per pattern in play: name, popularity stars, mini diagram, definition, status (*Available* or *Won by: Name*) and a **Claim** button. Cards update live as others win; a won card turns green and its button disables.

### 6.2 Verification (server)
| Check | Result if it fails |
|---|---|
| Pattern exists in this game | "Invalid pattern structure" |
| Pattern still open (one winner per pattern) | "*Pattern* has already been claimed and closed!" |
| Player has not already won this pattern | "*Name* has already won *Pattern*!" |
| Full House order: 2nd/3rd Full House only after the previous tier is won, by a different player | "*Pattern* opens only after *Previous* has been won" / "…goes to another player" |
| Ticket has numbers for this pattern (e.g. Fat Ladies needs an 8) | "Your ticket has no numbers for *Pattern*" |
| Every required number has been called | **Bogey Claim!** with up to three uncalled numbers |

A valid claim is recorded with the ball number and draw order, announced in Match Activity and plays a victory sound. Rejections are logged for audit; there is no penalty beyond losing the claim. Winners' matched numbers are not broadcast.

### 6.3 Rule types (how each pattern is evaluated)
| Type | Requirement |
|---|---|
| Count | Any *n* numbers on the ticket called (Early 3/5/7) |
| Lines | Specific positions (1st–5th printed number) on specific lines |
| Any lines | Any *n* complete lines |
| Columns | Every number in the given columns |
| Extremes | The *n* lowest and/or highest numbers |
| Values | Every number that is odd, even, contains a digit, or lies in a range |
| Full House tier | All 15 numbers, with tier ordering |

---

## 7. Winning pattern catalogue (52)

Popularity reflects how widely each dividend appears across popular Tambola/Housie guides: ★★★★★ = the classic six played almost everywhere; ★★★★ = standard extras; ★★★ = common party patterns; ★★ = regional and niche variations. Where sources disagree, the definition below is the one the game uses and displays.

| # | Pattern | Also known as | Category | Popularity | Definition |
|---|---|---|---|---|---|
| 1 | **Early Five** | Jaldi 5 | Quick | ★★★★★ | Any 5 numbers on the ticket |
| 2 | **Top Line** | First Line | Lines | ★★★★★ | All 5 numbers of the top line |
| 3 | **Middle Line** | Second Line | Lines | ★★★★★ | All 5 numbers of the middle line |
| 4 | **Bottom Line** | Third Line | Lines | ★★★★★ | All 5 numbers of the bottom line |
| 5 | **Four Corners** | Corners | Corners | ★★★★★ | First and last numbers of the top and bottom lines |
| 6 | **Full House** | Housie / Tambola | Full House | ★★★★★ | All 15 numbers on the ticket |
| 7 | **Second Full House** | 2nd Housie | Full House | ★★★★ | All 15 numbers, after the first Full House, by a different winner |
| 8 | **Star** | Cross Rule / Corners with Star | Shapes | ★★★★ | Four corners plus the middle number of the middle line |
| 9 | **Pyramid** | Triangle | Shapes | ★★★★ | 3rd number of the top line; 2nd and 4th of the middle; 1st, 3rd and 5th of the bottom |
| 10 | **Temperature** | BP Rule | Values | ★★★★ | The lowest and the highest number on the ticket |
| 11 | **Bamboo** | Middle Column | Shapes | ★★★★ | The 3rd (middle) number of every line |
| 12 | **Six Corners** | All Corners | Corners | ★★★★ | First and last numbers of every line |
| 13 | **Breakfast** | Columns 1-3 | Columns | ★★★★ | Every number in the first three columns (1-29) |
| 14 | **Lunch** | Columns 4-6 | Columns | ★★★★ | Every number in the middle three columns (30-59) |
| 15 | **Dinner** | Columns 7-9 | Columns | ★★★★ | Every number in the last three columns (60-90) |
| 16 | **Odd Numbers** | Odd Rule | Values | ★★★★ | Every odd number on the ticket |
| 17 | **Even Numbers** | Even Rule | Values | ★★★★ | Every even number on the ticket |
| 18 | **Any Two Lines** | Double Line | Lines | ★★★★ | Any two complete lines (10 numbers) |
| 19 | **Early Seven** | Jaldi 7 | Quick | ★★★★ | Any 7 numbers on the ticket |
| 20 | **Third Full House** | 3rd Housie | Full House | ★★★ | All 15 numbers, after the second Full House, by a different winner |
| 21 | **Early Three** | Jaldi 3 | Quick | ★★★ | Any 3 numbers on the ticket |
| 22 | **King's Corners** | First of Every Line | Corners | ★★★ | The first number of every line |
| 23 | **Queen's Corners** | Last of Every Line | Corners | ★★★ | The last number of every line |
| 24 | **First Half (1-45)** | Day Rule | Values | ★★★ | Every number from 1 to 45 on the ticket |
| 25 | **Second Half (46-90)** | Night Rule | Values | ★★★ | Every number from 46 to 90 on the ticket |
| 26 | **Laddu** | Bull's Eye | Quick | ★★★ | The middle number of the middle line |
| 27 | **Fat Ladies** | All 8s | Digits | ★★★ | Every number containing the digit 8 |
| 28 | **Smallest Five** | Small Five | Values | ★★★ | The five lowest numbers on the ticket |
| 29 | **Biggest Five** | High Five | Values | ★★★ | The five highest numbers on the ticket |
| 30 | **Letter H** | H Rule | Letters | ★★★ | The whole middle line plus the first and last numbers of the top and bottom lines |
| 31 | **Letter T** | T Rule | Letters | ★★★ | The whole top line plus the 3rd number of the middle and bottom lines |
| 32 | **Letter L** | Lovers' Lane | Letters | ★★★ | The first number of every line plus the whole bottom line |
| 33 | **Border** | Lockdown | Shapes | ★★★ | The whole top and bottom lines plus the first and last numbers of the middle line |
| 34 | **Red Cross** | Plus | Shapes | ★★★ | The whole middle line plus the 3rd number of the top and bottom lines |
| 35 | **Anda** | All 0s | Digits | ★★ | Every number containing the digit 0 |
| 36 | **Danda** | All 1s | Digits | ★★ | Every number containing the digit 1 |
| 37 | **Ugly Ducklings** | All 2s | Digits | ★★ | Every number containing the digit 2 |
| 38 | **Pandavas** | All 5s | Digits | ★★ | Every number containing the digit 5 |
| 39 | **Hockey Sticks** | All 7s | Digits | ★★ | Every number containing the digit 7 |
| 40 | **Double Temperature** | Double BP | Values | ★★ | The two lowest and the two highest numbers on the ticket |
| 41 | **Ladder** | 1-2-3 | Shapes | ★★ | 1st number of the top line, 2nd of the middle line, 3rd of the bottom line |
| 42 | **Reverse Pyramid** | Inverted Triangle | Shapes | ★★ | 1st, 3rd and 5th of the top line; 2nd and 4th of the middle; 3rd of the bottom |
| 43 | **Railway Track** | Top & Bottom | Lines | ★★ | The whole top line and the whole bottom line |
| 44 | **First Twins** | Left Pairs | Shapes | ★★ | The first two numbers of every line |
| 45 | **Last Twins** | Right Pairs | Shapes | ★★ | The last two numbers of every line |
| 46 | **Hum Tum** | You & Me | Shapes | ★★ | First two numbers of the top line and last two numbers of the bottom line |
| 47 | **I Love You (143)** | 1-4-3 | Shapes | ★★ | First number of the top line, first four of the middle, first three of the bottom |
| 48 | **Drum** | Inner Columns | Shapes | ★★ | The 2nd, 3rd and 4th numbers of every line |
| 49 | **Safe** | Inner Three | Shapes | ★★ | The 2nd, 3rd and 4th numbers of the middle line (everything off the border) |
| 50 | **Odd Positions** | Odd Columns | Shapes | ★★ | The 1st, 3rd and 5th numbers of every line |
| 51 | **Diamond** | Kite | Shapes | ★★ | 3rd number of the top line, first and last of the middle line, 3rd of the bottom line |
| 52 | **Ab Tak Chappan** | Up to 56 | Values | ★★ | Every number from 1 to 56 on the ticket |

---

## 8. Game end and results
The game finishes when **any** of these happens:
1. The final Full House tier in play is won (e.g. Third Full House if all three are chosen).
2. Every pattern in play has a winner.
3. All 90 numbers have been called and the caller draws again.

The Results podium ranks Full House winners first (in tier order), then other pattern winners by time of claim. If nobody claimed anything: "All balls were called without a winning claim."

---

## 9. Screens

### 9.1 Lobby
- **Briefing**: role (*You are the caller* / *You get one ticket of 15 numbers*), goal, how to mark and claim, the caller mode, and every pattern in play with its definition (first six shown, the rest in *Show N more patterns*).
- **Active Game Rules**: "*N* winning patterns · Manual caller / Auto caller · every Ns" with pattern chips; the host also sees **🎯 Game Setup: Patterns & Caller**.

### 9.2 Game stage
| Area | Content |
|---|---|
| Caller header | Current number ball, "Called: n / 90", caller-only **🎯 Draw Next Number** or **▶ Auto-Call (Ns)** |
| 1–90 board | All numbers; called ones highlighted, latest emphasised |
| Ticket | "👑 ROYAL TAMBOLA TICKET", ticket ID, 3 × 9 grid with tap-to-cross |
| Claim Winning Patterns | Claim cards (§6.1) |
| Side panel | Room chat and Match Activity (no dice) |

---

## 10. Scale and privacy
- Up to **50 players** per room; the chat roster scrolls when large.
- Each broadcast is personalised without cloning other players' tickets, the ball pool or the audit log. Measured: a draw broadcast to 40 connected players in about 3 ms.
- Players never receive other players' tickets, the remaining ball order, the audit log, or winners' matched numbers.

---

## 11. Edge cases
| Case | Behaviour |
|---|---|
| Two players claim the same pattern at once | The first claim processed by the server wins; the second is told it is closed |
| Claim before enough numbers are called | Bogey; listed uncalled numbers |
| Pattern impossible for a ticket (e.g. no 8s for Fat Ladies) | Claim rejected for that ticket only |
| Second Full House claimed before the first | Rejected until the first is won |
| Host leaves | Host (and caller) rights pass to the next player |
| Reload mid-game | Ticket and state are restored from the server; personal crosses are cleared |

---

## 12. Acceptance criteria
- [ ] Only the host sees **🎯 Game Setup** and the draw controls; the server enforces both.
- [ ] Setup offers 52 patterns with popularity stars, presets, search, categories and diagrams.
- [ ] The chosen patterns, and only those, appear as claim cards for every player.
- [ ] Rooms accept up to 50 players; the 51st is turned away.
- [ ] Each player receives only their own ticket.
- [ ] Crossed numbers show a translucent ✕ with the number still readable.
- [ ] Every claim is verified against called numbers; bogeys are rejected with a reason.
