# Feature Specification: Platform Core, Visual Hub & Room Engine

**Feature Branch**: `001-platform-hub-rooms`

**Created**: 2026-11-01

**Status**: Draft

**Input**: User description: "Initialize feature specification: Platform Core, Visual Hub & Room Engine — a hyper-colorful myArena Hub landing page with uniform glossy game cards (Ludo active; Snakes & Ladders, Housie, Bingo coming soon), a game launch modal (Play with AI / Play Online), a private room engine with unique room IDs, one-click invite link, host role, configurable capacity (2–4 for Ludo) and real-time guest presence, real-time in-room chat, and production-ready hosting configuration (port detection, start command, health check). Minimal automated testing; manual smoke verification."

## Clarifications

### Session 2026-11-01

- Q: Which Render plan will myArena run on in production, and so is service-level keepalive required? → A: Free plan: the
  service sleeps when idle, so the keepalive and "waking up" state are required.
- Q: If a player stays disconnected past the reconnect window during a match, what happens to their seat? → A: The seat is
  released and the match continues for the remaining players.
- Q: After the last participant leaves or disconnects, how long should a room stay open? → A: It closes as soon as the
  reconnect window ends with nobody connected.
- Q: After the host removes a player, can that player rejoin the same room through the invite link? → A: Yes, but only after a
  short wait (60 seconds).
- Q: Should "Play with AI" let the player choose the number of computer opponents? → A: Yes, the launch modal asks for the
  number of opponents before the room is created.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Discover Games on the myArena Hub (Priority: P1)

A visitor opens myArena and lands on the "myArena Hub": a vivid, high-contrast arcade-style page with a prominent
"myArena Hub" title, a guest profile area, an audio/SFX toggle, and a grid of equally sized glossy game cards. Ludo is
clearly playable; Snakes & Ladders, Housie, and Bingo are visibly marked "Coming Soon". The page animates in smoothly
and the cards respond to hover (desktop) and tap (touch) with a lift effect.

**Why this priority**: The Hub is the front door to every game and room. Without it there is nothing to launch, and
its visual quality is a first-class product requirement.

**Independent Test**: Open the Hub on a desktop-sized and a phone-sized viewport. Verify the header, four uniform cards,
badges, animations, hover/tap lift on the active card, and that the coming-soon cards cannot be launched.

**Acceptance Scenarios**:

1. **Given** a visitor opens the Hub, **When** the page loads, **Then** the "myArena Hub" title, guest profile area,
   audio/SFX toggle, and four game cards (Ludo, Snakes & Ladders, Housie, Bingo) are shown with a smooth entry animation.
2. **Given** the Hub is displayed, **When** the visitor looks at the cards, **Then** all four cards have identical
   dimensions, vivid icons/art, and Ludo shows a "PLAY NOW" action while the other three show a "Coming Soon" badge.
3. **Given** a desktop pointer or a touch screen, **When** the visitor hovers over or taps the Ludo card, **Then** the
   card lifts with a visible effect and the "PLAY NOW" button pulses subtly.
4. **Given** a coming-soon card, **When** the visitor clicks or taps it, **Then** nothing launches and the card remains
   clearly marked as unavailable.
5. **Given** the visitor's viewport is a phone, tablet, or laptop in portrait or landscape, **When** the Hub renders,
   **Then** the grid adapts (single column on phones, multi-column otherwise) with no horizontal scrolling, clipped, or
   overlapping elements.
6. **Given** the visitor has a reduced-motion preference, **When** the Hub loads, **Then** entry and hover effects are
   replaced by non-animated equivalents while all information stays visible.

---

### User Story 2 - Launch Ludo and Create a Private Room (Priority: P1)

A visitor clicks the active Ludo card and a launch modal appears with two visually distinct actions: "Play with AI" and
"Play Online". Choosing "Play Online" creates a private multiplayer room, shows its room code and a shareable invite link,
and offers a one-click "Copy Invite Link" control. The visitor enters the room immediately as an active player and host.

**Why this priority**: Creating a shareable private room is the core platform capability that every present and future
multiplayer game depends on.

**Independent Test**: From the Hub, click Ludo, choose "Play Online", and verify a unique room code and invite URL are
displayed, that "Copy Invite Link" places the URL on the clipboard with confirmation, and that the creator lands in the
room as host.

**Acceptance Scenarios**:

