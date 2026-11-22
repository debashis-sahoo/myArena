# Feature Specification: Secure Host Access and Room Entry

**Feature Branch**: `main (feature directory: 008-secure-host-room-entry)`

**Created**: 2026-11-21

**Status**: Draft

**Input**: User description: "currently anyone can become a host. I want to restrict that to someone I specifically designate as the host of myArena, potentially with a host login separate from remote players. Remote players should be able to join by room number or shared URL. The player Hub should provide a private-room-number entry option. The host and player landing pages and individual game screens should be attractive, colorful, and high energy."

## Clarifications

### Session 2026-11-21

- Q: How should a person prove they are one of the specifically designated hosts? → A: For now, entering the dedicated `/host` URL designates the host entry.
- Q: What should a player enter when the host calls out the private room code? → A: A six-character uppercase alphanumeric code, such as `K7M2Q9`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Separate Host and Player Entry (Priority: P1)

As the myArena host, I need a dedicated host entry that is separate from the normal player Hub, so people I direct to the `/host` URL can create and control rooms while normal visitors enter as players.

**Why this priority**: This prevents the normal player landing page from presenting host controls and establishes a clear route for the current access model.

**Independent Test**: Open `/host` and verify host tools are available, then open the normal player Hub and a shared room URL and verify they do not present host controls.

**Acceptance Scenarios**:

1. **Given** a visitor enters the `/host` URL, **When** the host entry loads, **Then** the platform permits room creation and host controls.
2. **Given** a visitor enters the normal player Hub, **When** the Hub loads, **Then** the platform presents player actions without host controls.
3. **Given** a visitor enters the player Hub through a route other than `/host`, **When** it attempts a host-only visible action, **Then** that action is not available from the player experience.
4. **Given** a player has a shared room URL, **When** the player opens it, **Then** the player remains a player and does not gain host access because of the invite.

---

### User Story 2 - Join a Private Room by Code or Shared URL (Priority: P2)

As a remote player, I need to join a private room from either a room code announced by the host or a shared invite URL, so I can enter without coordinating a link exchange.

**Why this priority**: A simple entry method is the main path for remote participants and reduces the effort required to start a shared game.

**Independent Test**: From the player Hub, enter a valid active room code and join; separately open a shared invite URL and join the same room; verify invalid room codes produce a clear recoverable message.

**Acceptance Scenarios**:

1. **Given** an active private room and the player Hub, **When** a player enters the room code and submits it, **Then** the player is taken into the intended room's joining flow.
2. **Given** a valid shared room URL, **When** a player opens it, **Then** the player is taken into that room's joining flow without manually re-entering a room code.
3. **Given** a player enters a malformed, nonexistent, expired, suspended, closed, or unavailable room code, **When** the player submits it, **Then** it is treated as unavailable, no room is joined, and the Hub shows a clear message with a way to correct or retry the entry.
4. **Given** an active host has created a private room, **When** the host needs to invite players, **Then** the host can see and share both the room code and its corresponding invite URL.

---

### User Story 3 - Present a High-Energy Arrival and Play Experience (Priority: P3)

As a host or player, I want the landing and game screens to feel colorful, lively, and celebratory without distracting from the next action, so entering and playing in myArena feels energetic on any device.

**Why this priority**: Visual identity and immediate feedback directly support engagement, but they do not replace clear entry separation and reliable room entry.

**Independent Test**: Inspect host and player landing pages plus each supported game screen at phone, tablet, and desktop sizes, then verify participants can identify the primary action, room and turn state, and controls remain readable and usable with animation disabled.

**Acceptance Scenarios**:

1. **Given** a host or player opens the corresponding landing page, **When** the page is displayed, **Then** it uses a distinct, vibrant visual treatment and prominently presents the next relevant action.
2. **Given** a player enters a supported game screen, **When** a turn, selection, movement, or result changes, **Then** the screen provides energetic visual feedback that remains secondary to game state and controls.
3. **Given** a device has reduced-motion preferences enabled, **When** a game event occurs, **Then** the player receives an equivalent clear state indication without requiring animation.
4. **Given** the viewport is a phone, tablet, or desktop in either supported orientation, **When** content or available space changes, **Then** pages and game screens reflow without clipping, unintended overlap, or obscured primary controls.

### Edge Cases

