# Phase 0 Research: Housie (Tambola) Visual-First Game Module

Each entry: **Decision**, **Rationale**, **Alternatives considered**. There were no open `NEEDS CLARIFICATION` items after the spec
review; the entries below resolve design questions the spec deliberately left open. Facts about the existing code come from the
Platform Core (001) and Ludo (002) modules as built.

## R1. Rendering and effects

**Decision**: Plain DOM and CSS for the whole screen. Tickets are CSS grids of `<button>` cells. The ball is a CSS sphere (layered
radial gradients, a specular highlight element, a blurred ground shadow) revealed with the Web Animations API (roll in from the right
with rotation, settle, glow pulse). The ink cross is an inline SVG X whose two strokes draw with `stroke-dashoffset` plus a 120 ms
"stamp" scale. Pattern pictures are inline SVG generated from data. No canvas, no 3D library, no new dependency.

**Rationale**: Same approach as Ludo (R1 there), keeps the bundle and battery use small on Render's free plan, and DOM buttons give
keyboard, screen-reader and touch behaviour for free (FR-014, FR-036). The few effects the spec allows (ball reveal, ink stamp, claim
celebration) are short transforms and opacity changes that stay at 60 fps on mid-range phones.

**Alternatives**: Canvas or WebGL ball (rejected: more code, no accessibility, battery cost); a CSS framework (rejected: the project uses
plain CSS).

## R2. Ticket generation (server)

**Decision**: Generate each ticket as three rows by nine columns with this procedure, then verify it before use:

1. **Column counts**: every column starts at 1 number (9 so far). Distribute the remaining 6 numbers one at a time to randomly chosen
   columns that still have fewer than 3 (so counts are 1 to 3 per column, total 15).
2. **Row placement**: for each column, choose which rows hold its numbers (1 count: one random row; 2: two random rows; 3: all rows) by
   randomized backtracking so every row ends with exactly 5. The search space is tiny (at most 3^9 branches), so it finishes in
   microseconds; on the rare dead end it restarts.
3. **Numbers**: for each column pick `count` distinct numbers from its range (1 to 9, 10 to 19, ... 70 to 79, 80 to 90) with
   `crypto.randomInt`, sort ascending and place top to bottom.
4. **Uniqueness**: store each ticket's canonical key (the 27-cell grid as a string) in a per-match `Set`; regenerate on a collision.
   With about 10^15 possible tickets a collision never occurs in practice, but the check is free.
5. **Self-check**: a pure `validateTicket(ticket)` (rows of 5, 15 numbers, column ranges, ascending, no repeats) runs on every
   generated ticket; a failure logs and regenerates. This also serves the manual evidence for SC-002 (a development-only
   `HOUSIE_DEV_TICKET_AUDIT` log line reports N tickets checked).

**Rationale**: Meets FR-004 and FR-005 exactly with a small, easily explained algorithm. Row-first generation without the backtracking
step can produce columns with zero numbers or rows with the wrong count; this procedure cannot.

**Alternatives**: Pre-computed ticket tables (rejected: large data, no benefit); strip-based generation of 6 non-overlapping tickets
(rejected: the spec asks only for unique tickets, and strips would tie tickets together).

## R3. Winning-pattern catalogue as data, one evaluator for all 40

**Decision**: `shared/src/housie/patterns.ts` holds the catalogue in the order of the spec appendix. Each pattern has an `id`, `name`,
`group`, a one-line `description`, an `illustration` (the cells highlighted on the sample ticket) and one `rule` of four kinds:

| Rule kind | Used by | Evaluation on a chosen ticket |
|-----------|---------|-------------------------------|
| `cells` | Lines (6, all but Any Line) and Shapes (20), 26 in all | A list of `(row, position)` pairs (position 1 to 5 in the row). Satisfied when every listed cell is *satisfied*. |
| `rows` | Any Line | Satisfied when at least one whole row (its 5 cells) is satisfied. |
| `count` | Early Five/Seven/Ten/Twelve, Five Odds/Evens, Young Five, Old Five, Young and Old, Almost House | At least N satisfied cells, optionally filtered (odd, even, 1 to 45, 46 to 90; Young and Old needs two filters). Almost House: 14. |
| `full` | Full House 1st/2nd/3rd | All 15 cells satisfied, with an `order` (1, 2, 3). |