1. **Given** the Hub is displayed, **When** the visitor clicks or taps the Ludo card, **Then** a launch modal opens with
   two prominent, visually distinct actions: "Play with AI" and "Play Online".
2. **Given** the launch modal is open, **When** the visitor dismisses it (close control, outside tap, or Escape key),
   **Then** the modal closes and the Hub is unchanged.
3. **Given** the launch modal is open, **When** the visitor chooses "Play Online", **Then** a new private room is created
   with a unique room ID, the room code and an invite link of the form `/room/{gameId}/{roomId}` are displayed, and the
   visitor enters the room as an active player with host capabilities.
4. **Given** an invite link is displayed, **When** the visitor activates "Copy Invite Link", **Then** the full link is
   copied and a clear confirmation appears (for example, a brief "Copied!" state).
5. **Given** two rooms are created in succession, **When** their IDs are compared, **Then** they are different and not
   practically guessable.

---

### User Story 3 - Join via Invite Link with Live Presence (Priority: P1)

A friend opens the invite link in their own browser. They see the room, enter (or accept an auto-generated) display name,
and join as a guest. The host's lobby updates instantly to show the new player, and if the guest leaves or loses connection,
the host's lobby shows that change within the times in SC-003.

**Why this priority**: Joining a friend's room and seeing who is present is what makes the experience multiplayer.

**Independent Test**: Create a room in one browser, open the invite link in a second incognito window, and verify the
guest appears in the host's lobby; close the second window and verify the guest disappears or is marked disconnected.

**Acceptance Scenarios**:

1. **Given** a host has created a room with open slots, **When** a guest opens the invite link, **Then** the guest joins
   the room lobby and appears in the host's player list without the host refreshing the page.
2. **Given** a guest is in the lobby, **When** the guest leaves or closes the page, **Then** the host and remaining
   players see the player removed or marked disconnected within the times in SC-003.
3. **Given** every player slot is filled, **When** another visitor opens the invite link, **Then** they are told the room
   is full and are not added to the room.
4. **Given** a room does not exist or has expired, **When** a visitor opens its link, **Then** they see a friendly
   "room not found" message with a way back to the Hub.
5. **Given** a match has already started, **When** a new visitor opens the invite link, **Then** they are told the match is
   in progress and cannot join as a player.
6. **Given** a guest briefly loses connection, **When** the connection returns within the reconnect window, **Then** the
   guest resumes their seat and the lobby shows them present again.
7. **Given** a match is in progress, **When** a player stays disconnected past the reconnect window, **Then** their seat is
   released, the match continues for the remaining players without pausing, a system announcement is shown, and the departed
   player cannot rejoin that match.

---

### User Story 4 - Real-Time In-Room Chat (Priority: P2)

Everyone in a room can exchange messages instantly. Messages appear in clean bubbles with the sender's player color tag and a
timestamp, and system announcements (for example "Player joined", "Player left") appear inline. On desktop the chat is docked
alongside the game area; on phones it is a collapsible bottom drawer.

**Why this priority**: Chat turns a shared room into a social experience and is required by the platform's room capability
set, but the room itself is usable before chat polish is complete.

**Independent Test**: With two browser windows in the same room, send messages in both directions and verify instant delivery,
bubbles, color tags, timestamps, and join/leave announcements; repeat on a phone-sized viewport and verify the drawer.

**Acceptance Scenarios**:

1. **Given** two players are in a room, **When** one sends a message, **Then** the other sees it appear immediately with the
   sender's name, color tag, and timestamp.
2. **Given** a player joins or leaves, **When** the event occurs, **Then** a visually distinct system announcement appears in
   the chat for everyone present.
3. **Given** a desktop or laptop viewport, **When** the room is displayed, **Then** chat is docked alongside the game area
   without shrinking the game area below its usable size.
4. **Given** a phone viewport, **When** the room is displayed, **Then** chat appears as a collapsible bottom drawer that can be
   opened and closed, and a collapsed drawer shows an unread-message indicator when new messages arrive.
5. **Given** a player sends an empty or whitespace-only message, **When** they try to send, **Then** nothing is sent.
6. **Given** a player sends a very long message or sends messages in rapid bursts, **When** the limits are reached, **Then**
   the message is rejected or trimmed with clear feedback and the room is not flooded.
