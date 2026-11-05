# Phase 0 Research: Bingo (75-Ball) Visual-First Game Module

Each entry: **Decision**, **Rationale**, **Alternatives considered**. The spec has no open `NEEDS CLARIFICATION` items (five were resolved in
the 2026-11-04 clarification session), so the entries below settle design questions the spec leaves to planning. Facts about existing code
come from the Platform Core (001), Ludo (002), Housie (003) and the polish update (004) as built. Bingo is the third real game and deliberately
reuses Housie's platform hooks; the only new platform work is configuration (R6).

## R1. Rendering and effects

**Decision**: Plain DOM and CSS, as in Ludo and Housie. A card is a CSS grid of `<button>` cells under a B-I-N-G-O header row. The **dauber** is
a CSS neon blob on each daubed cell (a radial-gradient disc in the letter column's color with `mix-blend-mode: screen`, about 55 percent
opacity so the number stays readable underneath) that plays a 140 ms "stamp" (scale 1.7 to 1 with a small rotation and a brief ring) via the Web
Animations API. The **ball** is a CSS sphere (layered radial gradients, a specular highlight, a blurred ground shadow) with its letter above its
number, revealed with a roll-in (right to left with rotation), settle and glow pulse. The FREE cell is drawn with the same dauber from the start (no callout; see R4).
Pattern pictures are inline SVG generated from the catalogue data. No canvas, no 3D library, no new dependency.

**Rationale**: DOM buttons give touch, pointer, keyboard and screen-reader behavior for free (FR-013, FR-038); the three allowed effects (ball
reveal, dauber stamp, claim celebration) are short transforms and opacity changes that stay smooth on mid-range phones.

**Alternatives**: Canvas or WebGL for the ball and dauber (rejected: accessibility, battery, more code); a CSS framework (rejected: the project uses
plain CSS).

## R2. Card generation (server)

**Decision**: Each card is 25 cells in row-major order (index `row * 5 + col`). For each column pick distinct numbers from that column's range with
`node:crypto` `randomInt` using a partial Fisher-Yates shuffle: 5 numbers for B (1-15), I (16-30), G (46-60), O (61-75) and 4 for N (31-45); place
them in random order down the column, with the N column's third row left as the FREE cell (stored as `0`). A canonical key (the 24 numbers joined) goes
into a per-match `Set` so no two cards in the room are identical, and a pure `validateBingoCard(card)` (ranges, counts, no repeats, centre is FREE) runs
on every generated card; a failure logs and regenerates. A development-only audit (`BINGO_DEV_CARD_AUDIT=N`) logs how many of N generated cards
passed and were unique (SC-002 evidence).

**Rationale**: Meets FR-007 and FR-008 exactly with a tiny algorithm; standard 75-ball cards have no ordering rule inside a column, so random order
is correct. With about 10^20 possible cards a collision never happens in practice, but the check is free.

**Alternatives**: Sorted columns (rejected: not part of the 75-ball standard and the spec does not ask for it); pre-computed card tables (rejected:
large data, no benefit).

## R3. Winning patterns as data: one evaluator for all nine

**Decision**: `shared/src/bingo/patterns.ts` holds the catalogue (spec Appendix A) in catalogue order. Each pattern has `id`, `name`, `group`
(`standard` or `custom`), a one-line `description`, an `illustration` (the cell indexes drawn in the picture) and `variants`: a list of alternative
cell-index lists. A pattern is **completed** by a card when at least one variant has every cell *satisfied*; a cell is satisfied when the claimant
daubed it **and** it is the FREE cell or its number is in the server's call list at the moment the claim is received (FR-024).

| Pattern | Variants |
|---------|----------|
| `single-line` | 12: five rows, five columns, two diagonals |
| `four-corners` | 1: `[0, 4, 20, 24]` |
| `letter-x` | 1: both diagonals, 9 cells |
| `letter-l` | 1: whole B column plus bottom row, 9 cells |
| `blackout` | 1: all 25 cells |
| `postage-stamp` | 4: the 2 by 2 block in each corner |
| `diamond` | 1: `[2, 6, 8, 10, 14, 16, 18, 22]` |
| `kite` | 1: `[3, 4, 8, 9, 12, 16, 20]` |
| `inner-square` | 1: the inner 3 by 3 block, 9 cells |

Illustrations show the first variant for "any" patterns (the top row for Single Line, the top-left block for Postage Stamp) with a small caption
"any line" or "any corner". The evaluator is pure and used only by the server; the client imports the catalogue to draw pictures and never to decide
a claim.

**Rationale**: One data-driven catalogue keeps chooser, tiles and validation in agreement and makes adding a pattern a data change. A single `variants`
shape covers "any of" patterns and fixed shapes without separate rule kinds (Housie needed four kinds for 40 patterns; nine do not).

