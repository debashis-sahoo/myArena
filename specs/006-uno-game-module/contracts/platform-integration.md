# Contract: Platform Integration for UNO

UNO uses the Platform Core's rooms, invites, presence, host role, reconnect window, lobby, quiet chat and per-person event channel without reimplementing them. It needs four small
additions that benefit any game, so they are added **to the platform, switched on per game** (constitution Principle IV). Games that do not opt in behave exactly as before.

## What UNO reuses unchanged

| Platform capability | How UNO uses it |
|---------------------|-----------------|
| Room, seats, invites (`/room/uno/{roomId}`), join gate, presence, host handover, 60 s reconnect | As for Ludo (fixed seats, `roster` off) |
| Platform Lobby screen (`Lobby`, `InviteBar`, `PlayerList`, `HostControls`, chat panel or drawer) | The online lobby is the platform's; UNO registers no lobby screen |
| `room:setCapacity` (stepper 2 to 5), `room:kick`, `room:start`, `room:leave` | Unchanged |
| `GameEngine` contract (`createMatch`, `getView`, `onAction`, `onSeatReleased`, `dispose`) | `onBotTurn` is a no-op (the engine schedules bots itself, like Ludo) |
| `GameContext` (`schedule`, `emitTo`, `hostId`, `releaseSeat`, `now`, `log`) | Per-viewer events use `emitTo`; `emit`, `say` and `notice` are not used |
| `quietChat` | `quietChat: true`; the platform writes no automatic chat line while a match runs |
| `JoinedData.game` | The receiver's `UnoView` in create, join and resume acknowledgements |
| Client `GameFeed` (`registerGameFeed`) and `getMatchScreen` | `unoStore` registers a feed; `UnoScreen` is registered as the match screen |

## Changes to shared code

### `shared/src/games.ts`

```ts
export interface GameDefinition {
  // existing fields...
  /** Platform capabilities a game opts into (specs/006-uno-game-module/contracts/platform-integration.md). */
  launch?: {
    /** "Play Online" asks for the room capacity before creating the room. */
    askCapacity?: boolean;
    /** "Play with AI" starts the match as soon as the room exists (no lobby step). */
    startAiAtOnce?: boolean;
    /** The host's lobby shows "Fill empty slots with AI", which seats bots and starts the match. */
    hostFillWithAi?: boolean;
  };
}
```

New entry (see data-model section 10): `id: 'uno'`, 2 to 5 players, default capacity 4, AI supported, `quietChat`, `launch: { askCapacity: true, startAiAtOnce: true, hostFillWithAi: true }`.

### `shared/src/protocol.ts`

```ts
EVENTS.ROOM_FILL_AI = 'room:fillAi';            // client -> server, ack { room }
interface CreateRoomPayload { /* existing */ capacity?: number }   // online rooms only; ignored for AI rooms
```

## Changes to the server

### `sockets/schemas.ts`

- `createRoomSchema`: `botCount` maximum 3 to 4 (the store still limits each game to `1..maxPlayers - 1`, so Ludo keeps its limit of 3); new `capacity: z.number().int().min(2).max(500).optional()`.
- `gameActionSchema` gains six members, all `.strict()`:
  `playCard { card: int 0..107, color?: enum(red, yellow, green, blue) }`, `drawCard`, `keepCard`, `callUno`, `catchPlayer { player: string 1..40 }`, `playAgain`.

### `rooms/roomStore.ts` `create(gameId, mode, botCount, capacity, guest, socketId)`