7. **Given** a message contains markup-like text, **When** it is displayed, **Then** it appears as plain text and never as
   executable or formatted content.
8. **Given** a player joins an existing room, **When** they open chat, **Then** they see the recent conversation history.

---

### User Story 5 - Host Lobby Controls (Priority: P2)

Every room has exactly one host, who is the room creator. The host is an active player with host capabilities: they can
configure the player count (2–4 for Ludo), manage the lobby (for example, remove a player), and start the match when enough
players are present. All other participants are regular players with no host powers.

**Why this priority**: Host controls make private rooms usable for real groups and are part of the platform's room contract.

**Independent Test**: As host, change the player count, remove a guest, attempt to start with too few players (blocked), and
start with enough players (match-start state shown to everyone).

**Acceptance Scenarios**:

1. **Given** a host in a lobby, **When** they change the player count between 2 and 4, **Then** the room's slot display
   updates for all participants immediately.
2. **Given** more players are present than a proposed lower capacity, **When** the host tries to reduce capacity below the
   current player count, **Then** the change is blocked with an explanation.
3. **Given** a lobby with fewer than the minimum players (2 for Ludo), **When** the host tries to start, **Then** start is
   unavailable with a clear explanation.
4. **Given** a lobby with enough players, **When** the host starts the match, **Then** all participants transition to the
   match-in-progress state together, and the lobby locks against new joins.
5. **Given** a non-host guest, **When** they view the lobby, **Then** host-only controls (start, capacity, remove player) are
   not available to them and cannot be triggered by them.
6. **Given** a room at any point in its life, **When** its participants are viewed, **Then** exactly one participant holds the
   host role (the creator unless the role has been transferred), the host is clearly marked, and no other participant can claim,
   share, or hold host capabilities at the same time.
7. **Given** the host leaves or disconnects beyond the reconnect window, **When** other players remain, **Then** the host role
   passes to exactly one remaining player (the one who has been in the room longest), everyone is notified, and the former host,
   if they return, rejoins as a regular player.
8. **Given** the host has removed a player, **When** that player tries to rejoin through the invite link within 60 seconds,
   **Then** they are told they were removed and how long to wait, and are not added; after the wait they can join again if a
   slot is open.

---

### User Story 6 - Play with AI (Priority: P3)

From the launch modal, "Play with AI" asks how many computer opponents to face (1 to 3, with 3 preselected) and then creates a
single-player room against that many local computer opponents, so the visitor can play without sharing links or waiting for
others.

**Why this priority**: It gives a zero-friction way to try a game, but it does not exercise the multiplayer platform.

**Independent Test**: Click Ludo, choose "Play with AI", pick a number of opponents, and verify the visitor enters a room with
that many computer opponents without needing an invite.

**Acceptance Scenarios**:

1. **Given** the launch modal is open, **When** the visitor chooses "Play with AI", **Then** they are asked for the number of
   computer opponents (1 to 3, with 3 preselected) and can confirm with a single tap or click.
2. **Given** the visitor has confirmed the number of opponents, **When** the room is created, **Then** they enter a ready room as
   the host and sole human player together with that many computer-controlled opponents, with no invite step required.
3. **Given** a "Play with AI" room, **When** it is displayed, **Then** the same room frame and chat panel as online rooms are
   available, and the invite-link control is not offered.
4. **Given** a "Play with AI" room, **When** the visitor leaves, **Then** the room ends and no orphaned room remains.
5. **Given** the opponent-count step is shown, **When** the visitor dismisses the modal or goes back, **Then** no room is created.

---

### User Story 7 - Production-Ready Deployment (Priority: P2)

The project can be deployed to the production hosting platform with no manual source edits: it starts with one production
command, listens on the port supplied by the environment, and exposes a health-check route that reports whether the service is
ready.

**Why this priority**: Immediate deployability is a stated goal and the constitution makes hosting readiness a core principle.

**Independent Test**: Start the service using only the production start command and an externally supplied port; call the
health-check route and confirm a healthy response before any user traffic.

**Acceptance Scenarios**:

1. **Given** an environment that supplies a port, **When** the production start command runs, **Then** the service listens on
   that port and is reachable.
2. **Given** no port is supplied (local run), **When** the service starts, **Then** it uses a documented local default port.
3. **Given** the service is running, **When** the health-check route is requested, **Then** it responds within 1 second with a healthy
   status without requiring a guest session.
