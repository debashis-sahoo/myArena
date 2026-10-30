# Feature Specification: Base Platform and Experience

**Feature Branch**: Not created (no branch hook is configured)

**Created**: 2026-10-10

**Status**: Draft

**Input**: User description: Base Platform and Experience for the game platform named
myArena Hub, a browser-based multiplayer gaming platform for friends and families.

## Clarifications

### Session 2026-10-10

- Q: How long should a temporarily disconnected participant keep their room seat and role
  before recovery expires? → A: 10 minutes.
- Q: How many participants should one room support at most? → A: 100 participants.
- Q: Which browser-version policy should acceptance use for laptop, Android, and iPhone? →
  A: Current and previous major browser versions.
- Q: How long should room chat and room data remain available after a room closes? →
  A: Delete on room closure, except short-lived recovery data.
- Q: After the 10-minute recovery window expires, should a returning participant be allowed
  to join an active room again? → A: No; rejoining after expiry is not allowed.

### Session 2026-10-29

- Q: What launch capacity should be supported? → A: 20 concurrent rooms and 200 total
  connected participants, with up to 100 participants in one room.
- Q: How can the host deal with an idle or unwanted member? → A: The host can remove a
  member from the room.
- Q: Which returning participants does the post-expiry rejection apply to? → A: A client
  that still presents the room's old membership credential is rejected. Because accounts
  are not used, a visitor with no such credential who joins through a valid invitation is a
  new participant with a new seat, not a restoration.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create or Join a Private Room (Priority: P1)

A host starts a private room with a display name and shares its room code or invite link.
Friends join with their own display names, without creating accounts or installing an app.
The room is the shared starting point for playing together across supported devices.

**Why this priority**: Creating and joining a room is the platform's primary entry journey.

**Independent Test**: In a new room, one person creates it and another joins from a separate
browser using only the room invitation; both can see the same lobby and member list.

**Acceptance Scenarios**:

1. **Given** a visitor has opened the platform in a supported browser, **When** they enter a
   valid display name and create a room, **Then** they become that room's host and receive a
   private room code and shareable invite link.
2. **Given** a visitor has a valid room code or invite link, **When** they enter a display
   name and join, **Then** they enter as a player without registration or installation.
3. **Given** a room code is invalid, expired, or unavailable, **When** a visitor attempts to
   join, **Then** the platform explains the problem and offers a safe way to retry.

---

### User Story 2 - Manage the Lobby and Start a Match (Priority: P1)

The host selects an available game, manages shared room settings, and starts or rematches
when the room is ready. Players can see who is present, each member's connection and
readiness state, the selected game, settings, and chat. Each player controls their own
readiness, permitted selections, messages, and game actions.

**Why this priority**: The lobby coordinates a group and enables a match without confusing
room management with game authority.

**Independent Test**: In a room with a host and at least one player, verify lobby information,
role-specific controls, readiness, host game/settings controls, chat, and start/rematch
eligibility.

**Acceptance Scenarios**:

1. **Given** a room contains a host and players, **When** a member opens the lobby, **Then**
   the current member list, connection status, selected game, shared settings, chat, and
   readiness states are visible.
2. **Given** a player is in the lobby, **When** they change their readiness or use a
   permitted selection, **Then** the lobby reflects that member's updated state and does not
   allow them to change another member's state or host-only settings.
3. **Given** the host selects an available game or changes a permitted room setting,
   **When** the change is accepted, **Then** all members see the same current selection and
   settings.
4. **Given** the room satisfies its readiness and game-start conditions, **When** the host
   starts the match or requests a rematch, **Then** the room transitions consistently for
   all members; otherwise, the host receives an explanation of what prevents the action.

---

### User Story 3 - Recover and Rejoin (Priority: P1)

A participant can recover after a temporary network interruption, phone lock, browser
backgrounding, or refresh. A temporary loss is not treated as an intentional departure.
Within 10 minutes of disconnection, the participant returns to their existing seat, role,
and current room state.