A cell is **satisfied** when its number has been called (in the server's call list at the moment the claim is received) **and** the
claimant has crossed it (FR-023). The evaluator is a pure function used by the server; the client imports only the catalogue and
illustrations (to draw pictures), never to decide a claim.

Illustration cells for `count`/`rows` patterns are a representative selection (for example five scattered cells for Early Five, the middle
row for Any Line) with a caption that says "any 5 numbers".

**Full House ordering rule** (resolves spec FR-011 detail): "2nd" can be claimed only after "1st" is claimed, and "3rd" only after "2nd";
until then the tile shows its pattern name and a disabled `CLAIM` with the hint "after 1st". A ticket that has already won a Full House
cannot win another, so each Full House is awarded to a different ticket.

**Rationale**: One data-driven catalogue keeps the 40 patterns consistent between chooser, tiles, popover and validation, and makes
adding a pattern a data change (FR-009, FR-022a).

**Alternatives**: 40 hand-written validator functions (rejected: duplication and drift from the pictures).

## R4. Marks (ink crosses) and claim authority

**Decision**: The server stores each player's crosses per ticket as a 27-bit mask (bit `row*9+col`). Clients keep marks optimistically and
send them as small batched intents; the server accepts a mark only for a cell that holds a number on a ticket the sender owns, and
never infers or adds marks. The client coalesces taps for about 200 ms into one `marks` action (up to 30 changes) and always flushes
pending marks immediately before sending a `claim`, so the server has the up-to-date marks first (socket messages are ordered). On
reconnect the snapshot restores the marks from the server (FR-015, FR-040).

**Rationale**: FR-023 requires the server to check crosses, so marks must reach it; batching stays inside the existing per-socket
rate limit (burst 10, 5 per second) even when a player taps quickly, and costs a few bytes per player.

**Alternatives**: Send marks only with each claim (rejected: reconnect and multi-tab would lose them and a claim payload would carry
up to 60 numbers); one message per tap (rejected: trips the rate limit when tapping fast).

## R5. Ball drawing and the caller

**Decision**: At match start the server builds the call order with a Fisher-Yates shuffle of 1 to 90 using `crypto.randomInt` and keeps
it private; each draw reveals the next entry, so no number repeats and the sequence is decided server-side only (FR-018). Auto calling
is a chain of `ctx.schedule` timers at 5000, 8000 or 10000 ms; pause cancels the pending timer and resume schedules a new one;
changing the interval reschedules from the moment of the change. Draw Next Ball while auto is running is allowed and restarts the timer
(so the next ball is never sooner than one interval after any draw). The timers belong to the match and keep running when the host's
connection drops (FR edge case), and a host handover leaves the chain untouched; the new host simply gets the caller controls because the
engine authorises callers through `ctx.hostId()` at action time.

**Rationale**: Reuses the platform's match timer ownership (cleared on room close), keeps one authority, and satisfies SC-006 (draw
within 0.5 s of the interval) because the timer is the only scheduler.

**Alternatives**: Draw each ball with `randomInt` over the remaining numbers (equivalent, but a precomputed order makes the dev deck
control in R15 simple).

## R6. Platform extension: game lobby (setup before start)

**Decision**: The platform gets a small, game-agnostic *lobby channel* so a game can keep host settings and per-player choices before
the match, without a second room mechanism:

- `GameEngine` gains optional `createLobby`, `lobbyView`, `onLobbyAction`, `onLobbyLeave`, and `validateStart`; `createMatch` receives
  the lobby as a third argument.
