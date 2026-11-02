# Phase 1 Data Model: Housie (Tambola) Visual-First Game Module

Everything below lives in server memory for the life of the lobby and match, except two per-device preferences (chat dock state and
the last selected ticket). Types are conceptual; exact definitions go in `shared/src/housie/` and must follow
[contracts/housie-protocol.md](contracts/housie-protocol.md). Pattern rules: [research.md](research.md) R3.

## Entities

### Lobby (before the match; public to the room via `RoomState.gameLobby`)

| Field | Rule |
|-------|------|
| `ceiling` | 1 to 4, default 1: the most tickets any one person may take (FR-002). |
| `hostPlays` | Boolean, default `true`: whether the host also takes tickets (FR-006). The host chooses this at setup. |
| `patterns` | Ordered list of chosen pattern ids (at least 1 to start). Default: Early Five, Top Line, Middle Line, Bottom Line, Four Corners, Full House 1st. Only catalogue ids are accepted. |
| `caller` | `{ mode: 'manual' }` or `{ mode: 'auto', intervalMs: 5000 \| 8000 \| 10000 }`. Default manual. |
| `choices` | Map `playerId -> 1..ceiling` (default 1). The host's entry exists only when `hostPlays`. |

Room capacity (the player limit, 2 to the configurable ceiling, counting the host) is the platform's existing `capacity`.

Lobby rules:

- Lowering `ceiling` clamps every `choices` entry to the new value; the room state change tells each player (their stepper updates and
  a short notice is shown by the client when its own value was reduced).
- Lowering `capacity` below the seated count is refused by the platform (`CAPACITY_BELOW_PLAYERS`).
- A person leaving removes their `choices` entry; a new person starts at 1.
- Host handover in the lobby keeps all settings. `hostPlays` then applies to the new host: at match start the host is the first seat and receives
  tickets only when `hostPlays` is true; if it is false, any leftover `choices` entry for the new host is ignored (and the client hides their ticket
  stepper).
- The lobby view is plain data (no secrets): settings and choices are meant to be visible to everyone.
- After a *new round* (`room:reset`) every lobby setting returns to its default (ceiling 1, default six combinations, manual calling, host plays on)
  and all choices are 1; the room's player limit (capacity) is kept.

### Match

| Field | Description / rule |
|-------|--------------------|
| `matchRev` | Integer that increases with every public event; clients ignore older snapshots (same idea as Ludo). |
| `phase` | `running` or `finished`. |
| `settings` | Frozen copy of the lobby at start: `patterns`, `ceiling`, and the initial `caller` (mode and interval stay changeable; the rest are fixed, FR-008). |
| `deck` | Server-only call order: a shuffle of 1 to 90. Never sent. |
| `called` | Numbers drawn so far in order (public). `called.length` is 0 to 90. |
| `current` | The last called number or null before the first draw. |
| `caller` | `{ mode: 'manual' \| 'auto', intervalMs, paused: boolean }` (public; the host controls it). |
| `nextDrawInMs` | While auto calling and not paused: milliseconds until the next draw, measured when the event was sent (clients count down for the ring around the DRAW button; display only). |
| `players` | Ordered list of PlayerEntry (holders of tickets only; a non-playing host is absent). |
| `combos` | One ComboState per chosen pattern, in catalogue order. |
| `results` | At finish: for each combination the winner or none. |

### PlayerEntry (server) and PlayerView (public)

| Field | Description / rule |
|-------|--------------------|
| `playerId`, `name`, `color` | From the platform. Color tags come from the 12-colour roster palette (research R7). |
| `tickets` | 1 to `ceiling` Tickets. **Private**: only the owner's snapshot contains them. |
| `marks` | One 27-bit mask per ticket (bit `row*9 + col`). **Private**. |
| `lastClaimAt` | Server-only timestamp used for the 2 s claim pace (FR-027). |
| `bogusStreak`, `lockedUntil` | Server-only. `bogusStreak` counts consecutive bogus claims (a valid claim resets it). At 3 the player is locked: `lockedUntil = now + CLAIM_LOCK_MS` and the streak resets to 0 when the lock ends. |
| `status` | `playing`, or `left` once the seat is released: tickets stop playing, marks are discarded, won combinations stay claimed (edge cases). |

### Ticket

A 3 by 9 grid of cells; each cell is `0` (empty) or a number. Validity rules (checked by `validateTicket`, FR-004):

- every row has exactly 5 numbers; the ticket has 15 numbers;
- column `c` (0 to 8) holds 1 to 3 numbers, all in its range: column 0 is 1 to 9, columns 1 to 7 are `10c` to `10c + 9`, column 8 is 80 to 90;
- numbers ascend top to bottom within a column; no number appears twice;
- no two tickets in a match share the canonical key (the 27 cells joined as text).