**Alternatives**: Nine hand-written validators (rejected: drift from the pictures); reusing Housie's evaluator (rejected: it is built around 3 by 9
tickets and per-row cell positions).

## R4. Daubs and claim authority

**Decision**: The server stores each player's daubs per card as a 25-bit mask (bit `row * 5 + col`). The FREE cell (bit 12) is never stored: it always counts,
the evaluator treats it as satisfied, and a `daubs` change naming it is ignored (no error). Clients toggle
optimistically and send small batched `daubs` intents; the server accepts a change only for a card the sender owns and a cell index 0 to 24 other than FREE,
and never infers or adds a daub (FR-012). The client coalesces taps for about 200 ms into one action (up to 30 changes)
and always flushes pending daubs immediately before a `bingo` claim (socket messages are ordered), so the server holds the latest daubs first. The
snapshot restores daubs on reload or reconnect (FR-016).

FREE was first specified as a cell the player must tap, with a "Tap to claim your FREE space!" tooltip and a private per-card `freeTapped` flag. Playtesting
showed the tooltip looked like a button but passed taps through to the numbers under it, so a tap on the callout often daubed a neighbour instead. On 2026-11-05 the
owner chose to mark FREE by default (spec Clarifications, FR-015); the tooltip, the flag and the FREE-toggle path were removed.

**Rationale**: FR-024 needs the server to check daubs. Batching stays inside the per-socket rate limit (burst 10, 5 per second). Keeping FREE out of the mask means
there is no state to lose, restore or get wrong, and claims through the centre need only the other cells.

**Alternatives**: A tooltip with per-device or server-held "FREE tapped" memory (rejected on 2026-11-05 together with the tapped FREE cell, see above); sending daubs only with the claim (rejected: reconnect
and multi-tab lose them); one message per tap (rejected: trips the rate limit).

## R5. Ball drawing and the caller

**Decision**: Same mechanism as Housie. At match start the server builds the call order with a Fisher-Yates shuffle of 1 to 75 using `crypto.randomInt`
and keeps it private; each draw reveals the next entry, so no number repeats (FR-018). Auto calling chains `ctx.schedule` timers at 5000, 8000 or 10000 ms;
pause cancels the pending timer, resume schedules a new one, changing the interval reschedules from that moment, and a manual draw while auto runs
restarts the timer. Timers belong to the match and keep running if the host disconnects; caller permissions use `ctx.hostId()` at action time so host
handover needs nothing extra. Each ball's letter is derived from its number (`ballLetter(n)`), so no letter is ever sent.

**Rationale**: Reuses the platform's timer ownership and keeps one authority; SC-006 holds because the timer is the only scheduler.

**Alternatives**: `randomInt` over the remaining numbers per draw (equivalent; a precomputed order makes the development deck control simple).

## R6. Platform reuse and the only platform changes

**Decision**: Bingo needs **no new platform hook**. It uses what Housie added (see `specs/003-housie-tambola-module/contracts/platform-extensions.md`):
the lobby channel (`createLobby`, `lobbyView`, `onLobbyAction`, `onLobbyLeave`, `validateStart`), roster seating, `quietChat`, `emitTo`, `hostId`,
`room:reset`, coalesced state broadcasts and the socket guard. The changes are configuration and registration only:

1. `shared/src/games.ts`: Bingo becomes `active` with `minPlayers: 2`, `maxPlayers: 200`, `defaultCapacity: 10`, `supportsAi: false`, `roster: true`,
   `quietChat: true`.
2. **Per-game player ceiling**: `roomStore` currently reads `config.housieMaxPlayers` for every roster game. It becomes a lookup by game id with a new optional
   `BINGO_MAX_PLAYERS` (default 200, clamped 2 to 500), leaving `HOUSIE_MAX_PLAYERS` untouched (FR-001 "single operator-adjustable setting").
3. `server/src/sockets/schemas.ts`: the strict action union gains `setCards`, `daubs` and `bingo`; the host intents that have the same shape in
   Housie (`setCeiling`, `setHostPlays`, `setPatterns`, `setCaller`, `draw`, `auto`, `manual`, `pause`, `resume`) are reused as they are and each engine
   enforces its own limits.
4. Engine and client registries gain a `bingo` entry (match screen, lobby screen, feed).
5. `server/scripts/smoke.ts`: its "unavailable game" assertion uses `bingo`, which is no longer unavailable; the existing assertion switches to
   `snakes-and-ladders` (no new assertions).

Chat purity (FR-031) needs no change: with `quietChat` the platform writes no automatic line while the match runs, and Bingo never calls
`ctx.notice`, so the chat has no system line at all (stricter than Housie, which posts one accepted-win line).