**Why this priority**: Mobile devices and variable networks commonly interrupt sessions;
losing a seat or match state would undermine trust.

**Independent Test**: Interrupt a participant's connection during a room session, restore
it within 10 minutes, and verify the same seat, role, lobby or match
state, and absence of duplicate actions.

**Acceptance Scenarios**:

1. **Given** a participant is in a room, **When** the network is temporarily unavailable,
   **Then** the participant is shown as disconnected or reconnecting, not as having
   intentionally left.
2. **Given** that participant reconnects within 10 minutes of disconnection, **When**
   recovery completes, **Then** their seat, role, readiness, and current permitted room
   state are restored and synchronized with the room.
3. **Given** a participant locks or backgrounds a phone and later resumes it, **When** the
   browser resumes, **Then** the platform attempts recovery and clearly reports whether the
   participant rejoined or must use the documented rejoin path.
4. **Given** a participant explicitly chooses Leave, **When** the leave action succeeds,
   **Then** the departure is distinguished from a temporary disconnect and the seat is
   released according to the documented room policy.
5. **Given** a participant refreshes or changes phone orientation, **When** the room is
   restored or reflowed, **Then** no accepted room state or action is lost or applied twice.
6. **Given** a participant returns after the 10-minute recovery window, **When** they try to
   rejoin the same room, **Then** the platform rejects the attempt with a clear explanation,
   even if the room is active and has space.

---

### User Story 4 - Transfer Host and Protect Room Authority (Priority: P1)

The host can hand room management to another current member. Room controls are authorized
by the participant's server-recognized room membership and role, not by identity values
sent by a browser. The host remains subject to normal game rules.

**Why this priority**: Host handoff prevents an active room from depending on one device,
and explicit authorization prevents clients from granting themselves authority.

**Independent Test**: Transfer the host role to a different member, then attempt host-only
actions from both the new host and a player while checking that game actions follow normal
game rules.

**Acceptance Scenarios**:

1. **Given** a room has an active host and eligible member, **When** the host hands off
   management, **Then** the selected member becomes host, the former host becomes a player,
   and all clients see the same role change.
2. **Given** a client submits a host-only action with a forged or stale user or host
   identifier, **When** the platform evaluates the action, **Then** it is rejected and no
   protected room state changes.
3. **Given** the host participates in a game, **When** the host makes a game action,
   **Then** the action is subject to the same game rules as a player's action.
4. **Given** the host intentionally leaves or remains disconnected beyond 10 minutes,
   **When** the room continues, **Then** host management is transferred according
   to the published handoff policy without creating a global administrator role.

---

### User Story 5 - Use the Platform Accessibly Across Devices (Priority: P2)

Hosts and players use shared room and lobby experiences on laptop, Android phone, and
iPhone browsers. Layouts adapt to portrait and landscape, and controls work with mouse,
trackpad, keyboard, and touch. The interface is clear, uses available screen space well,
supports light and dark modes, and respects reduced-motion preferences.

**Why this priority**: Families and friends use different devices and input methods, often
in the same room.

**Independent Test**: Complete host and player room journeys on real laptop, Android, and
iPhone devices, including mixed-device rooms and orientation changes.

**Acceptance Scenarios**:

1. **Given** a host or player uses a laptop, Android phone, or iPhone browser, **When** they
   create or join a room and use the lobby, **Then** all in-scope shared capabilities remain
   available without requiring an installed application.
2. **Given** participants use different device classes in one room, **When** they view or
   change shared lobby state, **Then** every participant sees consistent membership,
   permissions, game selection, settings, chat, and readiness.
3. **Given** a phone user rotates between portrait and landscape, **When** the layout
   changes, **Then** controls remain usable and no horizontal page overflow is introduced.
4. **Given** the user enables reduced motion or keyboard-only interaction, **When** they
   navigate shared experiences, **Then** motion is reduced and all core controls remain
   operable and visibly focused.
