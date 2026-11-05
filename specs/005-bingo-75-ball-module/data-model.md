# Phase 1 Data Model: Bingo (75-Ball) Visual-First Game Module

Everything below lives in server memory for the life of the lobby and match, except two per-device preferences. Types are conceptual; exact
definitions go in `shared/src/bingo/` and must follow [contracts/bingo-protocol.md](contracts/bingo-protocol.md). Pattern rules:
[research.md](research.md) R3.

## Entities

### Lobby (before the match; public to the room via `RoomState.gameLobby`)

| Field | Rule |
|-------|------|
| `ceiling` | 1 to 3, default 1: the most cards any one person may take (FR-002). |
| `hostPlays` | Boolean, default `true`: whether the host also takes cards (FR-004). |
| `patterns` | Ordered list of chosen pattern ids (at least 1 to start), in catalogue order. Default: `single-line`, `four-corners`, `blackout`. Only catalogue ids are accepted. |
| `caller` | `{ mode: 'manual' }` or `{ mode: 'auto', intervalMs: 5000 \| 8000 \| 10000 }`. Default manual. |
| `choices` | Map `playerId -> 1..ceiling` (default 1). The host's entry exists only when `hostPlays`. |

Room capacity (the player limit, 2 to the per-game ceiling, counting the host) is the platform's existing `capacity`.