- Online rooms: `capacity` defaults to `game.defaultCapacity`; when given it must be an integer between the game's minimum and the room's maximum (the same range `room:setCapacity` enforces),
  otherwise `INVALID_PAYLOAD` "Choose between 2 and 5 players." (the message is built from the game's limits).
- AI rooms: unchanged (`bots = botCount ?? maxPlayers - 1`, validated `1..maxPlayers - 1`, `capacity = bots + 1`).
- After `seedCreator`, when `mode === 'ai'` and `game.launch?.startAiAtOnce`, call `room.startNow()` so the room is `in_progress` and the create acknowledgement carries the snapshot.

### `rooms/room.ts`

```ts
/** Starts the match without a host check (used by the store for AI rooms and by fillWithBots). */
startNow(): void              // the body of start() after requireHost, lobby state and minimum-player checks

/** Host only: seats a bot in every empty seat of an online lobby, then starts. */
fillWithBots(socketId: string): number     // returns the number of bots added
```

`start(socketId)` keeps its checks and then calls `startNow()`. `fillWithBots` refuses (`RoomError`) with: `NOT_HOST` "Only the host can do that."; `INVALID_STATE` "Bots can only be added in an online
lobby." (wrong mode or state); `INVALID_STATE` "This game cannot fill seats with AI." (no `hostFillWithAi`); `INVALID_STATE` "There are no empty slots to fill." Bot names continue the
existing list (`Zippy, Blaze, Nova, Turbo`) from the number of bots already seated and stay unique among all names; bots use the robot avatar. One lobby line "The host filled N empty slots with AI"
is posted before the start (lobby lines stop once the match begins, as for every quiet-chat game).

### `sockets/registerHandlers.ts`

- `ROOM_CREATE` passes `p.capacity` to the store.
- New handler `ROOM_FILL_AI` (empty payload): `room.fillWithBots(socket.id)`, log "room filled with AI", acknowledge `{ room: room.projection() }`.

### `games/registry.ts`

`['uno', createUnoEngine()]` joins the engine map. `createUnoEngine()` warns once at start-up in production if any `UNO_DEV_*` variable is set (they are ignored).

### `server/scripts/smoke.ts`

One added assertion: create an UNO AI room; expect the acknowledgement to show `state: 'in_progress'`, `JoinedData.game.you.hand` with 7 ids, `table.players` of the requested size, and no other
hand anywhere in the payload.

## Changes to the client

| File | Change |
|------|--------|
| `state/roomStore.ts` | `createRoom(gameId, mode, botCount?, capacity?)` sends `capacity` for online rooms; new `fillWithAi()` emits `room:fillAi` and applies the returned room like `startMatch` |
| `components/launch/LaunchModal.tsx` | Steps `choose`, `ai`, `capacity`; for a game with `launch.askCapacity`, "Play Online" opens the capacity step before creating; other games create immediately as before |
| `components/launch/CapacityPicker.tsx` (new) | Buttons `minPlayers..maxPlayers` (2 to 5), `defaultCapacity` preselected, Back and "Create room" |
| `components/launch/AiOpponentPicker.tsx` | Preselects `defaultCapacity - 1` (equal to today's behavior for Ludo: 3) and reads "Pick the computer players you want to play against." |
| `components/room/HostControls.tsx` | For an online lobby of a game with `launch.hostFillWithAi` and at least one empty seat, shows "Fill N empty slots with AI"; the first press turns it into "Fill N slots with AI and start now?" with Confirm and Cancel; Confirm calls `fillWithAi()` and shows errors inline like Start |
| `components/hub/GameCard.tsx` | ART map gains `uno: UnoArt` |
| `games/registry.ts` | Imports `./uno/unoStore` (registers the feed); `matchScreens.uno = UnoScreen` |
| `games/uno/*` | New module (plan: Project Structure) |

## Behavior-neutrality for existing games

| Game | Effect of the changes |
|------|-----------------------|
| Ludo | No `launch` flags: "Play Online" still creates at once with the default capacity, "Play with AI" still creates a lobby, `botCount` still limited to 1 to 3, the picker still preselects 3. The opponent picker text changes from "race against" to neutral wording |
| Housie, Bingo | No change: no AI, roster rooms, `capacity` is never sent by their modal (they do not ask) |
| All | The strict action union gains six members that no other engine reads; `room:fillAi` is refused for games that did not opt in |

V12 in [../quickstart.md](../quickstart.md) re-checks Ludo, Housie and Bingo after the change.

## Configuration

No new required environment variables and no change to `render.yaml`. Optional development-only variables (ignored in production): `UNO_DEV_DECK`, `UNO_DEV_BOT_MS`, `UNO_DEV_TURN_MS`,
`UNO_DEV_FORGET`. The existing limits apply unchanged: `MAX_ROOMS`, `MAX_SOCKETS`, the create limiter (burst 5, then 1 per 6 seconds per IP), the action bucket (burst 10, 5 per second).