5. **Given** a user encounters an invalid action, unavailable room, or recovery failure,
   **When** an error is shown, **Then** it identifies the issue in clear language, is
   accessible to assistive technology, and explains a safe next step.

### Edge Cases

- A display name is empty, too long, contains unsupported characters, or duplicates another
  member's name; the platform validates it and disambiguates display without treating names
  as identity credentials.
- Multiple participants use an invitation at the same time; each accepted join receives one
  seat and one role, with no duplicate membership.
- An invitation is malformed, revoked, expired, or used after the room is closed; no room
  data is disclosed and a clear error is provided.
- A player attempts to change shared settings, start or rematch, transfer host, or modify
  another member's readiness; the action is rejected without partial state changes.
- A host disconnects during handoff or a handoff races with another room action; a single
  current host is maintained and the outcome is visible to members.
- A member disconnects while changing readiness, sending chat, or issuing an allowed
  selection; recovery reconciles the accepted result without duplicating it.
- A room reaches its configured capacity, or a join races with the final available seat;
  the rejected visitor receives a clear full-room result.
- The network is lost during room creation, join, leave, match start, or host handoff; the
  user can determine whether the action succeeded before retrying.
- A phone is locked, backgrounded for a long time, refreshed, or returns with expired
  recovery data; after 10 minutes the platform rejects rejoining the same room and does not
  silently restore a former seat or match state.
- A user switches orientation, uses a narrow viewport, or increases text size; important
  controls and status remain available without horizontal overflow.
- The system must not expose private member or recovery data through another participant's
  view, an error message, or an invitation preview.
- No eligible participant is available for host handoff; the room follows the published
  closure or waiting policy rather than assigning a global administrator.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The platform MUST let a visitor create or join a private room using a display
  name and room code or invite link, without requiring an account or application install.
- **FR-002**: The platform MUST provide a private room code and shareable invite link to the
  host and MUST reject invalid, revoked, expired, or closed-room invitations without
  disclosing private room state.
- **FR-003**: The platform MUST provide exactly two room roles, HOST and PLAYER. It MUST NOT
  provide a global administrator role.
- **FR-004**: The platform MUST authorize each protected action using its authoritative
  room membership and role. Client-supplied user or host identifiers MUST NOT grant
  permissions.
- **FR-005**: The HOST MUST be able to manage shared room settings, select an available
  game, start a match, request a rematch, manage room invitations, remove a member from
  the room, and hand off host management, subject to room policy. Removing a member
  releases their seat and deletes their recovery data immediately; the host cannot remove
  themselves (they leave or hand off instead).
- **FR-006**: A PLAYER MUST be able to change their own readiness, make permitted
  selections, use room chat, and submit game actions where the selected game permits them.
  A PLAYER MUST NOT perform host-only actions or change another member's state.
- **FR-007**: The host MUST remain subject to normal game rules; room-management authority
  MUST NOT bypass gameplay permissions or legal-move rules.
- **FR-008**: The platform MUST show current room members, their connection and readiness
  status, selected game, shared settings, and room chat to authorized room members.
- **FR-009**: The platform MUST keep room state synchronized so accepted changes and
  messages become visible to all authorized members and rejected actions do not partially
  change shared state.
- **FR-010**: The platform MUST distinguish explicit departure from temporary loss of
  connection and MUST retain a disconnected participant's seat, role, and current state
  for 10 minutes after disconnection.
- **FR-011**: A participant who reconnects within 10 minutes of disconnection MUST
  recover their existing seat, role, and current permitted state without losing accepted
  progress or duplicating accepted actions.
- **FR-012**: The platform MUST support recovery after temporary network loss, phone lock,
  background/resume, and browser refresh within documented limitations, and MUST explain
  the result when recovery is unavailable.
