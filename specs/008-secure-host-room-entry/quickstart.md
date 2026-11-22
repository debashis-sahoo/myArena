# Quickstart: Verify Host Entry, Room Codes, and Visual Energy

This is a focused run-and-check guide, not a replacement for the existing smoke script. During implementation, record each scenario as **expected result / observed result**, with responsive screenshots in `specs/008-secure-host-room-entry/evidence/`.

## Prerequisites

- Node.js 22
- Two browser profiles or isolated windows
- Modern Chromium or Firefox
- Phone/tablet device emulation
- Existing dependencies restored

```powershell
npm install
npm run build
```

Start the service:

```powershell
$env:PORT='10000'
$env:LOG_LEVEL='warn'
npm start
```

Open:

- Player Hub: `http://localhost:10000/`
- Host Hub: `http://localhost:10000/host`

Also verify the clean development checkout path without first building `client/dist`:

```powershell
npm run dev
```

Open `http://localhost:5173/host`. Vite MUST relay its own transformed development index and HMR through the exact `/host` proxy while Express supplies the host capability cookie. It MUST NOT return "Client bundle not built" or serve Express `client/dist` HTML/assets.

## V1. Host capability and route split

1. Open `/` in a fresh private browser.
2. **Expect**: the player identity is visible; the room-code form is the primary action; no game launches or links to `/host`.
3. Inspect the socket action from developer tools or a small Socket.IO client and send `room:create` without first visiting `/host`.
4. **Expect**: `HOST_ENTRY_REQUIRED`; no room appears.
5. Navigate directly to `/host` in the same browser.
6. **Expect**: Express handles the host route, sets an HttpOnly capability cookie that page JavaScript cannot read, and the browser receives Vite's own development index or the production SPA according to environment. No public capability endpoint is called.
7. Create an online room.
8. **Expect**: the acknowledgement marks the creator as the room host and provides a six-character code.

## V2. Six-character room code

1. Create two online rooms and capture their codes.
2. **Expect**: each matches exactly six characters from `23456789ABCDEFGHJKMNPQRSTUVWXYZ`; the values are different.
3. Copy one code to a lower-case form surrounded by spaces and with one optional dash.
4. **Expect**: the normalized join resolves the same room.
5. Enter a code with 5 or 7 characters or a prohibited character.
6. **Expect**: no room is joined; the player Hub displays a corrective field-level error and retains the value.

## V3. Player Hub joins by code

1. In a second browser, open the player Hub and enter the host's code.
2. **Expect**: submit immediately joins the intended game without asking the player to select the game.
3. **Expect**: the authoritative `JoinedData.room.gameId` determines navigation to `/room/{gameId}/{roomCode}`.
4. On the host screen, verify the player appears within 2 seconds.
5. Verify the joining player has no host controls and no host badge.

## V4. Shared URL remains a player join

1. Copy the host's invite URL.
2. Open it in a fresh browser without ever visiting `/host`.
3. Confirm a guest name and avatar.
4. **Expect**: join succeeds, the room code matches, and host controls are absent.
5. Confirm that direct `room:start`, `room:kick`, capacity, and fill/reset actions return `NOT_HOST` even if the client forges UI state.

## V5. Host eligibility and departure

1. Keep one ordinary player in an online room and remove the creator or let the host leave.
2. **Expect**: the player is not promoted.
3. **Expect**: every remaining participant receives `host_left`, is returned to a clear ended-room screen, and the code no longer joins.
4. Test route switching and handover by having another browser visit `/host`, then use its player flow or invite to join the room before the creator leaves.
5. **Expect**: the fresh joiner remains host-ineligible despite the creation cookie, the creator can resume within the reconnect window, and the room closes with `host_left` after the creator is released.

## V6. Invalid and unavailable room codes

From the player Hub, test:

- No room with that code
- Full room
- Match already started
- Recently removed guest within cooldown
- Closed host-left room
- Temporarily busy or rate-limited requests

**Expect**: each failure keeps the player on the Hub, leaves the room field editable, and returns a specific recoverable message.

## V7. Invite code and URL

In each supported game lobby or invite-bearing view:

1. Verify the six-character code is prominent and readable aloud.
2. Use “Copy code.”
3. Use “Copy invite link.”
4. **Expect**: copied content is correct, feedback appears promptly, and manual selection fallback remains available if clipboard permission is denied.
5. Verify the code and URL join the same room.
6. Repeat during active Ludo and UNO custom match screens and confirm each provides separate code-copy and URL-copy actions.

## V8. Host/player atmosphere

At the sizes in [landing-game-visuals.md](contracts/landing-game-visuals.md):

1. Capture `/host` and `/`.
2. **Expect**: distinct role identity and a visible next action, with the Hub using energetic saturated accents, depth, and readable foreground content.
3. Enter Ludo, Housie, Bingo, and UNO.
4. **Expect**: the shared atmosphere matches each game's accent; active turns, dice, cards, balls, moves, results, controls, and chat remain clear.
5. Rotate or resize.
6. **Expect**: re-fit without page reload, horizontal scrolling, clipping, hidden controls, or large unused areas.

## V9. Reduced motion, keyboard, and touch

1. Enable `prefers-reduced-motion`.
2. Reload host, player, and every game screen.
3. **Expect**: decorative movement stops, but host/player state, room code, turn, dice result, token position, and result remain explicit.
4. Traverse both Hubs by keyboard.
5. **Expect**: visible focus, Enter submission, and a logical profile/code/game order.
6. Use touch targets for join and copy actions at 320 px width.
7. **Expect**: controls remain operable without overlap.

## V10. Two-client and reconnect smoke

Run the updated script:

```powershell
npm run smoke
```

Required additions:

- No capability: room creation rejected
- `/host` capability: room creation accepted
- Ordinary player cannot call host actions
- Code-only join resolves `gameId`
- Six-character collision/format checks
- Host not handed to an ordinary player
- Fresh join remains host-ineligible even with a `/host` cookie
- Reconnect preserves an existing host seat

## V11. Render

Deploy the branch to Render, then repeat:

1. Opening `/host` over HTTPS receives the Secure HttpOnly capability from the server-handled route.
2. Host creates a room and receives a six-character code.
3. A separate device joins by code.
4. A separate device joins by invite URL.
5. WebSocket connectivity and reconnect remain functional.
6. Restart the service: active rooms explicitly end and the old capability no longer creates rooms.
7. Reopen `/host`: creation works with a newly issued capability.

Local success is not reported as Render verification. If Render is unavailable, record V11 as pending.
