# Contract: Host, Player, and Game Visuals

## Route ownership

| Route | Surface | Required primary action |
|-------|---------|-------------------------|
| `/host` | Host landing | Select an active game and create an online or AI room |
| `/` | Player landing | Enter a six-character room code and join |
| `/room/{gameId}/{roomId}` | Shared room and game | Continue the existing join, lobby, or match flow |
| Unknown | Player landing fallback | Enter a room code; no host controls |

The host URL is not rendered as a link or call to action anywhere on the player route.

## Host landing

- Displays a persistent “Host” identity near the logo.
- Renders only after the server-handled `/host` route has bootstrapped the host page; room creation still receives its final permission decision from the authoritative server.
- Reuses the active game grid and launch flow.
- Uses a warm, crown-like yellow/pink accent and visible host-control language.
- Keeps the guest profile so the host appears correctly in the room.
- Does not imply that `/host` verifies a personal identity.

## Player landing

- Displays a persistent “Player” identity near the logo.
- Leads with an accessible room-code form before secondary game showcase content.
- Accepts exactly six uppercase alphanumeric characters; lower-case and surrounding formatting normalize to the same value.
- Shows loading, invalid code, room unavailable, full, started, and rate-limited feedback next to the field.
- Retains the entered value after a failed join.
- The game cards remain colorful but do not create rooms; they explain available games or the need for a host code.

## Join-code control

Required behavior:

- Label: “Private room code”
- Input: six-character visual capacity, text keyboard on touch devices, autocomplete disabled, automatic letter capitalization allowed
- Submit: “Join room”
- Live status: announces request progress and failure without stealing focus
- Keyboard: Enter submits; focus is visible
- Error: specific enough to correct the code while remaining safe for unavailable rooms
- Success: applies the `JoinedData` snapshot then navigates to the canonical room URL

## Invite surface

In a lobby or any current invite-bearing game view:

1. Render the room code in a large, readable code treatment.
2. Render the full invite URL in a selectable field.
3. Offer separate “Copy code” and “Copy invite link” actions.
4. Both actions show success or manual-copy fallback.
5. The code and link share the same room identity.
6. The invite UI is not an entry point to `/host`.
7. Custom match screens, including Ludo and UNO, render the shared invite component directly because they bypass the generic room shell.

## Shared high-energy layer

`ArenaAtmosphere`:

- Is mounted once by `App`.
- Derives `host`, `player`, or `room` variant from the route and authoritative room view.
- Derives game accent from the existing shared game definition.
- Renders decorative gradient, glow, and particle content only.
- Is `aria-hidden`, has `pointer-events: none`, and never covers an input, button, board, chat, or status.
- Has static non-motion cues when `prefers-reduced-motion: reduce` is set.
- Does not receive a dice result, card, token, winner, room role, or game action from a client-side prediction.

## Existing game screens

Ludo, Housie, Bingo, and UNO:

- Continue to own their board, turn, dice/ball/card, result, and animation states.
- Receive common role-safe color variables and the application atmosphere without changing protocol or rule authority.
- Keep existing active-turn, selection, movement, result, and error treatments; refine them only where needed to remain visually legible in the new palette.
- Show an equivalent static border, label, contrast, or result state under reduced motion.
- Never let an animation advance state ahead of the authoritative server event.

## Responsive and accessibility floor

All affected routes must be reviewed at:

- Phone: 320 x 568 and 390 x 844
- Landscape phone: 640 x 360 and 844 x 390
- Tablet: 768 x 1024 and 1024 x 768
- Desktop: 1366 x 768, 1920 x 1080, and 2560 x 1440

Acceptance:

- No horizontal page scrolling or clipped primary control.
- Safe-area padding remains intact.
- The code field and copy actions are reachable by keyboard and touch.
- Focus order follows profile, room entry, and supporting content.
- Text and state indicators remain readable when atmosphere effects are disabled.
- Resize and rotation re-fit without an explicit reload.