**Rationale**: Principle IV: shared room capabilities stay in the platform and are already game-agnostic; the second consumer needs no rewrite.

**Alternatives**: One shared `ROSTER_MAX_PLAYERS` for all roster games (rejected: changes Housie's documented setting); a new engine-declared ceiling
(rejected: more platform surface for one number).

## R7. Claim decision: one BINGO! press, the server finds the patterns

The authoritative statement of the order below is [data-model.md](data-model.md) "Claim (transient)"; this entry gives the reasoning.

**Decision**: A claim is `{ card }`. In order, the server: checks the match is running, the sender is a playing entry and owns that card; applies the
claim lock (`claimsPaused` private event) and the 2 s pace; then evaluates the card against **every pattern in play**:

1. If it completes at least one **open** pattern: award every open pattern it completes, set each to claimed with the claimant, reset the bogus streak,
   publish one `claimed` event carrying all awarded pattern ids, and finish the match if no pattern is open (clarification 2).
2. Else if it completes only patterns that are **already claimed**: private `tooLate` event, no penalty, the streak is unchanged (FR-027).
3. Else: private `bogus` event, streak +1, and at 3 a 60 s lock (FR-029).

The claim is decided at the moment the server receives it on a single thread, so the first arrival wins a race (FR-028): the loser's later evaluation
finds those patterns already claimed and gets `tooLate`. There is no deadline: a completed pattern stays claimable until won (clarification 4), and
only numbers called before receipt count (FR-024). A claim names only a card; there is no field for a pattern, a ball or a result, so a client
cannot choose what it wins. A claim for a card the player does not own is refused with an error ack, not counted as bogus.

**Rationale**: The spec's single glowing button and "submit their card for validation" map directly to this; evaluating all open patterns at once
removes the need for ordering rules (no Full House sequencing as in Housie).

**Alternatives**: Per-pattern claim buttons (rejected: the spec has one BINGO! button); awarding one pattern per press (rejected by clarification 2).

## R8. Client state architecture

**Decision**: Same shape as Housie. `bingoStore.ts` is an external store (`useSyncExternalStore`) registered as the game feed
(`registerGameFeed('bingo', ...)`), holding the receiver's `BingoView`, the optimistic daub masks, the selected card (per device,
`myarena.bingo.card`), the local bogus and too-late notices, the claim lock end time and the celebration key. Public events apply only when
`seq` is exactly `view.seq + 1`; a gap triggers `resyncRoom()`.

**Rationale**: Keeps the platform free of Bingo types and local state (marks being batched, selection) inside the module (Principle IV).

**Alternatives**: Reusing `housieStore` (rejected: different view and events; shared code would couple the games).

## R9. Layout: filling the screen with cards, dashboard, ball console and chat

**Decision**: Measured regions as in Housie (`useRegionSize` and pure planners):

- **Landscape** (`min-width: 720px` and aspect ratio at least 5:4): left column about 58 percent, split into the card area (top) and the pattern
  dashboard (bottom, weighted by the pattern count); right column split one third (ball console) and two thirds (chat) with CSS grid `fr` units and
  `min-height: 0`.
- **Card fit**: a card is 6 rows (header plus 5) by 5 columns. Cells are rectangular when height-limited (width at least 40 px, height at least about 28 px,
  aspect at most 1.5), and a **short landscape** mode (phones on their side) puts the cards full height on the left with the compact console and dashboard on
  the right and the chat as a drawer. For `n` cards in a `W x H` region the planner tries **stack** (n rows), **row** (n
  columns, for two cards on wide regions) and **tabs**; it takes the largest cell that is at least 40 px (FR-035) and falls back to tabs, or takes tabs when their cell is at least 1.5 times taller, where one
  card fills the region and a tab strip names "Card 1 of 3". The selected card has a gold outline and its tab is gold. Cell text scales with the cell.
- **Pattern dashboard**: at most nine tiles, so one density: each tile is a mini 5 by 5 SVG picture, the name and the badge. The planner picks columns
  from the measured width; the BINGO! button sits at the end of the dashboard header on wide screens and as a full-width bar on narrow ones. If a very
  small screen cannot fit all tiles at the 40 px tap size, the tile grid (not the page) scrolls.
- **Ball console**: ball diameter from the region height, "Called n of 75", and a history grid of the newest-first chips that fit plus a "View all"
  chip opening the full 5 by 15 board as an overlay (every called ball reachable, FR-021).
