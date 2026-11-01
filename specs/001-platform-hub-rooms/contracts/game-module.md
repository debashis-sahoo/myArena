# Contract: Platform-to-Game Module Interface

Constitution Principle IV requires an explicit contract between the platform (rooms, presence, invites, host controls,
chat) and each game (board view, rules engine, turn transitions, AI behaviour). This feature ships the contract and a
**placeholder game module**; the Ludo board and rules arrive in a later feature.

The platform owns everything in [realtime-events.md](realtime-events.md). A game module **must not** open its own sockets,
rooms, presence, invites, host controls, or chat (FR-023).

## Registration

A game is described once in the shared registry (`GameDefinition`, see [data-model.md](../data-model.md)) and registers two
halves: a server engine and a client board view. Adding a game means adding one registry entry and its two halves; no
platform code changes (FR-023, spec assumption on future games).

## Server half: `GameEngine`

The engine is the only authority for rules, dice, turns, and winners (Principle V). The platform calls it; it never talks
to sockets.

| Hook | Called when | Notes |
|------|-------------|-------|
| `createMatch(seats)` | Host starts the match | Receives the seated participants (humans and bots) and returns initial game state |
| `getView(match, playerId)` | Any state projection | Returns what that player may see |
| `onAction(match, playerId, action)` | `game:action` arrives (reserved event, see below) | Validates turn ownership and move legality, returns the new state or a rejection reason |
| `onSeatReleased(match, playerId)` | A seat is released during a match (FR-018) | The game decides how its rules treat the vacated seat |
| `onBotTurn(match, botPlayerId)` | A bot is due to act | Bot decisions pass through the same validation as `onAction` |
| `dispose(match)` | Room closes | Cleanup |

The **placeholder engine** shipped now implements `createMatch` (returns a "placeholder" state with the seat list),
`getView`, `onSeatReleased` (no-op), and ignores actions. It exists so "start match" and "Play with AI" reach a real
in-progress room state (spec assumption: gameplay is a separate feature).

## Reserved real-time events for games

Not used by this feature, but reserved so games do not invent their own channels:

| Event | Direction | Purpose |
|-------|-----------|---------|
| `game:action` | client to server | A player's intent (never an outcome) |
| `game:state` | server to client | Per-player projection from `getView` |

## Client half: `GameBoard` component

The room shell mounts the game's board directly inside the game stage area (Principle IV). The platform passes:

| Prop | Description |
|------|-------------|
| `room` | Current `RoomState` (read-only) |
| `you` | `{ playerId, color, isHost }` |
| `matchState` | `lobby` or `in_progress` |
| `stageSize` | Largest available square the stage can occupy, in CSS pixels, updated on resize and rotation (spec FR-033) |
| `send(action)` | Sends a `game:action` intent |
| `reducedMotion` | User's reduced-motion preference |

Rules for board views:

- Render within `stageSize` and never overflow it; scale with the stage rather than using fixed dimensions.
- Treat all state as read-only and server-owned; animate dice and token movement as responses to server events, never as the
  source of outcomes (constitution Principle II).
- Provide non-animated feedback when `reducedMotion` is true.
- Do not render chat, player lists, invite links, or host controls; the room shell owns them.

The **placeholder board** shows the game's art, the match state ("Lobby", "Match in progress"), and the seated players.

## What the platform guarantees to games

1. A stable list of seated participants with unique color tags and exactly one host.
2. Presence changes (disconnected, reconnected, released) delivered in order.
3. Reconnecting players receive a fresh state projection before they can act.
4. The room closes (and `dispose` runs) when the last participant is gone.