4. **Given** the service has not finished starting, **When** the health-check route is requested, **Then** it does not report
   healthy.

---

### User Story 8 - Stay Connected While a Game Is Active (Priority: P2)

The production host closes connections and puts services to sleep after a period of inactivity. While anyone is in a room (in
the lobby or in a match), the platform keeps the session alive in the background so players are not disconnected during quiet
moments such as thinking time, waiting for friends, or reading chat.

**Why this priority**: Unexpected disconnects break the core multiplayer experience and would make rooms feel unreliable on the
chosen hosting platform.

**Independent Test**: Create a room with two participants, take no actions (no moves, no chat) for longer than the host
platform's inactivity limit, and verify that nobody is disconnected and the room, lobby, and chat remain intact.

**Acceptance Scenarios**:

1. **Given** a room with at least one connected participant, **When** no one sends a message or takes an action for longer than
   the hosting platform's inactivity limit, **Then** no participant is disconnected and the service stays available.
2. **Given** a connected participant, **When** their connection stops responding (for example, closed laptop or lost signal),
   **Then** the platform detects it within the abrupt-disconnect window and updates presence for everyone else.
3. **Given** no rooms have any connected participants, **When** time passes, **Then** the platform stops generating keepalive
   activity and is free to be put to sleep by the hosting platform.
4. **Given** the service has been asleep, **When** a visitor opens the Hub or an invite link, **Then** they see a friendly
   "waking up" loading state and are connected automatically once the service is ready.

---

### Edge Cases

- A guest opens the same invite link in two tabs or refreshes the page: the same guest keeps one seat and is not duplicated.
- Two guests choose the same display name: the lobby disambiguates them visibly (for example, by color tag or a suffix).
- A visitor leaves the display name blank or enters an overly long or markup-like name: a friendly default name is assigned,
  or the value is trimmed and treated as plain text.
- The clipboard is unavailable or denied: the invite link is shown in a selectable field with a manual-copy hint.
- The network drops mid-session: the participant sees a clear "reconnecting" state and is re-synchronized with the current
  lobby, player list, and chat history when the connection returns.
- The host reduces capacity while the lobby is full: blocked until players are removed.
- A device is rotated or a window is resized during a room session: layout reflows without losing chat input or lobby state.
- The chat drawer is open on a small landscape phone: the game area and the drawer remain usable without overlapping essential
  controls.
- All players leave a room: the room is closed and its link then shows "room not found".
- Every participant loses connection at the same moment (for example, a network outage): the room stays open for the reconnect
  window, and anyone who returns within it finds the room intact; after it, the room is closed.
- The invite link is opened after the room has closed: the visitor sees "room not found".
- A visitor opens a Hub route or room route directly in a browser with no prior visit: the page works without prior setup.
- The previous host returns after the host role was transferred: they join as a regular player, and the room never shows two
  hosts, even briefly during the handover.
- The host's connection drops and returns within the reconnect window: they keep the host role and no transfer happens.
- A removed player opens the invite link again within 60 seconds, including after a page refresh: they see the wait message
  and are not added.
- A player disconnects during a match and returns after the reconnect window: they see that their seat was released and are
  offered a way back to the Hub; they are not restored to the match.
- A participant's browser tab is in the background (for example, a phone screen is locked): the keepalive continues for as long
  as the connection is open, and presence follows the reconnect rules once the connection is lost.
- The service restarts or wakes from sleep during a session: participants see a "reconnecting" state and are re-synchronized
  automatically.

## Requirements *(mandatory)*

### Functional Requirements

**Hub and Guest Experience**

- **FR-001**: The system MUST provide a landing page titled "myArena Hub" with a prominent, gradient-styled brand header, a
  high-contrast, hyper-colorful theme, and smooth entry animations.
- **FR-002**: The Hub MUST display four equally sized glossy game cards: Ludo (active), Snakes & Ladders, Housie, and Bingo
  (each marked "Coming Soon"), each with vivid art or icons.
- **FR-003**: Game cards MUST show a lift effect on hover (pointer devices) and on tap (touch devices); the active Ludo card MUST
  show a "PLAY NOW" button with a subtle pulse animation.
- **FR-004**: Coming-soon cards MUST be visibly unavailable, with a frosted overlay and unmistakable "Coming Soon" badge, and MUST
  NOT start a game or room.
