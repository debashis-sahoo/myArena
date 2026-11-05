# Contract: Platform Integration for Bingo

Bingo is the third game on the Platform Core and the second to use the lobby channel. It adds **no new platform hook**: everything in
[../../003-housie-tambola-module/contracts/platform-extensions.md](../../003-housie-tambola-module/contracts/platform-extensions.md) (lobby channel, roster
seating, `quietChat`, `emitTo`, `hostId`, `room:reset`, coalesced state broadcasts, the socket guard) is used as it is. This contract lists how Bingo plugs
into those hooks and the small configuration and registration changes it needs. Rationale: [../research.md](../research.md) R6 and R15.

## How Bingo uses the existing hooks

| Hook | Bingo behavior |
|------|----------------|
| `GameEngine.createLobby` / `lobbyView` | Default lobby (ceiling 1, host plays, `single-line`, `four-corners`, `blackout`, manual calling, no choices); the view is plain data with nothing private |
| `onLobbyAction` | Applies `setCeiling` (1 to 3), `setHostPlays`, `setPatterns`, `setCaller`, `setCards`; host-only except `setCards`; returns `{ ok: false, reason }` for anything else ("The match has not started.") |
| `onLobbyLeave` | Drops the leaver's `choices` entry |
| `validateStart` | "Pick at least one pattern." / "Wait for at least one more person." |
| `createMatch(seats, ctx, lobby)` | Issues cards (host only when `hostPlays`), builds the deck, sends each person a private `snapshot`, starts auto calling if chosen |
| `getView` | The receiver's own `BingoView` for join, create and resume acks |
| `onAction` | `draw`, `auto`, `manual`, `pause`, `resume`, `daubs`, `bingo`; caller intents authorize with `ctx.hostId()` at action time |
| `onSeatReleased` | Marks the entry `left`, discards daubs, publishes `playerLeft`, finishes the match when no card holder remains |
| `dispose` | Cancels the auto timer |
| `onBotTurn` | No-op (no bots) |
| `ctx.notice` | **Never called**: Bingo posts no chat line (FR-031) |
| `GameDefinition.quietChat` | `true`: the platform writes no system chat line while the match runs; the lobby keeps the usual join and leave lines |
| `GameDefinition.roster` | `true`: seats on demand, 12-color roster palette by join order |

## Changes by file

### Shared (`shared/src`)

| File | Change |
|------|--------|
| `games.ts` | Bingo entry: `status: 'active'`, `minPlayers: 2`, `maxPlayers: 200`, `defaultCapacity: 10`, `supportsAi: false`, `roster: true`, `quietChat: true` (name, tagline and theme unchanged) |
| `index.ts` | Re-exports `./bingo/*` |
| `bingo/` (new) | `card.ts` (types, helpers, `validateBingoCard`), `patterns.ts` (catalogue), `evaluate.ts` (pure evaluator), `letters.ts` (`ballLetter`, ranges), `types.ts` (lobby, view, events, actions), `timing.ts` (Bingo constants; neutral Housie timing constants reused) |

### Server (`server/src`)

| File | Change |
|------|--------|
| `config.ts` | New optional `bingoMaxPlayers` from `BINGO_MAX_PLAYERS` (default 200, clamped 2 to 500), plus a small `rosterMaxPlayers` lookup (`housie`, `bingo`) |
| `rooms/roomStore.ts` | Roster games read their player ceiling from that lookup instead of `config.housieMaxPlayers`; Housie's value and variable are unchanged |
| `sockets/schemas.ts` | `gameActionSchema` union adds strict members `setCards`, `daubs`, `bingo` |
| `games/registry.ts` | Registers `createBingoEngine()` for id `bingo` |
| `games/bingo/` (new) | `cards.ts` (generation, uniqueness, audit), `deck.ts`, `lobby.ts`, `claims.ts`, `matchOps.ts`, `model.ts`, `engine.ts` |
| `scripts/smoke.ts` | The "unavailable game" assertion uses `snakes-and-ladders` instead of `bingo` (no new assertions) |

### Client (`client/src`)

| File | Change |
|------|--------|
| `games/registry.ts` | Registers `BingoScreen` as the match screen and `BingoLobby` as the lobby screen for `bingo`, and imports `bingoStore` so its feed registers |
| `state/viewport.ts` | Gains `useRegionSize` (moved verbatim from `games/housie/useFit.ts`, which re-exports it) |
| `games/bingo/` (new) | Lobby, match screen, card area, card, pattern dashboard and pictures, ball console, master board, caller console, chat wrapper, results overlay, store, fit planners, animations, stylesheet (see [../plan.md](../plan.md)) |
| Hub, launch modal, room shell, host controls, player list | **No change**: the Hub card follows `status`, the launch modal follows `supportsAi`, and the shell, capacity field with presets and per-person badge slot already depend only on the game definition and registry |

## Environment and deployment

| Variable | Default | Effect |
|----------|---------|--------|
| `BINGO_MAX_PLAYERS` | `200` | Optional. The most people a Bingo room may hold (2 to 500) |
| `BINGO_DEV_DECK`, `BINGO_DEV_BALLS`, `BINGO_DEV_CARD_AUDIT`, `BINGO_CLAIM_PACE_MS` | unset | Development-only verification controls ([../research.md](../research.md) R12); ignored in production with a startup warning |

`render.yaml` is unchanged; no variable is required. `MAX_SOCKETS` and `MAX_ROOMS` keep their meaning. The README gains a Bingo section and the new
variables.

## Compatibility

- Ludo, Housie and the placeholder engine ignore everything added here; their screens, colors and chat lines are unchanged. The only Housie-folder edit
  is `useFit.ts` re-exporting `useRegionSize`.
- `npm run smoke` must still pass after the one-line assertion change.
- The shared action union stays strict: Housie intents remain accepted for Housie rooms, and the Bingo engine answers any non-Bingo intent with
  "Not available during the match." without changing state.