- **FR-013**: The platform MUST provide a documented outcome when the host leaves or is
  unavailable beyond 10 minutes, including host handoff where an eligible member
  exists.
- **FR-014**: The shared experience MUST work in supported laptop, Android phone, and
  iPhone browsers without a native application, including mixed-device rooms. Support
  covers the current and previous major versions of the applicable browsers.
- **FR-015**: Shared navigation and lobby controls MUST support mouse, trackpad, keyboard,
  and touch, provide visible keyboard focus, honor reduced-motion preferences, and adapt
  to portrait and landscape without horizontal overflow.
- **FR-016**: Shared presentation MUST provide light and dark modes, maximize usable screen
  space, and keep text and controls legible and understandable.
- **FR-017**: Errors for invalid input, denied actions, unavailable rooms, full rooms, and
  failed recovery MUST be clear, accessible, and include an appropriate safe next step.
- **FR-018**: The platform MUST limit each member's view to information permitted by their
  role and the room context. Credentials, private information, recovery data, and
  production secrets MUST be protected and MUST NOT be exposed to other members.
- **FR-019**: The platform MUST provide room and participant limits and communicate a
  capacity rejection clearly. A room MUST support up to 100 participants. The launch
  capacity is 20 concurrent rooms and 200 total connected participants.
- **FR-020**: The platform MUST keep room lifecycle, roles, lobby, chat, shared settings,
  synchronization, and recovery separate from individual game rules and game-specific
  presentation. Game rules and solo modes are outside this feature.
- **FR-021**: Acceptance evidence MUST cover host and player journeys on a real laptop, a
  real Android phone, and a real iPhone; mixed-device rooms; hosting rotated between
  device classes; required input methods; portrait and landscape; reconnect; background and
  resume; host handoff; authorization and privacy; accessible errors; keyboard operation;
  and reduced motion. Viewport emulation MUST NOT substitute for real Android or iPhone
  acceptance.
- **FR-022**: Device acceptance records MUST identify device, operating system, browser and
  version, tester, date, and scenario outcomes. No implementation or test completion is
  asserted by this draft.
- **FR-023**: The platform MUST authenticate room membership securely without requiring an
  account. Display names and client-supplied user or host identifiers MUST NOT authenticate
  a member. Any credentials used for membership or recovery MUST be protected from
  disclosure to other members and MUST NOT be exposed in error messages or logs.
- **FR-024**: When a room closes, the platform MUST delete its chat and room data.
  Recovery data MUST be deleted no later than room closure or the end of its 10-minute
  validity period, whichever occurs first.
- **FR-025**: After the 10-minute recovery period expires, the platform MUST reject the
  returning participant's attempt to rejoin the same room, regardless of room capacity or
  game entry rules, and MUST NOT restore the former seat, role, or match state. The
  returning participant is recognized by the room membership credential their browser
  still holds; a visitor without it who joins through a valid invitation is a new
  participant.

### Key Entities *(include if feature involves data)*

- **Room**: A private shared space with an invitation, lifecycle, selected game, settings,
  a maximum of 100 participants, and current participants.
- **Invitation**: A room code or invite link that permits an eligible visitor to request
  entry while valid.
- **Participant**: A person represented in a room by a display name, room membership,
  role, readiness, connection state, and recoverable seat.
- **Room Role**: HOST or PLAYER; determines room-management permissions, not gameplay
  outcomes.
- **Lobby State**: The authorized shared view of members, statuses, game selection,
  settings, readiness, and chat.
- **Recovery Record**: Protected information used to distinguish and restore a returning
  participant's membership, role, seat, and accepted room state during the 10-minute
  recovery window; it is removed at room closure or when that window expires, whichever
  occurs first.
- **Chat Message**: A room-scoped message associated with its sender and time, visible only
  to authorized members while the room is active and deleted when the room closes.
- **Acceptance Record**: Evidence of a tested scenario with device, operating system,
  browser version, tester, date, and result.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In moderated acceptance sessions, at least 90% of first-time participants
  complete room creation or joining without assistance within two minutes, using only a
  display name and room invitation.