- **Narrow or portrait**: one column (compact ball row, cards, dashboard) with chat in a drawer opened from a header button that shows an unread pill while closed (FR-032); the button replaced a bottom bar that kept a permanent 44 px strip (SC-011).
- **Host**: the left top shows the master board; a playing host gets a `Board | My Cards` switch. The master board is five B-I-N-G-O columns of 15
  numbers (FR-022). On a short, wide region where 15 rows would make numbers smaller than 11 px, the same board is drawn rotated (five rows of 15) so it
  stays legible; this keeps the data identical and is listed under the decisions needing review in the plan.

**Rationale**: Constitution Principle II and FR-033 to FR-036: use all available space, no fixed sizes, no page scroll.

**Alternatives**: Fixed breakpoints with fixed sizes (rejected: wasted space on tablets and large monitors).

## R10. Chat

**Decision**: Reuse the platform `ChatPanel` and the room store's `unread` and `drawerOpen`. `BingoChat` renders the panel as a fixed region in the
landscape right column (no minimize control; out of scope per the spec) and as a collapsible drawer on narrow screens, where closed state shows an
unread pill and calls `setDrawerOpen(open)` so the platform counts unread typed messages. Half-typed text survives because the panel stays mounted
(hidden with CSS) while the drawer is closed.

**Rationale**: Principle IV: no parallel chat. Housie's `ChatDock` carries minimize state in storage that Bingo does not want; a small wrapper is cheaper
than parameterizing it.

## R11. Sound and motion

**Decision**: Reuse the existing synthesized `sfx` sounds (`ballRoll`, `stamp`, `winChime`, `error`) and the mute toggle; no new audio. Reduced motion
replaces the ball roll with a 150 ms fade, the dauber stamp with an instant translucent dauber and the claim celebration with a 1 s gold outline on the
affected tiles (FR-038).

## R12. Development-only verification controls

**Decision**: Following Ludo and Housie (Principle III), read only outside production and ignored with a startup warning when
`NODE_ENV=production`:

| Variable | Effect |
|----------|--------|
| `BINGO_DEV_DECK=first-card` | The call order starts with the numbers of the first seated card holder's first card (top row, then the rest row by row, skipping FREE), so a Single Line after 5 draws and a Blackout after 24 are reproducible. |
| `BINGO_DEV_BALLS=54,7,19` | The call order starts with these numbers. |
| `BINGO_DEV_CARD_AUDIT=500` | Generates 500 cards at start-up and logs how many passed `validateBingoCard` and that all keys were unique (SC-002 evidence). |
| `BINGO_CLAIM_PACE_MS` | Replaces the 2000 ms claim pace for quick manual checks. |

No client message can choose a ball or a card (the action schema has no such field), which preserves server authority (Principle V).

## R13. Restart, deployment and sizing on Render

**Decision**: Lobbies and matches are in memory like rooms; on a restart clients get the existing "room ended / reconnect" flow. `render.yaml` is
unchanged: the one new variable, `BINGO_MAX_PLAYERS`, is optional with a safe default, and the existing `MAX_SOCKETS` guard covers large rooms. Sizing for a
200-person room with 3 cards each: 600 cards of 24 numbers plus masks, well under 1 MB; each ball is one event under 100 bytes to 200 sockets; each
claim is one event. Chat stays rate limited per socket by the platform.

## R14. Verification approach

**Decision**: Direct browser play with the development controls above, recorded in `verification.md` (scenario, expected, observed, screenshots), with
scripted guests (Node Socket.IO clients, as used for Ludo and Housie) to fill large rooms, race claims and measure message sizes. Layout is inspected at
phone, tablet and desktop sizes in both orientations. No new automated suites; the existing `npm run smoke` and a quick Housie lobby and match pass are
re-run once as a regression check for the shared changes.

## R15. Small shared-code decisions

**Decision**: `shared/src/index.ts` re-exports with `export *`, so Bingo names that would collide with Housie's are prefixed (`BINGO_PATTERNS`,
`getBingoPattern`, `BingoPattern`, `evaluateBingoPattern`, `BingoView`, `BingoEvent`, `BingoAction`, `BingoLobby`, `BingoCard`). Game-neutral items that
already exist are reused as they are: `PlayerRef`, `CallerState`, `AUTO_INTERVALS_MS`, `CLAIM_PACE_MS`, `BOGUS_STREAK_LIMIT`, `CLAIM_LOCK_MS`,
`BALL_ROLL_MS`, `MARK_FLUSH_MS`, `MARK_BATCH_MAX`. The client `useRegionSize` hook moves unchanged from `games/housie/useFit.ts` into
`state/viewport.ts` and Housie re-exports it, so Bingo does not import that hook from another game's folder. The one cross-game import is `LobbyDialog` in
`client/src/games/ludo/MatchDialogs.tsx`, which Housie already uses; moving it to a platform folder is a later clean-up.

**Rationale**: Avoids duplicating neutral code and avoids a risky Housie refactor; the one move is a verbatim relocation.