A ticket is addressed by its **index** within its owner (0 to 3), shown to the player as "Ticket #1" to "Ticket #4".

### Winning combination (catalogue entry)

Static data in `shared/src/housie/patterns.ts` (see research R3): `id`, `name`, `group` (`early`, `lines`, `shapes`, `numbers`,
`house`), `description`, `illustration` (cells for the picture), and `rule` (`cells`, `rows`, `count`, or `full`).

### ComboState (per chosen pattern, public)

| Field | Description / rule |
|-------|--------------------|
| `id` | A catalogue pattern id. |
| `status` | `open` or `claimed`. |
| `claimedBy` | When claimed: `{ playerId, name, color }`. The winning ticket number is not shown to others. |
| `locked` | True for Full House 2nd and 3rd until the previous one is claimed (research R3); the tile shows a disabled button. |
| `claimedAtCall` | The `called.length` when it was claimed (used by the results screen). |

### Claim (transient)

A claim is an action `{ combo, ticket }`. The server records nothing about bogus claims beyond the pace timestamp.

**Validity** (FR-023), evaluated in this order; the first failure decides the private reply:

1. Match is `running`; the sender is a `playing` entry; `combo` is in `settings.patterns`; `ticket` is one of the sender's tickets.
2. The combination is `open` and not `locked` (otherwise the sender gets "just claimed" or "not yet").
3. Pace and lock: at least `CLAIM_PACE_MS` (2000) since the sender's last claim, otherwise the action is rejected with "Wait a moment"; and `now >= lockedUntil`, otherwise it is rejected with "Claims paused" (and the lock end time is sent privately, see `claimsPaused`).
4. The pattern rule is satisfied on that ticket, where a cell is satisfied only if its number is in `called` (as of this moment) **and** its
   mark bit is set. For Full House 2nd and 3rd, the ticket must not already have won a Full House.

Accepted: set `status`, `claimedBy`, emit the public `claimed` event, post the win notice to chat, and finish if no combination is
open. Rejected as bogus: send only the claimant a private `bogus` event (no reason, so nothing is hinted).

### Results

At finish: list of `{ combo, winner? }` in catalogue order plus the `called.length`. Everyone sees it; the host also sees *New round*
and *Leave*; everyone sees *Leave*.

## State machines

**Room (platform)**: `lobby` -> `in_progress` -> `lobby` (via the new host-only `room:reset`) or room closed.

**Match phase**: `running` -> `finished`. `finished` is reached when every chosen combination is claimed, or the 90th ball has been
called and no further draw is possible (open combinations then show "No winner").

**Caller**: manual or auto; auto is `running` or `paused`. Transitions are host-only intents: `draw` (any mode while running), `auto`
(switch to auto at an interval, or change it), `pause`, `resume`, `manual` (switch to manual). Auto stops on finish.

## Timing constants (`shared/src/housie/timing.ts`)

| Constant | Value | Used by |
|----------|-------|---------|
| `AUTO_INTERVALS_MS` | 5000, 8000, 10000 | Caller |
| `CLAIM_PACE_MS` | 2000 | Claim rate limit |
| `BOGUS_STREAK_LIMIT` | 3 | Consecutive bogus claims that trigger a lock |
| `CLAIM_LOCK_MS` | 60000 | Length of the claim lock |
| `BALL_ROLL_MS` | 1100 | Reveal animation length (client; server does not wait on it) |
| `MARK_FLUSH_MS` | 200 | Client mark batching |
| `MARK_BATCH_MAX` | 30 | Largest `marks` change list |
| `STATE_COALESCE_MS` | 250 | `room:state` coalescing above 12 seats (platform constant, lives in `shared/src/limits.ts`) |
| `COALESCE_ABOVE` | 12 | Capacity above which coalescing applies (platform constant, lives in `shared/src/limits.ts`) |

## Device preferences (client, `localStorage`)

| Key | Value |
|-----|-------|
| `myarena.housie.chat` | `open` or `minimized` (FR-030) |
| `myarena.housie.ticket` | Last selected ticket index (used as the default after a reload) |

## Validation summary (where rules live)

| Rule | Server | Client |
|------|--------|--------|
| Ticket shape, uniqueness | Generates and validates (`validateTicket`) | Never generates; renders what it receives |
| Mark acceptance | Only owned cells that hold a number | Optimistic toggle, batched send |
| Claim validity | The only evaluator | Sends intent; shows the private result |
| Call order, draws | The only source | Renders events |
| Caller permission | `ctx.hostId()` at action time | Shows caller controls when `you === hostId` |
| Pattern catalogue | Imports shared | Imports shared (pictures only) |
