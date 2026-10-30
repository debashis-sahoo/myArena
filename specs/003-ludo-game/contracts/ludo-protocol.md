# Contract: Ludo Game Protocol

What the Ludo server module and the Ludo web module exchange over the game channel
([game-channel.md](game-channel.md)), and the shape both the online match and the solo match
render. The rules live in `packages/ludo`; this contract only names the messages.

## 1. Game id and descriptor

```text
id                   ludo
name                 Ludo
minParticipants      2
maxParticipants      4
defaultParticipants  4
durationMinutes      { min: 20, max: 45 }
modes                SOLO_AI, ONLINE
category             Classic board
art                  { icon: TARGET, palette: CRIMSON, image: LUDO }
settingsSchema       strict object, see section 2
```

The static roadmap entry for `ludo` is removed; the catalog entry now comes from this descriptor.

## 2. Room settings (`gameSettings`)

| Key | Values | Default | Notes |
|-----|--------|---------|-------|
| `theme` | `classic`, `super-heroes`, `halloween`, `diwali`, `winter` | `classic` | Chosen by the host in the lobby; fixed once the match starts |
| `turnLimitSeconds` | `0`, `30`, `60`, `90` | `60` | `0` means no limit |

Unknown keys are rejected (strict). Settings can be changed only while the room is in the lobby,
which the platform already enforces.

Solo settings (never sent to a server): `theme`, `opponents` (1 to 3), `difficulty`
(`easy`, `normal`, `hard`; default `normal`). There is no turn limit in solo play.

## 3. Client actions (`game.action`)

| `action.type` | `payload` | Allowed when |
|---------------|-----------|--------------|
| `roll` | none | It is the sender's turn and the phase is `ROLL` |
| `move` | `{ pawn }` with `pawn` an integer 0 to 3 | It is the sender's turn, the phase is `MOVE`, the die has settled, and that pawn is in `legalPawns` |
| `resume` | none | The sender's seat is marked away; clears the mark |

Any other `type`, extra payload fields, or a `pawn` outside 0 to 3 is refused as `GAME_ACTION_REJECTED`
with the reason `INVALID_ACTION` (the platform already validates the generic `game.action` frame and
answers `VALIDATION_FAILED` for a malformed frame). A well-formed action that is not allowed now is
`GAME_ACTION_REJECTED` with one of these reasons, each with a plain-language `detail` and a `nextStep`:

| Reason | Meaning | Next step shown |
|--------|---------|-----------------|
| `NOT_YOUR_TURN` | It is another seat's turn | Wait for your turn |
| `NOT_PLAYING` | The sender holds no seat in this match (joined after it started, or left) | Wait in the room for the next match |
| `ALREADY_ROLLED` | The die is already rolled this turn | Choose a pawn to move |
| `DIE_STILL_ROLLING` | The roll has not settled | Wait for the die to stop |
| `MOVE_NOT_ALLOWED` | That pawn cannot move with this roll, or no roll is waiting | Choose one of the highlighted pawns |
| `NOT_AWAY` | `resume` from a seat that is not away | None needed |
| `MATCH_ENDED` | The match is over | Return to the lobby or play again |

A rejected action never changes the match. A repeated `clientActionId` returns the stored result.

## 4. Pawn positions

A pawn's `step` is an integer:

| `step` | Meaning |
|--------|---------|
| `-1` | In base |
| `0` | On its own start square |
| `1` to `50` | On the shared ring (51 squares from its start, the 52nd square is skipped) |
| `51` to `55` | In its own home lane |
| `56` | Home |

Ring square for steps 0 to 50: `(startIndex[color] + step) mod 52`, with `startIndex` Red 0,
Green 13, Yellow 26, Blue 39. Star squares are ring indexes 8, 21, 34 and 47. Start squares
(ring indexes 0, 13, 26, 39) and star squares are protected.

## 5. View (`state`) sent to a recipient

```text
LudoView =
  | { kind: "WAITING" }
  | { kind: "MATCH", ... }
```

`WAITING` is the entire view for a member who holds no seat in the running match (they joined
after it started, or their seat was released). It carries no board, so such a member sees only
a "match in progress" message and the room's chat.

`MATCH`:

```text
theme              theme id
turnLimitSeconds   0 | 30 | 60 | 90
you                seat index of the recipient, or null (a solo visitor is always seat 0)
seats              1 per active colour, in turn order (clockwise: Red, Green, Yellow, Blue)
  index            0..3, position in the list
  color            RED | GREEN | YELLOW | BLUE
  kind             HUMAN | COMPUTER
  label            display name shown to others ("Computer 1" for computers)
  participantId    present for HUMAN online seats only
  away             boolean
  left             boolean       true once the seat was released; its pawns are gone
  pawns            four steps    empty when left
  home             number of pawns on step 56
turn
  seat             index of the seat to act, or null after the match ends
  phase            ROLL | MOVE | ENDED
  dice             1..6 when phase is MOVE, else null
  legalPawns       pawn indexes that may move (phase MOVE), else []
  sixesInRow       0..2
  decisionMsLeft   milliseconds left to decide, or null when there is no limit
  settleMsLeft     milliseconds until the roll is treated as settled, or 0
winner             seat index, or null
log                the last 50 entries, oldest first: { n, text, seat? }   n increases for ever in a match
```

The view contains no hidden information (Ludo has none). A seat is never identified to others by
anything beyond its display label and colour.

`decisionMsLeft` and `settleMsLeft` are remaining times at send, so clients need no shared clock:
a client counts down from its own receipt time.

## 6. Events (`events`, for animation and announcements)

Each is a small JSON object with a `kind`; clients ignore unknown kinds.

| `kind` | Fields | Used for |
|--------|--------|----------|
| `ROLLED` | `seat`, `value` 1..6, `seed` 0..4294967295, `durationMs` | Starts the die animation on every client; settles on `value` |
| `MOVED` | `seat`, `pawn`, `from`, `to`, `captured?: { seat, pawn }` | Pawn travel, capture, home celebration |
| `NO_MOVE` | `seat`, `value` | "No legal move" notice, turn passing |
| `AUTO_PLAYED` | `seat`, `reason` (`TIMEOUT` or `AWAY`), `pawn?` | "The game played for X" notice |
| `AWAY_SET` / `AWAY_CLEARED` | `seat` | Away banner |
| `SEAT_LEFT` | `seat` | Pawns leave the board |
| `TURN` | `seat` | Announce the next player |
| `WON` | `seat` | Result |

The die animation is presentation only. `seed` makes every client draw the same throw, and the
throw always ends on `value`. A viewer who joins or returns during a roll gets only `state`,
which already carries the settled `dice`, so no contradictory replay can happen.

## 7. Timing rules (server)

| Constant | Value | Meaning |
|----------|-------|---------|
| `ROLL_ANIMATION_MS` | 2400 | `durationMs` of `ROLLED`, so a roll settles within 3 s including delivery |
| `AUTO_PAUSE_MS` | 600 | Pause after settling before the game plays for an away seat |
| `NO_MOVE_PAUSE_MS` | 1200 | How long a "no move" result stays before the turn passes |
| `AWAY_AFTER_MISSES` | 3 | Consecutive timeouts before a seat is marked away |

- The decision timer (`turnLimitSeconds`) starts at each point a seat must decide, the roll and
  then the move, and is cancelled when the seat acts. `0` creates no timer.
- On a timeout the game plays for the seat: at the roll it rolls (using the same fair die and
  the same animation), then at the move it picks by the fixed preference **capture if possible,
  otherwise the pawn furthest along, otherwise the lowest pawn index**. It announces
  `AUTO_PLAYED` and counts one missed turn.
- Any manual `roll`, `move` or `resume` resets the missed-turn count. After 3 missed turns in a
  row the seat is marked away; the game then rolls and moves for it, with `AUTO_PAUSE_MS`
  pauses, until the person sends `resume`.
- While the die is rolling the platform accepts no `move` (`DIE_STILL_ROLLING`).
- If a seat is released, its pawns leave the board, the turn passes if it was theirs, and if
  one seat remains that seat wins.

## 8. Randomness (server)

Every die value, every animation seed and the choice of the first player come from the
operating system's cryptographic generator on the server. A client never supplies or influences
any of them. In test runs (never in production) a fixed sequence can replace the die so
scenarios are repeatable; production start-up refuses that setting.

## 9. Logging and privacy

Server logs carry match start, end and the number of seats only. They never contain display
names, roll values, board state or tokens. The game log in the view is for players only and is
discarded with the match.