- `RoomState` gains `gameLobby?: unknown` (the engine's public lobby view). Because it is part of `room:state`, every client sees host
  settings and every player's ticket choice (FR-003) with the existing broadcast and `rev` ordering, and reconnecting clients get it
  for free.
- `game:action` is accepted in the lobby when the engine defines `onLobbyAction`; the platform passes `{ playerId, isHost }`.
- `Room.start` asks `validateStart` first (Housie: at least one pattern, at least one other person seated), then builds the match.
- A new host-only `room:reset` event (`Room.resetToLobby`) ends the match, disposes it, and returns everyone to the lobby with seats
  intact (spec User Story 8, scenario 4). The lobby is created again with default settings (the room's capacity is kept).

**Rationale**: Principle IV: shared room capabilities belong to the platform; this is also what the next games (Bingo) need. The lobby
channel is small (two optional engine methods plus one projection field).

**Alternatives**: A Housie-only setup route (rejected: duplicates room state and breaks reconnect); sending settings through chat
(rejected: not authoritative).

## R7. Platform extension: large rooms (up to 200)

**Decision**: Four game-agnostic changes, all driven by flags on `GameDefinition`:

1. **Roster seating** (`roster: true`): seats are created on demand (up to `capacity`) and removed on leave, so `room:state` lists only
   people actually present. Colour tags come from a 12-colour palette by join order, so no seat colour list is needed. Existing games
   (fixed seats) are untouched.
2. **Configurable ceiling**: `maxPlayers` for Housie is 200 and read at runtime from `HOUSIE_MAX_PLAYERS` (optional, default 200,
   clamped 2 to 500), so the limit can change later without code changes (user request). The room projection already sends
   `maxPlayers`, so the client follows it.
3. **Coalesced state broadcasts**: for rooms with capacity above 12, `room:state` is emitted at most every 250 ms (trailing edge)
   instead of on every change, so 200 people joining does not produce 200 x 200 messages. `rev` still increases on every change and
   the latest state always goes out. Small rooms keep immediate broadcasts.
4. **Server-wide connection guard**: a new optional `MAX_SOCKETS` (default 1500) makes `room:create` and a join for a *new* seat answer
   `SERVER_BUSY` when exceeded, protecting the free plan's 512 MB when several big rooms run at once. A guest who already holds a seat can
   always resume (reconnecting players must receive their snapshot). The existing `MAX_ROOMS` (100)
   stays.

The host's capacity stepper (plus and minus) is replaced for roster games by a number field with quick presets (10, 25, 50, 100,
200), because stepping to 200 by one is unusable.

**Rationale**: Without these, a 200-person room would send every seat (colour, avatar, presence) to every socket on every join. With
them, state size is proportional to people present and bursts are coalesced. Measured sizes are checked during verification (G11).

**Alternatives**: Paging the roster in the client only (rejected: the server still broadcasts everything); a separate "big room"
transport (rejected: unnecessary at this scale).

## R8. Platform extension: quiet chat and accepted-win notices

**Decision**: `GameDefinition.quietChat: true` makes the room skip *all* automatic system chat lines **while a match is in progress** (joined,
left, disconnected, reconnected, host changed, capacity changed, match started, seat released); in the lobby the platform's usual join and leave
lines stay (owner decision, clarification 5). Presence remains visible in the player list and the
platform's connection banner. The context gains `notice(text)`, which posts one system chat line (new `SystemCode` `game_notice`,
sanitised, rate-limited) and is the only way Housie writes to chat: the line "[name] won [pattern]" after an accepted claim (FR-029).
Bogus claims and everything else never touch chat.

**Rationale**: Spec FR-029 and User Story 6 require typed messages plus accepted-win lines only; the platform currently always
announces joins and leaves, so this needs a platform switch rather than client-side hiding (clients must not receive the lines at all,
which also keeps unread counts correct).

**Alternatives**: Filter system lines in the Housie chat component (rejected: the unread counter and history would still include them,
and the chat history in join acks would carry the noise).