- A player guesses or discovers the `/host` URL and gains the current host experience because no individual authorization check exists yet.
- A person navigates from `/host` to the player Hub or a shared room URL while retaining an existing session.
- A player submits the correct room code for a full, closed, expired, suspended, or no-longer-available room.
- A shared URL is incomplete, modified, points to a room that no longer exists, or contains extra unrelated data.
- A room code is pasted with surrounding spaces or in a different letter case from the host's displayed uppercase alphanumeric value.
- A player opens the same valid invite link repeatedly or attempts to join while already present in the room.
- Two people try to use the same invite while room availability is changing.
- A visually rich game state occurs on a very narrow screen, landscape phone, or device using reduced motion.
- Decorative visual effects fail to load or are disabled without preventing core room and game actions.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The platform MUST provide a dedicated `/host` URL as the host entry for the current release.
- **FR-002**: A visitor who enters through `/host` MUST be assigned the host experience for that visit.
- **FR-003**: The normal player Hub and shared room URLs MUST assign or preserve a player experience and MUST NOT expose host controls.
- **FR-004**: Host actions MUST remain limited to visitors who entered through the dedicated host experience.
- **FR-005**: The host URL MUST NOT be linked as a host action from the normal player experience.
- **FR-006**: Opening or using a room invite MUST NOT promote a player to host or transfer host control.
- **FR-007**: The player Hub MUST provide a prominent, keyboard- and touch-accessible field for entering a private room code.
- **FR-008**: A player MUST be able to begin joining the correct active private room by submitting its room code.
- **FR-009**: A player MUST be able to begin joining the correct room by opening its shared URL without manually entering the room code.
- **FR-010**: The platform MUST display six-character uppercase alphanumeric room codes, treat lowercase entry of the same letters as equivalent, and ignore surrounding spaces.
- **FR-011**: For an invalid, unavailable, closed, expired, suspended, full, or malformed room reference, the platform MUST treat expired and suspended rooms as unavailable, show a user-friendly explanation, and leave the player able to correct the entry or choose another path without losing the player Hub.
- **FR-012**: A host MUST be able to view and share both the room code and the corresponding invite URL after creating a private room.
- **FR-013**: Host entry, room creation, invite generation, and room-code joining MUST preserve the existing shared room behavior for all supported games rather than creating game-specific room access flows.
- **FR-014**: The room code and shared room URL MUST resolve to the same room and remain equivalent joining paths for the code's active lifetime.
- **FR-015**: Host and player landing pages MUST use distinct but coherent colorful visual treatments, saturated accents, clear hierarchy, and obvious primary actions.
- **FR-016**: Every supported individual game screen MUST continue the high-energy visual identity through state changes, active-turn indicators, selections, movements, and results.
- **FR-017**: Visual effects MUST reflect confirmed game or room events and MUST NOT obscure, delay, or determine the authoritative outcome.
- **FR-018**: Host and player landing pages and game screens MUST adapt to phone, tablet, and desktop viewports and supported orientation changes without unintended scrolling, clipping, overlap, or inaccessible controls.
- **FR-019**: Reduced-motion preferences MUST preserve equivalent visual state, outcome, and turn clarity without relying on animation.
- **FR-020**: Host and player actions MUST remain usable when decorative visual effects are unavailable or disabled.

### Key Entities *(include if feature involves data)*

- **Host Entry**: The dedicated `/host` URL that assigns the host experience for the current release.
- **Arena Session**: A visitor's current host or player experience, determined by the entry URL used.
- **Private Room**: An active or inactive game space with a room code, invite URL, allowed state, host, and participants.
- **Room Reference**: A six-character uppercase alphanumeric room code or the room's shared URL, either of which resolves to the intended room only when that room permits joining.
- **Room Invitation**: The shareable representation of a private room, intended to preserve or assign the player experience rather than host access.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of tested player Hub and shared room-entry routes do not display or expose host controls.
- **SC-002**: A visitor entering `/host` can reach the room-creation action in no more than 30 seconds, and at least 95% of first-time host visitors complete that task without assistance.
- **SC-003**: 100% of tested direct navigations between `/host`, the player Hub, and a shared room URL preserve the experience assigned by the destination route.
- **SC-004**: At least 95% of first-time remote players join an active room from a valid room code within 30 seconds.
- **SC-005**: At least 95% of first-time remote players join the intended active room from a valid shared URL without manually supplying a room code.
- **SC-006**: 100% of tested malformed, nonexistent, expired, suspended, closed, or full room references fail safely, treat expired and suspended rooms as unavailable, and provide a corrective path to the player.
- **SC-007**: At least 90% of representative users can identify the correct primary action on the host landing page, player landing page, and each supported game screen within 10 seconds of viewing it.
- **SC-008**: At least 80% of representative users rate the host landing page, player landing page, and game screens as energetic or highly energetic while also rating primary actions as easy to identify.
- **SC-009**: All affected screens pass visual and interaction review at representative phone, tablet, and desktop sizes, including portrait and landscape where supported, with no clipped primary controls, unintended horizontal scrolling, or game-content obstruction.
- **SC-010**: All critical room, turn, movement, and result states remain understandable to users in normal-motion and reduced-motion conditions, with no reliance on decorative effects alone.

## Assumptions

- For the current release, possession and use of the `/host` URL is the deliberate designation mechanism; personal host accounts and owner-managed access lists are deferred.
- The `/host` URL is shared only with intended hosts, but it does not provide a verified individual identity or an independently revocable designation.
- People directed to `/host` enter the host experience, but each room continues to follow the existing one-host-per-room model unless an individual game already specifies otherwise.
- Private room codes and invite URLs identify the same room and are intended for joining, not for changing a player session into a host session.
- Room codes are generated, unique among active rooms, and displayed in a six-character uppercase alphanumeric format that is practical to call out.
- Existing guest/player identity, room membership, chat, room lifecycle, and game-rule behavior remain in scope only where needed to support this feature.
- The visual redesign applies to both current landing experiences and all supported game screens, not to unrelated administrative tools.
- Standard browser accessibility, touch, pointer, responsive-layout, and reduced-motion behavior apply throughout this feature.
