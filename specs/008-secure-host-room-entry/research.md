# Phase 0 Research: Secure Host Access and Room Entry

All technical unknowns and implementation decisions are resolved below.

## R1. How `/host` becomes a server-enforceable boundary

- **Decision**: In production, Express handles `GET /host` before the SPA fallback, serves the built client application, and sets a signed, HttpOnly, same-site session cookie. During development, Vite proxies only the exact `/host` request to Express; Express sets the cookie and relays Vite's own transformed root HTML while leaving assets and HMR on Vite. The client cannot read or forge the cookie, and Socket.IO receives it automatically on the same origin. `room:create` requires a valid cookie at the server handler. The player UI never obtains the cookie through a separate endpoint or exposes host entry.
- **Rationale**: A client-callable capability endpoint would let a visitor acquire host access without traversing `/host`. Issuing on the route itself binds the proof to the user-selected host entry and moves creation authorization to the server action boundary. It still does not verify a person's identity because anyone who can visit `/host` receives the capability.
- **Alternatives considered**:
  - UI-only route hiding: rejected because it does not enforce host permissions.
  - A separate public `/api` capability endpoint: rejected because a visitor could call it without entering `/host`.
  - Serving Express's built client response in development: rejected because a clean checkout may have no build and it would bypass Vite HMR.
  - Personal host accounts: better identity and revocation, but deferred by the user's `/host` clarification and would materially expand the feature.
  - A shared password prompt: rejected because it adds secret distribution and recovery without verified identities.

## R2. Host capability lifetime and process replacement

- **Decision**: Use a process-local signing secret and a cookie scoped to the browser session, with a bounded signed expiry of 12 hours. The cookie is `HttpOnly`, `SameSite=Lax`, `Path=/`, and `Secure` in production. Room state and capabilities end on process replacement. Reopening the server-handled `/host` route issues a fresh capability.
- **Rationale**: No repository secret or new environment variable is required. The existing service already treats rooms as temporary; tying the proof to the process avoids accepting stale capability after deployment.
- **Alternatives considered**:
  - Persistent cookie secret: rejected because it would require deployment secret management and outlive restarts.
  - `localStorage` token: rejected because JavaScript access exposes the proof to page script and can be copied easily.

## R3. What the capability authorizes

- **Decision**: A capability authorizes the socket to create a room. The server marks only the participant created through that authorized `room:create` call as `hostEligible`. A fresh code or invite join is always host-ineligible even if its browser still carries the `/host` cookie. Resuming an existing participant preserves that participant's prior room role. Existing room authority still comes from server-owned `hostPlayerId`.
- **Rationale**: This distinguishes global entry permission from per-room state. A host can create a room; an invite recipient remains a player. Every host-only room action continues to use the existing per-room checks.
- **Alternatives considered**:
  - Any valid host-capable socket becomes host on invite: rejected because it contradicts “invite does not transfer host control.”
  - Remove all server checks and trust the route: rejected by the constitution.

## R4. Host departure and handover

- **Decision**: Only the authorized creator is host-eligible for a room, so no fresh joiner can be a handover target. If the current host leaves or its seat is released and that participant cannot resume, the room closes with a distinct `host_left` reason and ordinary players are never promoted.
- **Rationale**: Existing handover promotes the first player and would violate the new global entry boundary. Closing is clearer and safer than leaving players in a room without an authorized host.
- **Alternatives considered**:
  - Handover to any player: rejected because it turns invitees into hosts.
  - Freeze the room indefinitely: rejected because players cannot act and the room may remain leaked in memory.

## R5. Six-character room codes and collision risk