## R9. Private events and per-player snapshots

**Decision**: `GameContext` gains `emitTo(playerId, event)` (delivers one `game:event` to that player's current socket, if any) and
`hostId()`. Public facts (ball called, combination claimed, auto settings, finished) use `emit`; private facts (your snapshot at match
start, "Bogus Claim", "just claimed") use `emitTo`. The join, create and resume acknowledgements already carry `game: getView(match,
playerId)`, so a reconnecting player gets their own tickets and marks, and never anyone else's. The platform emits the initial
per-player snapshot because `createMatch` is called with a context whose `emitTo` is already live.

**Rationale**: Tickets and marks are per player (FR-015, FR-023); broadcasting every player's tickets to 200 sockets would be wasteful
and leak private data (marks must stay private).

**Alternatives**: Broadcast all tickets (rejected: privacy and size); poll via `game:state` (rejected: the reserved event stays for later).

## R10. Client state architecture

**Decision**: The room store's game slice is currently typed for Ludo. For Housie the slice becomes game-agnostic by one small
change: `JoinedData.game` and `game:event` payloads are `unknown` at the platform layer, and the client registry maps a game id to an
optional **feed** `{ reset(), onSnapshot(view), onEvent(event) }`. Housie registers a feed backed by its own external store
(`useSyncExternalStore`) in `client/src/games/housie/housieStore.ts`. The Ludo slice and `LudoScreen` are left as they are, behind the
same registry dispatch (no Ludo behaviour change); folding Ludo into the feed is a later clean-up, not part of this feature.

**Rationale**: Keeps the platform free of Housie types (Principle IV), avoids a risky Ludo refactor, and keeps Housie's local state
(marks being batched, selected ticket, popover) in the game module.

**Alternatives**: Add a second typed slice to the room store (rejected: grows the platform's knowledge of each game); rewrite Ludo's
store now (rejected: unrelated risk).

## R11. Layout: filling the screen with tickets, tiles, ball and chat

**Decision**: A measured layout like Ludo's board fit, using one `ResizeObserver` per region (`useFit`):

- **Landscape** (two columns, left about 58 percent): left column top = tickets, bottom = combination tiles; right column top third =
  ball console, bottom two thirds = chat. Column ratio and the one-third/two-thirds split use CSS grid `fr` units with
  `min-height: 0` so nothing forces page scroll.
- **Ticket area**: the area's width and height give the cell size `min(width / (9 + padding), height / (3 * n + padding))` for a
  stacked layout of `n` tickets. The planner picks, in order: stack all tickets if every cell is at least 32 px; else a 2 x 2 grid for
  3 to 4 tickets if every cell is at least 32 px; else tabs (one ticket large, tab strip above). Cell text scales with the cell.
- **Tiles**: density tiers by count of chosen combinations: up to 9 large tiles (name, button), up to 18 medium (name, short button),
  up to 40 compact chips (name abbreviation, button; the full name is in the popover and a tooltip). Columns are chosen from the
  measured width so the whole set fits without page scroll. If a very small screen still cannot fit all tiles at 44 px tap height, the
  tile grid (not the page) scrolls.
- **Ball console**: ball diameter from the region height; the mini-grid shows the newest-first chips that fit, with a "View all"
  button that opens the 1 to 90 board overlay for players on demand (FR-020: all called numbers reachable). The count "Called n of 90"
  is always visible.
- **Portrait/narrow**: one column: ball console (compact row), tickets, tiles; chat is the same minimize-able dock reused as a peek
  drawer. Every region sized by the same measured fit.
- **Host**: left column shows the master board (10 x 9 fit by measurement) over the tiles; a playing host gets a segmented
  `Board | My Tickets` switch that swaps the master board for the ticket area; the caller console replaces the ball console but keeps
  the current ball and recent chips.

**Rationale**: Constitution Principle II and spec FR-033, FR-034, FR-034a: use all available space, never a fixed size, no page scroll.
The mockups in `mockups/` fix the visual proportions.

**Alternatives**: Fixed breakpoints with fixed sizes (rejected: leaves unused space on tablets and large monitors).

## R12. Chat minimize with unread

**Decision**: Reuse the platform chat (`ChatPanel`) and the room store's `unread` and `drawerOpen` fields. The Housie screen owns a
`ChatDock` wrapper with open/minimized state in `localStorage` (`myarena.housie.chat`), which calls `setDrawerOpen(open)` so the
platform counts unread typed messages while minimized (FR-030). Half-typed text survives because the panel stays mounted (hidden with
CSS) while minimized. In portrait the same wrapper is the peek drawer.

**Rationale**: Principle IV: no parallel chat. Ludo's dock already proved this pattern.

## R13. Pattern illustration popover

**Decision**: A `PatternPicture` SVG component draws a 3 x 9 sample ticket using a fixed illustrative layout (number slots by row:
columns 1, 2, 4, 6, 8 / 2, 3, 5, 7, 9 / 1, 3, 4, 6, 9) and highlights the pattern's illustration cells; it is used in the host's chooser
(small) and in the popover (large) so they always match. The popover opens from a tile (click, tap, Enter or Space outside the CLAIM
button), anchors to the tile, flips to stay on screen, becomes a bottom sheet on narrow screens, and closes on outside tap, Escape or
its close control. It reads no player state, so it can never hint at progress (FR-022a).

**Rationale**: One component, no raster assets, tiny bundle cost, consistent with the mockup.

## R14. Sound and motion

**Decision**: Reuse the existing Web Audio `sfx` module with three new short synthesized sounds (ball roll and settle, ink stamp, claim
chime), all respecting the existing mute and reduced-motion handling. Reduced motion replaces the ball roll with a 150 ms fade, the
stamp with an instant cross, and the celebration with a 1 s gold outline on the tile (FR-036).

## R15. Development-only verification controls

**Decision**: Following Ludo's pattern and Principle III, read only outside production (ignored when `NODE_ENV=production`):

| Variable | Effect |
|----------|--------|
| `HOUSIE_DEV_DECK=first-ticket` | The call order starts with the numbers of the first seated player's first ticket (top row, then middle, then bottom), then the rest shuffled, so valid claims (Top Line after 5 draws, Full House after 15) are reproducible. |
| `HOUSIE_DEV_BALLS=12,7,...` | The call order starts with these numbers. |
| `HOUSIE_DEV_TICKET_AUDIT=500` | Generates 500 tickets at start-up and logs how many passed `validateTicket` and that all keys were unique (SC-002 evidence). |
| `HOUSIE_CLAIM_PACE_MS` | Overrides the 2000 ms claim pace for quick manual checks. |

No client message can choose a ball or a ticket (the action schema has no such field), preserving server authority (Principle V).

## R16. Restart, deployment and sizing on Render

**Decision**: Matches and lobbies are in memory like rooms; on a restart clients get the existing "room ended / reconnect" flow
(Principle: runtime recovery documented). `render.yaml` is unchanged: the new variables (`HOUSIE_MAX_PLAYERS`, `MAX_SOCKETS`) are
optional with safe defaults. Rough sizing for a 200-player room with 4 tickets each: about 800 tickets x 15 numbers plus masks, well
under 1 MB; per ball one event of under 100 bytes to 200 sockets; per claim one event plus one chat line. Chat remains rate limited
per socket by the platform.

## R17. Verification approach

**Decision**: Direct browser play with the development controls above, recorded in `verification.md`, with scripted extra guests
(Node Socket.IO clients, as used for Ludo) to fill big rooms (50 and 200 joins), generate claim races and bogus claims, and measure
`room:state` sizes. Layout is inspected at phone, tablet and desktop sizes in both orientations with screenshots. No new automated test
suites (constitution Principle III); the existing `npm run smoke` is re-run as a regression check for the platform changes.