Lobby rules (same as Housie's lobby, FR-001 to FR-006):

- Lowering `ceiling` clamps every `choices` entry to the new value; each affected player sees a short notice.
- Lowering `capacity` below the seated count is refused by the platform (`CAPACITY_BELOW_PLAYERS`).
- A person leaving removes their `choices` entry; a new person starts at 1.
- Host handover in the lobby keeps all settings; `hostPlays` then applies to the new host (if it is false, a leftover `choices` entry for the new host is
  ignored and the client hides their stepper).
- After a *new round* (`room:reset`) every setting returns to its default and every choice to 1; the room's capacity is kept.
- Start is refused when no pattern is chosen ("Pick at least one pattern.") or fewer than two people are seated (the platform's minimum-player check answers
  first with "At least 2 players are needed to start."; the engine's own "Wait for at least one more person." is the fallback).

### Match

| Field | Description / rule |
|-------|--------------------|
| `seq` | Integer that increases with every public event; clients ignore stale events. |
| `phase` | `running` or `finished`. |
| `settings` | Frozen copy of the lobby at start: `patterns`, `ceiling`, and the initial `caller` (mode and interval stay changeable; the rest are fixed, FR-006). |
| `deck` | Server-only call order: a shuffle of 1 to 75. Never sent. |
| `called` | Numbers drawn so far, in order (public). Length 0 to 75. |
| `caller` | `{ mode: 'manual' \| 'auto', intervalMs, paused }` (public; the host controls it). |
| `nextDrawAt` | Server-only time of the next automatic draw; clients receive `nextInMs` for a display-only ring. |
| `players` | Ordered list of PlayerEntry (card holders only; a non-playing host is absent). |
| `patterns` | One PatternState per chosen pattern, in catalogue order. |
| `results` | At finish: for each pattern the winner or none. |

### PlayerEntry (server) and what clients see

| Field | Description / rule |
|-------|--------------------|
| `playerId`, `name`, `color` | From the platform. Color tags come from the 12-color roster palette. |
| `cards` | 1 to `ceiling` BingoCards. **Private**: only the owner's snapshot contains them. |
| `daubs` | One 25-bit mask per card (bit `row * 5 + col`). The FREE cell (bit 12) is never set: it always counts. **Private**. |
| `lastClaimAt` | Server-only timestamp for the 2 s claim pace (FR-029). |
| `bogusStreak`, `lockedUntil` | Server-only. `bogusStreak` counts consecutive bogus claims (a valid claim resets it; "too late" leaves it unchanged). At 3 the player is locked: `lockedUntil = now + CLAIM_LOCK_MS` and the streak resets to 0. |
| `status` | `playing`, or `left` once the seat is released: cards stop playing, daubs are discarded, patterns already won stay claimed. |

### BingoCard

A 5 by 5 grid stored as 25 numbers in row-major order (index `row * 5 + col`; columns B, I, N, G, O). Validity (`validateBingoCard`, FR-007):

- column B holds five different numbers from 1-15, I from 16-30, N four different numbers from 31-45, G from 46-60, O from 61-75;
- the centre cell (index 12, third row of N) is `0`, meaning FREE; every other cell is a number;
- no number appears twice on the card;
- no two cards in a match share the canonical key (the 24 numbers joined as text).

A card is addressed by its **index** within its owner (0 to 2), shown to the player as "Card 1" to "Card 3".

### Winning Pattern (catalogue entry)

Static data in `shared/src/bingo/patterns.ts` (research R3): `id`, `name`, `group` (`standard` or `custom`), `description`, `illustration` (cell indexes for
the picture) and `variants` (alternative cell-index lists). A pattern is completed when some variant has all cells satisfied (see Claim).

### PatternState (per chosen pattern, public)

| Field | Description / rule |
|-------|--------------------|
| `id` | A catalogue pattern id. |
| `status` | `open` ("Available") or `claimed`. |
| `claimedBy` | When claimed: `{ playerId, name, color }`. The winning card number is not shown to others. |
| `claimedAtCall` | The `called.length` when it was claimed (used by the results screen). |

There is no `locked` state: unlike Housie's Full House sequence, every pattern is independently claimable.

### Claim (transient)

A claim is an action `{ card }`. The server records only the pace timestamp, the bogus streak and the lock.

**Decision order** (FR-023 to FR-029); the first failing step decides the reply:

1. Match is `running`; the sender is a `playing` entry; `card` is one of the sender's cards (otherwise an error ack, not a bogus).
2. Lock: `now >= lockedUntil`, otherwise `claimsPaused` (private, remaining ms) and an error ack "Claims paused".
3. Pace: at least `CLAIM_PACE_MS` (2000) since `lastClaimAt`, otherwise an error ack "Wait a moment" (nothing evaluated, no penalty). Passing sets `lastClaimAt`.
4. Evaluate the card against every pattern in play with `evaluateBingoPattern`. A cell is **satisfied** when it is the FREE cell (always), or its daub bit is
   set and its number is in `called` as of this moment.
5. **Accepted**: at least one *open* pattern is completed. Every such pattern becomes claimed by the sender; `bogusStreak = 0`; one public `claimed`
   event carries all awarded ids; if no pattern remains open the match finishes.
6. **Too late**: no open pattern completed, but at least one already-claimed pattern is. Private `tooLate`; no penalty; the streak is unchanged.
7. **Bogus**: nothing completed. Private `bogus`; `bogusStreak++`; at 3, lock for `CLAIM_LOCK_MS` and send `claimsPaused`.

### Results

At finish: a list of `{ pattern, winner? }` in catalogue order plus `calledCount`. Everyone sees it; the host also sees *New round*; everyone sees *Leave*.

## State machines

**Room (platform)**: `lobby` -> `in_progress` -> `lobby` (via host-only `room:reset`) or room closed.

**Match phase**: `running` -> `finished`. `finished` is reached when every chosen pattern is claimed, when the 75th ball has been called, or when no
card holder remains (everyone with cards has left or lost their seat; FR-030). Open patterns then show "No winner".

**Caller**: manual or auto; auto is running or paused. Transitions are host-only intents: `draw` (any mode while running), `auto` (switch to auto at an
interval or change it), `pause`, `resume`, `manual`. Auto stops on finish.

## Constants (`shared/src/bingo/`)

| Constant | Value | Used by |
|----------|-------|---------|
| `BINGO_BALLS` | 75 | Deck, "Called n of 75", finish |
| `BINGO_LETTERS` | `B`, `I`, `N`, `G`, `O` (15 numbers each) | Ball letters, headers, master board |
| `BINGO_CARD_CEILING_MAX` | 3 | Lobby |
| `BINGO_DEFAULT_CARD_CEILING` | 1 | Lobby |
| `BINGO_DEFAULT_PATTERN_IDS` | `single-line`, `four-corners`, `blackout` | Lobby |
| `BINGO_FREE_INDEX` | 12 | Evaluator (always satisfied), daub filter, card rendering |
| `AUTO_INTERVALS_MS`, `CLAIM_PACE_MS`, `BOGUS_STREAK_LIMIT`, `CLAIM_LOCK_MS`, `BALL_ROLL_MS`, `MARK_FLUSH_MS`, `MARK_BATCH_MAX` | Existing Housie values (5/8/10 s; 2000; 3; 60000; 1100; 200; 30) | Reused unchanged from `shared/src/housie/timing.ts` |

## Device preferences (client, `localStorage`)

| Key | Value |
|-----|-------|
| `myarena.bingo.card` | Last selected card index (default after a reload) |

The narrow-screen chat drawer opens closed on every visit and has no stored state.

## Validation summary (where rules live)

| Rule | Server | Client |
|------|--------|--------|
| Card shape and uniqueness | Generates and validates (`validateBingoCard`) | Never generates; renders what it receives |
| Daub acceptance | Only owned cards, cell 0 to 24 (a FREE change is ignored) | Optimistic toggle, batched send; FREE is drawn marked and is not tappable |
| Claim validity and awards | The only evaluator | Sends `{ card }`; shows the public and private results |
| Call order, draws, letters | The only source of numbers | Derives the letter from the number for display |
| Caller permission | `ctx.hostId()` at action time | Shows caller controls when `you === hostId` |
| Pattern catalogue | Imports shared | Imports shared (pictures only) |