- **Decision**: Keep the existing 31-character unambiguous alphabet and reduce `ROOM_ID_LENGTH` from eight to six. Codes are displayed without separators in uppercase. Input normalization trims surrounding and internal whitespace, accepts optional dashes, and converts letters to uppercase. Creation retries on an active-code collision.
- **Rationale**: With 31^6 possible values, a maximum of 100 live rooms has negligible collision pressure, while a six-character value is practical to read aloud. The alphabet already avoids `0/O/1/I/L`.
- **Alternatives considered**:
  - Numeric-only: rejected because more digits would be needed for the same collision margin and verbal clarity.
  - UUID or long opaque ID: rejected because players need a speakable value.
  - A separate six-character alias beside the eight-character internal ID: rejected because two identifiers add lookup and lifecycle drift; rooms are in memory so no persisted migration is needed.

## R6. Joining from the player Hub

- **Decision**: Extend `room:join` so `gameId` is optional. A URL join continues to provide it; a Hub join sends only `roomId`. The server normalizes the code, resolves one live room, validates the room's state, then runs the existing join flow. The normal `JoinedData` response already contains `room.gameId`.
- **Rationale**: The user should not need to know the game before joining. Reusing `room:join` avoids a separate lookup event that could disagree with the authoritative join result or disclose room state twice.
- **Alternatives considered**:
  - `room:resolve` then `room:join`: rejected because it is two round trips and adds a race between lookup and join.
  - Make players choose a game first: rejected because the host calls out only a code.

## R7. Join error behavior and route state

- **Decision**: The Hub keeps the user in place and shows a field-level error for malformed, missing, full, started, unavailable, or removed-cooldown rooms. The direct invite route retains `JoinGate` and the existing status screens. A successful Hub join applies the authoritative snapshot and navigates to `/room/{gameId}/{roomId}`.
- **Rationale**: FR-011 requires a corrective path without losing the Hub, while direct invite flows already have clear status pages and reconnect behavior.
- **Alternatives considered**:
  - Redirect every bad code to a status page: rejected because the player loses input context.
  - Pre-validate only client-side: rejected because room state and availability are server-authoritative.

## R8. Host/player landing structure

- **Decision**: Reuse `HubPage` with an explicit `host` or `player` mode. The host route presents the game launch grid and guest profile. The player route presents the same profile plus a prominent join-code panel and a non-launching showcase of active games. The wildcard route renders the player experience.
- **Rationale**: One shared layout preserves visual consistency and avoids duplicating responsive behavior. Mode is explicit at route/render time so host controls cannot appear accidentally.
- **Alternatives considered**:
  - Entirely separate page trees: rejected because it duplicates header, profile, sound, game art, and responsive code.
  - Keep one page and hide only the create button: rejected because the landing hierarchy remains host-oriented.

## R9. Shared visual energy without changing game authority

- **Decision**: Add a platform `ArenaAtmosphere` decoration layer at the application level. It reads only route role and current room game to choose gradients, particles, glow color, and role labels. Existing game screens continue to drive dice, turn, movement, and result events; their current event styles are strengthened with shared tokens but never use the atmosphere as an input to state.
- **Rationale**: The same visual system reaches all four game screens without copying room logic or wrapping rules in one game-specific implementation. Decorative DOM is `aria-hidden`, pointer-inert, and disabled under `prefers-reduced-motion`.
- **Alternatives considered**:
  - A full redesign inside every game: rejected as duplication and higher regression risk.
  - Global CSS variables only: insufficient to create distinct role surfaces and a shared high-energy layer.

## R10. Verification strategy

- **Decision**: Extend the current Socket.IO smoke script rather than introducing a test framework. Add browser scenarios for `/host`, player Hub code joining, invite joining, host departure, reconnect, invalid codes, and screenshots across phone, tablet, and desktop. Repeat on Render because local-only checks do not establish HTTPS/WSS cookie behavior.
- **Rationale**: This is a focused authorization and UX change; the constitution prefers pragmatic verification and the existing script already covers the two-client room authority risk.
- **Alternatives considered**:
  - Unit-mocking Express and Socket.IO: rejected as a larger harness with less end-to-end value.
  - Manual-only authorization checks: rejected because cookie and host-boundary regressions are cheap to automate in the existing smoke path.