- **FR-005**: The Hub header MUST include a guest profile area (avatar badge and editable display name) and an audio/SFX toggle.
- **FR-006**: A guest's display name and audio preference MUST persist on that device between visits, and the display name MUST be
  used wherever the guest appears (lobby, chat, announcements).
- **FR-007**: The Hub MUST work on phones, tablets, laptops, and desktops, in portrait and landscape; the card grid MUST be a
  single column on phones and a multi-column grid with uniform card dimensions on larger screens, using the available space
  effectively.
- **FR-008**: The Hub and rooms MUST honor reduced-motion preferences by substituting non-animated feedback for animations without
  hiding information.

**Game Launch**

- **FR-009**: Activating the Ludo card MUST open a launch modal with two visually distinct primary actions: "Play with AI" and
  "Play Online".
- **FR-010**: The launch modal MUST be dismissible by a close control, outside tap/click, and the Escape key, and MUST be
  keyboard-accessible with focus managed on open and close.
- **FR-011**: "Play with AI" MUST ask the visitor for the number of computer opponents (1 to 3, with 3 preselected, within the
  game's player limits), then create a single-human room with that many computer-controlled opponents and take the player
  directly into it without any invite step.
- **FR-012**: "Play Online" MUST create a private multiplayer room and take the creator directly into it as an active player
  holding the host role as the room's only host.

**Private Room Platform Engine**

- **FR-013**: Each room MUST receive a unique, non-guessable room ID, and the room MUST be reachable at the shareable path
  `/room/{gameId}/{roomId}`.
- **FR-014**: The room MUST display its room code and invite link, with a one-click "Copy Invite Link" control that confirms
  success and falls back to a manually copyable field if automatic copying is unavailable.
- **FR-015**: Opening an invite link MUST allow a visitor to join as a guest (with a display name), and MUST handle these cases
  with clear messages and a route back to the Hub: unknown/expired room, full room, and match already in progress.
- **FR-016**: Room capacity MUST be configurable by the host between 2 and 4 players for Ludo; capacity limits MUST be defined per
  game so other games can declare different limits.
- **FR-017**: The lobby MUST show all current players with their names, color tags, host marker, and connection state, updating for
  everyone in real time when players join, leave, disconnect, or reconnect.
- **FR-018**: A disconnected participant MUST be able to reclaim their seat if they return within a reconnect window; after it
  elapses their seat MUST be released. In a lobby, a released seat MUST reopen for new joiners. During a match in progress, the
  seat MUST be released, the match MUST continue for the remaining players without pausing, the platform MUST announce the
  departure and inform the game, and the departed player MUST NOT be able to rejoin that match.
- **FR-019**: A room MUST have exactly one host at all times (the creator, unless the role has been transferred under FR-021);
  co-hosts and shared host roles MUST NOT exist. Host capabilities MUST include changing capacity, removing a player, and
  starting the match; these actions MUST be available only to the host and MUST be enforced regardless of what any participant's
  interface shows. A removed player MUST be told they were removed, MUST be unable to rejoin that room for 60 seconds, and MAY
  rejoin through the invite link after that if a slot is open.
- **FR-020**: The host MUST NOT be able to start a match below the game's minimum player count or reduce capacity below the
  current player count, and the interface MUST explain why.
- **FR-021**: When the host leaves or remains disconnected past the reconnect window, the host role MUST transfer to exactly one
  other remaining player (the one present longest), and all participants MUST be notified; a former host who returns MUST rejoin
  as a regular player; if no players remain, the room MUST be closed.
- **FR-022**: Starting a match MUST move all participants to the match-in-progress state together and lock the room against new
  joiners.
- **FR-023**: The room engine MUST be game-agnostic: any future game MUST be able to use rooms, presence, invites, host controls,
  and chat by supplying its game identity and player limits, without reimplementing them.
- **FR-024**: Rooms MUST be temporary. A room MUST close immediately when its last participant explicitly leaves, and MUST close
  when the reconnect window ends with no participant connected; a room with at least one connected participant MUST NOT expire
  because of inactivity. Once closed, the room's invite link MUST show "room not found".

**In-Room Chat**

- **FR-025**: Every room MUST include real-time chat that delivers messages to all participants without page refresh.
- **FR-026**: Chat messages MUST display as clean bubbles containing sender name, player color tag, and timestamp, with the
  current player's messages visually distinguished.
- **FR-027**: The chat MUST show system announcements, visually distinct from player messages, for events including a player
  joining, a player leaving, a player disconnecting/reconnecting, and a host change.
- **FR-028**: On large screens chat MUST be docked alongside the game area; on phones it MUST be a collapsible bottom drawer with
  an unread-message indicator while collapsed.
- **FR-029**: Chat MUST reject empty messages, enforce a maximum message length, and limit message rate per participant with
  user-visible feedback.
- **FR-030**: Chat content MUST always be displayed as plain text, never interpreted as markup or script.
- **FR-031**: A participant joining or reconnecting MUST receive recent chat history for the room.

**Game Stage Placeholder**

- **FR-032**: The room MUST provide a dedicated game area in which a game can be mounted; until a game's own board is available,
  the area MUST show a polished placeholder indicating the game and the match state (lobby, in progress).

**Layout and Visual Quality**

- **FR-033**: All screens in this feature MUST maximize use of available screen space for the device and orientation, with no
  horizontal scrolling, clipped, or overlapping content between 320 px and 2560 px wide, in portrait and landscape, and MUST
  respect device safe areas.
- **FR-034**: Interactive elements MUST have tactile pressed/hover/focus states usable with touch, pointer, and keyboard, and
  rooms MUST display glowing indication of the current host/active state in the lobby.

**Deployment Readiness**

- **FR-035**: The service MUST start with a single documented production start command and MUST read its listening port from the
  environment, with a documented local default when none is supplied.
- **FR-036**: The service MUST expose a health-check route that reports healthy only when it is ready to serve users and does not
  depend on a guest session.
- **FR-037**: All deployment settings MUST be provided via repository configuration and documented environment variables so the
  project can be deployed to the production hosting platform without source edits.
- **FR-038**: The feature MUST be verifiable by the manual smoke test: load Hub on desktop and mobile viewports; Ludo → Play Online
  → invite URL generated; open invite in a second incognito browser → guest appears in host's lobby; exchange messages in both
  directions with instant delivery.

**Connection Keepalive**

- **FR-039**: While a room has at least one connected participant (in the lobby or in a match), the platform MUST keep every
  participant's connection active in the background so that the hosting platform's inactivity limits do not disconnect them
  during periods with no moves or chat; this MUST NOT require any action from the participants.
- **FR-040**: The platform MUST use the same background activity to detect unresponsive connections and update presence for the
  other participants within the abrupt-disconnect window defined in SC-003.
- **FR-041**: While any room has a connected participant, the platform MUST generate regular inbound activity at an interval
  comfortably shorter than the hosting platform's shortest inactivity limit, so the hosting platform does not put the service to
  sleep; when no room has a connected participant, the platform MUST stop generating this
  activity so the service may sleep.
- **FR-042**: When the service is waking from sleep or a connection has dropped, visitors and participants MUST see a clear
  "waking up" or "reconnecting" state and be reconnected and re-synchronized automatically without manual refresh.

### Key Entities *(include if feature involves data)*

- **Guest Player**: A visitor's session identity: display name, avatar badge, assigned color tag, audio preference, and connection
  state. No account or sign-in is required.
- **Game Definition**: Describes a game offered on the Hub: identifier, name, card art, availability status (active or coming
  soon), and player-count limits (for Ludo, 2 to 4).
- **Room**: A temporary private space for one game session: unique room ID, game identity, state (lobby, in progress, closed),
  capacity, a single host (the creator unless the role was transferred), creation and last-activity times, and an invite link.
- **Seat / Participant**: A player's place in a room: the guest occupying it, color tag, host marker, connection state, and
  reconnect eligibility.
- **Chat Message**: A single message or system announcement in a room: sender (or system), text, timestamp, and the sender's color
  tag.
- **Invite Link**: A shareable URL pointing to one room, derived from the game and room IDs.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time visitor can open the Launch modal for Ludo within 2 clicks/taps and 10 seconds of the Hub appearing.
- **SC-002**: After choosing "Play Online", the room code and invite link appear within 2 seconds in at least 95% of attempts.
- **SC-003**: A guest joining through an invite link appears in the host's lobby within 2 seconds, and a guest who leaves is reflected
  for the others within 2 seconds (within 10 seconds for an abrupt disconnect), in at least 95% of attempts.
- **SC-004**: Chat messages reach all participants within 1 second in at least 95% of sends under normal network conditions.
- **SC-005**: On every tested screen size from 320 px to 2560 px wide, in portrait and landscape, no horizontal scrolling,
  overlapping, or clipped content occurs on the Hub or in a room.
- **SC-006**: All four manual smoke-test steps pass on both a desktop-sized and a phone-sized viewport without any workaround.
- **SC-007**: The service can be deployed to the production hosting platform without source changes and reports healthy within 30
  seconds of starting.
- **SC-008**: With reduced-motion enabled, 100% of Hub and room information and controls remain available and understandable.
- **SC-009**: The platform supports at least 50 simultaneous rooms of up to 4 players each while still meeting SC-002, SC-003,
  and SC-004.
- **SC-010**: In a review of the finished Hub and room screens, stakeholders rate the visual polish (colorfulness, animation
  smoothness, card consistency) as meeting or exceeding the supplied reference image.
- **SC-011**: In a room with connected participants that take no actions for 30 minutes, there are zero unintended disconnects and
  the room, lobby, and chat history remain intact.
- **SC-012**: At every moment in every tested room, exactly one participant is the host, including during and after a host
  handover.

## Assumptions

- The attached landing-page image is a **visual style reference** (dark, neon-glow arcade look, glossy art cards, status badges).
  Where it differs from the written scope, the written scope wins: header navigation items (Tournaments, Community, About Us),
  Login / Sign Up, search, filter chips, "Preview" / "Notify Me" buttons, and the live "Players Online" counter are **out of
  scope** for this feature. Coming-soon cards are non-interactive.
- The card grid is a 2 × 2 grid on tablets and standard desktops and a single column on phones. On very wide displays the cards
  may sit in one row provided all cards keep identical dimensions and use the space effectively.
- This feature delivers the **platform** (Hub, launch modal, room engine, presence, chat, deployment readiness). The Ludo board,
  rules, dice, turn logic, and the AI opponent's gameplay are **separate features**. In this feature, "start match" and "Play
  with AI" lead to the room's game area placeholder and the correct room state; the AI opponent appears as a seated bot player.
- Guests have no accounts. A guest's name, avatar badge, and audio preference are stored on their own device only; clearing
  browser data resets them.
- Player color tags are assigned automatically per seat and are unique within a room.
- Rooms are temporary and not stored permanently; closed rooms and their chat are discarded. A recent history of up to
  50 messages is retained for the life of a room.
- The reconnect window for a disconnected participant is 60 seconds (assumed default; adjustable by the team).
- Maximum chat message length is 500 characters and rate limiting allows short bursts but blocks sustained flooding.
- A match already in progress cannot be joined by new players, and spectating is out of scope.
- When a seat is released during a match, each game decides how its rules treat the vacated seat (for example, what happens to
  that player's pieces); the platform only releases the seat, announces it, and informs the game.
- "Play with AI" offers 1 to 3 computer opponents for Ludo (the player limits of the game minus the human), preselecting 3.
- Production hosting is Render.com (a web service that supports persistent real-time connections), per the project constitution.
  Because a redeploy can interrupt live connections, participants are re-synchronized when they reconnect; rooms are not
  guaranteed to survive a service restart.
- Testing is minimal by policy: verification relies on the manual smoke test, visual checks across phone, tablet, and desktop
  sizes in both orientations, and deterministic checkpoints, not extensive automated suites.
- The initial audience is small (dozens of concurrent rooms), consistent with SC-009.
- Production runs on Render.com's free web-service plan, which closes idle connections and puts the service to sleep after about
  15 minutes without traffic. The keepalive interval must stay comfortably below the shortest applicable limit, and the
  service-level keepalive (FR-041) is required, not optional. If the plan changes later, the service-level keepalive may be
  retired, but the connection heartbeat (FR-039, FR-040) remains.
- "Active" means a room with at least one connected participant. Rooms with nobody connected are not kept alive; the service may
  sleep and the first visitor after a sleep may wait about a minute for it to wake (Render's documented spin-up time).
- The host role is not chosen by vote or request: the creator is the host, and a handover only happens automatically when the
  host leaves or stays disconnected past the reconnect window.
- Terminology: a **guest** is a visitor's browser identity and saved profile; a **participant** (or **player**) is a guest seated
  in a room; the **host** is the one participant with host capabilities.