- **SC-002**: In acceptance runs, all supported device classes show the same accepted room
  membership, roles, readiness, game selection, settings, and chat after a synchronization
  event; no unauthorized action changes shared state.
- **SC-003**: 100% of the required real-device acceptance matrix is recorded for HOST and
  PLAYER on laptop, Android, and iPhone, including mixed-device rooms with hosting rotated
  between device classes. Emulation does not count toward this result.
- **SC-004**: In 100% of recovery scenarios completed within 10 minutes of disconnection,
  the participant returns to the same seat and role with the latest accepted room state and
  no duplicated accepted action.
- **SC-005**: In 100% of role-boundary scenarios, only the current host can perform
  host-only actions and no client-supplied identity or role value changes authorization.
- **SC-006**: In 100% of portrait and landscape acceptance checks on Android and iPhone,
  core room controls remain available and the page has no horizontal overflow.
- **SC-007**: 100% of documented error scenarios identify the problem and a safe next step;
  all such messages are perceivable in keyboard and assistive-technology acceptance checks.
- **SC-008**: Keyboard-only acceptance completes all core room journeys, with visible focus
  on every interactive control; reduced-motion acceptance introduces no required
  non-essential motion.
- **SC-009**: The agreed supported room and participant capacity is met in load acceptance
  without losing or misrepresenting accepted room state, including at least 100 participants
  in one room, and the launch capacity of 20 concurrent rooms and 200 total connected
  participants.
- **SC-010**: Under the agreed supported capacity, at least 95% of accepted lobby changes
  are visible to all connected room members within one second.
- **SC-011**: In 100% of room-closure checks, closed-room chat and room data are no longer
  available, and recovery data is unavailable after room closure or 10 minutes after
  disconnection, whichever occurs first.
- **SC-012**: In 100% of post-expiry recovery checks, the returning participant is denied
  rejoining the same room and receives a clear explanation; no former seat, role, or match
  state is restored.

## Assumptions

- Display names are labels within a room, not proof of identity or credentials.
- The authoritative service is responsible for room membership, role checks, and accepted
  online room state; clients request changes and display authorized state.
- Browser support covers the current and previous major versions of applicable browsers on
  supported laptop, Android, and iPhone operating systems. The exact browser and OS release
  matrix must be recorded during acceptance planning.
- A temporary disconnect keeps a participant's seat and role for 10 minutes. After the
  window expires, the participant cannot rejoin the same room; their former seat, role, and
  match state are not restored.
- A participant who explicitly leaves releases their seat according to room lifecycle
  policy; chat and room data are deleted when the room closes.
- Each room supports at most 100 participants; joins beyond that limit receive a clear
  explanation. Launch capacity is 20 concurrent rooms and 200 total connected participants.
- Room chat is visible only to current authorized room members and is deleted with room data
  when the room closes.
- The base platform selects among available games and manages shared settings, but does not
  define game rules, game-specific screens, or solo play.
- User-facing timing and completion targets in Success Criteria are acceptance goals, not
  claims of achieved results.
- Real-device testing includes at least one actual laptop, Android phone, and iPhone; exact
  model coverage is determined during test planning.

## Dependencies

- The base platform requires an agreed list of available games and the shared information
  each game exposes for room selection and launch. Game-specific rules and UI are delivered
  separately.
- The current-and-previous-major browser support policy and a recorded operating-system
  matrix are required for acceptance.
- Room lifecycle, invitation validity, and post-recovery-window behavior must be decided
  before launch.
- Product and operational owners must confirm the conditions for host handoff or room
  closure.
- Real laptop, Android, and iPhone devices and participants able to exercise both roles are
  required for acceptance evidence.

## Open Decisions

None. Overall capacity was resolved on 2026-10-29 (20 concurrent rooms and 200 total
connected participants).
