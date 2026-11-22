# Feature Specification: Premium Active-Game Hub

**Feature Branch**: `009-premium-active-hub`

**Created**: 2026-11-22

**Status**: Draft

**Input**: User description: "Redesign the myArena host and player Hub landing pages to closely match the approved visual reference without changing gameplay or room behavior. Show only active, playable games; improve active-game artwork; fix the hidden role subtitle; and use a natural-looking rounded 3D Ludo die. Create a visual preview for approval before implementation."

## Clarifications

### Session 2026-11-22

- Q: Which games should count as active for this Hub redesign? → A: The Hub derives its visible cards from the catalog’s active status, including games added or changed to active in the future.
- Q: Which preview set should be approved before implementation starts? → A: Host and player previews at one representative desktop size and one representative phone size.
- Q: Should the role text be separate from the title image? → A: PLAYER HUB and HOST ARENA are separate live text labels rendered below the artwork.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Recognize the Host or Player Hub Immediately (Priority: P1)

As a host or player arriving on myArena, I can immediately understand which experience I entered and identify the appropriate primary action without visual ambiguity.

**Why this priority**: The Hub is the first screen for both major user paths. A clipped role label or unclear visual hierarchy can obscure whether the visitor should create a room or join one.

**Independent Test**: Open the player Hub and host Hub separately at the supported viewport matrix, confirm the complete role subtitle is visible, identify the primary action within 10 seconds, and verify the profile and audio controls remain accessible.

**Acceptance Scenarios**:

1. **Given** a player opens the normal Hub, **When** the page finishes loading, **Then** the complete live “PLAYER HUB” subtitle is visible below the title artwork and the room-code join action is the primary task.
2. **Given** a host opens `/host`, **When** the page finishes loading, **Then** the complete live “HOST ARENA” subtitle is visible below the title artwork and the available game-launch actions are the primary tasks.
3. **Given** either landing page is viewed on a supported viewport, **When** the title, role subtitle, profile control, and audio control are inspected, **Then** none is clipped, covered, overlapping, or hidden.
4. **Given** a user has reduced-motion enabled, **When** either landing page is viewed, **Then** the visual meaning, live role label, primary action, and state remain clear without decorative motion.

---

### User Story 2 - Choose Only from Active Games (Priority: P1)

As a visitor, I see only games that can actually be launched or joined now, so the Hub reflects real availability and does not imply that inactive games are usable.

**Why this priority**: Showing unavailable or “coming soon” tiles creates false expectations and competes with the supported room flows.

**Independent Test**: Compare the rendered Hub cards with the authoritative active-game inventory, confirm every rendered card is playable, confirm no inactive or coming-soon tile exists, and verify host and player card behaviors remain distinct.

**Acceptance Scenarios**:

1. **Given** the Hub catalog is rendered, **When** the visitor reviews all game cards, **Then** every displayed game is currently active and playable.
2. **Given** an unavailable, placeholder, or coming-soon game is known to the product catalog, **When** the Hub renders, **Then** that game does not appear as a tile, disabled tile, hidden tile, or coming-soon tile.
3. **Given** a host selects an active game card, **When** the launch action is used, **Then** the existing room-creation or game-launch flow begins without changing room or gameplay behavior.
4. **Given** a player views an active game card, **When** the card is inspected, **Then** it remains a non-interactive showcase and does not expose a room-creation action.
5. **Given** a game’s catalog availability changes or a new game is marked active, **When** the Hub is rendered afterward, **Then** its tile appears or disappears according to the current active status without leaving stale status messaging.

---

### User Story 3 - Experience a Premium, Game-Focused Visual Presentation (Priority: P2)

As a host or player, I experience a rich cosmic Hub with polished, dimensional game artwork that matches the approved reference and makes the destination feel energetic and premium.

**Why this priority**: The requested result depends on coherent visual quality across the whole page, not only a decorative title. Rich artwork improves perceived quality while preserving the existing functional flows.

**Independent Test**: Review approved host and player visual previews at one representative desktop size and one representative phone size, then inspect the implemented Hub in a browser at the full test matrix to confirm consistent title, background, controls, cards, artwork, and interaction states.

**Acceptance Scenarios**:

1. **Given** the approved crown title artwork is used, **When** the page renders, **Then** the title has no rectangular or oval/orbit border and retains its intended prominence and complete subtitle.
2. **Given** the full Hub is viewed, **When** the page is compared with the approved reference, **Then** the cosmic palette, luminous controls, dimensional cards, depth, and visual hierarchy form one coherent presentation.
3. **Given** each active game card is displayed, **When** its artwork is reviewed, **Then** the artwork is recognizable, polished, and visually consistent with the Hub rather than a flat placeholder.
4. **Given** the Ludo card or any Ludo marketing illustration is displayed, **When** its die is inspected, **Then** it appears as a natural six-sided die with believable perspective, visible faces, rounded or beveled edges, and correctly placed pips.
5. **Given** any active game card receives focus, hover, or touch feedback, **When** the interaction occurs, **Then** the response remains clear and readable without obscuring the game artwork or changing game state.
6. **Given** the required host-desktop, player-desktop, host-phone, and player-phone previews have not all been approved, **When** implementation is considered, **Then** production UI code and assets are not changed for this feature.

---

### User Story 4 - Retain Reliable Hub Workflows (Priority: P2)

As an existing host or player, I can continue creating or joining rooms without the visual redesign changing authorization, navigation, validation, or game behavior.

**Why this priority**: Visual quality must not regress the room entry and multiplayer flows already delivered.

**Independent Test**: Create a room through the host Hub, join it by code through the player Hub, verify active card behavior, and run the focused room-entry smoke scenarios.

**Acceptance Scenarios**:

1. **Given** a player is on the redesigned Hub, **When** the player enters a valid active room code, **Then** joining succeeds exactly as before and navigates to the authoritative game room.
2. **Given** a player submits an invalid or unavailable code, **When** the error is displayed, **Then** the field retains the input and presents a recoverable inline message.
3. **Given** a host opens the host Hub, **When** the host selects an active online or AI game option, **Then** the existing room-creation flow starts with unchanged permission checks.
4. **Given** a visitor attempts host-only behavior from the player Hub, **When** the action is attempted, **Then** no host creation control is exposed and room authority remains unchanged.
5. **Given** gameplay is started from the redesigned Hub, **When** Ludo or another game is played, **Then** rules, dice authority, turn transitions, movement, and winner behavior are unchanged.

### Edge Cases

- The role subtitle must remain completely readable when the available header width is narrow, when browser text scaling is increased, or when the title asset is constrained by orientation.
- A game cannot be displayed if it is inactive, unavailable, unfinished, or not currently launchable even if artwork exists for it.
- A valid active game with temporarily missing artwork must show a neutral visual fallback without exposing an inactive-game treatment.
- If a title or card image fails to load, the page must preserve accessible labels, primary actions, layout space, and readable text; a broken-image icon must not overlap controls.
- On compact landscape screens, the header may reduce decorative space but must retain the role subtitle and access to profile, audio, and the room-code form.
- On ultrawide screens, the title must remain visually centered and the active cards must make efficient use of space without stretching artwork or text beyond comfortable readability.
- Decorative particles and shine effects must stop or become static when reduced motion is requested.
- Ludo artwork must not show impossible die geometry, unreadable pip layouts, or pips whose faces conflict with the visible cube perspective.
- Host and player previews must use the same visual language but must display the correct role label and correct action set for the destination.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Hub MUST retain the approved crown-based “myArena Hub” title artwork as the primary visual identity, without role text embedded in the title image.
- **FR-002**: The title artwork MUST NOT use a rectangular frame or oval/orbit border around the title.
- **FR-003**: The title MUST remain broad enough to establish visual prominence while using less horizontal and vertical space than the original reference.
- **FR-004**: The player landing page MUST display the complete live text “PLAYER HUB” below and separate from the title artwork.
- **FR-005**: The host landing page MUST display the complete live text “HOST ARENA” below and separate from the title artwork.
- **FR-006**: Live role subtitles MUST remain fully visible, readable, accessible, and clearly separated from the title artwork, crown, surrounding effects, and room-entry content at every supported viewport.
- **FR-007**: The profile/avatar control MUST remain available at the left of the header and the audio control MUST remain available at the right of the header without obscuring the title.
- **FR-008**: The player Hub MUST preserve the existing room-code entry, validation, loading, retry, and successful-join behavior.
- **FR-009**: The host Hub MUST preserve existing active-game launch and room-creation behavior.
- **FR-010**: The Hub MUST derive its visible cards from the current authoritative game catalog and display only entries whose status is active and playable. A game MUST NOT be marked active in the catalog until approved artwork is available for that game; if a future active entry loads without approved artwork, its card may use the neutral fallback temporarily while preserving identity and behavior.
- **FR-011**: Inactive, placeholder, unavailable, and coming-soon games MUST be excluded entirely from the rendered Hub rather than shown as disabled or hidden cards.
- **FR-012**: Host mode MUST allow an active game tile to begin the existing launch or room-creation flow.
- **FR-013**: Player mode MUST present active game tiles as non-interactive showcases and MUST direct players toward room-code or shared-link joining.
- **FR-014**: Active-game cards MUST share a consistent premium visual treatment including dimensional artwork, luminous borders, readable titles, readable descriptions, status cues, and clear actions.
- **FR-015**: Ludo, Housie, Bingo, UNO, and every other displayed active game MUST use polished, recognizable artwork with consistent cosmic visual language.
- **FR-016**: The Ludo illustration MUST use a natural six-sided die with believable perspective, rounded or beveled edges, visible top and side faces, and logically placed pips.
- **FR-017**: Decorative Ludo artwork MUST NOT affect or imply control over authoritative dice results, turns, movement, or winner determination.
- **FR-018**: The title and game artwork MUST remain visually consistent between host and player experiences except for role-specific labeling and valid action controls.
- **FR-019**: The page MUST preserve keyboard navigation, visible focus, touch target usability, readable text, and accessible names for all interactive controls.
- **FR-020**: Decorative elements MUST respect reduced-motion preferences and MUST NOT be required to understand state, role, or available actions.
- **FR-021**: The layout MUST prevent horizontal overflow, clipped controls, overlapping content, unintended scrolling, or unreadable artwork across the supported responsive matrix.
- **FR-022**: The title, card artwork, and page controls MUST reserve visual space before loading so missing or delayed assets do not shift or obscure functional content.
- **FR-023**: If a visual asset fails to load, the Hub MUST preserve the associated game name, state, accessible label, and functional action or joining guidance.
- **FR-024**: This feature MUST NOT change host authorization, room authority, room lifecycle, joining rules, chat, game rules, dice authority, AI behavior, or game event timing.
- **FR-025**: Four visual previews MUST be created and explicitly approved before implementation begins: host desktop, player desktop, host phone, and player phone.
- **FR-026**: Production verification MUST confirm that the approved visual assets and role subtitles render successfully, the readiness endpoint is healthy, secure WebSocket connectivity succeeds, and an active room reconnects/resynchronizes after a deployment-relevant disconnect.

### Key Entities

- **Hub Experience Mode**: The destination-specific host or player presentation, including role label, primary action, and permitted game-card behavior.
- **Active Game**: A game currently available for launch or play; only active games may produce Hub cards.
- **Game Card**: A visual and accessible representation of one active game, including artwork, title, description, status, and mode-appropriate action or guidance.
- **Approved Title Asset**: The crown-based “myArena Hub” artwork; role subtitles are rendered separately as live text below it.
- **Visual Preview**: A proposed host or player landing-page rendering used for review and approval before implementation.
- **Ludo Die Artwork**: The dimensional six-sided die shown in Ludo promotional imagery, distinct from authoritative gameplay dice state.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In 100% of supported viewport checks, the complete PLAYER HUB or HOST ARENA subtitle is visible without clipping, covering, or overlap.
- **SC-002**: At least 95% of a sample of at least 5 host-side and 5 player-side reviewers identify the correct primary action within 10 seconds of the Hub becoming visible.
- **SC-003**: 100% of rendered Hub game cards correspond to the active-game inventory, with zero inactive or coming-soon tiles present.
- **SC-004**: Across the responsive test matrix, 100% of title, room-entry, profile, audio, and game-card controls remain visible and operable with no horizontal page overflow.
- **SC-005**: At least 90% of a sample of at least 10 reviewers rate the host and player Hub as visually energetic and at least 80% rate it as premium or polished.
- **SC-006**: At least 90% of the same sample of at least 10 reviewers identify the Ludo illustration as a natural, believable six-sided die, and 100% of tested art variations show logical pip placement on visible faces.
- **SC-007**: A player can submit and recover from room-code entry errors without leaving the Hub, and a valid room joins without additional actions beyond the established flow.
- **SC-008**: A host reaches the existing active-game launch flow without additional steps caused by the visual redesign.
- **SC-009**: All four required host/player desktop/phone previews are approved before implementation begins, and the implemented pages remain within the agreed visual direction.
- **SC-010**: Existing build and focused room-entry smoke verification complete successfully after the redesign, with no regression in host authorization or room joining.
- **SC-011**: In production verification, the host and player pages load their title and active-game assets successfully with zero missing-image or content-blocking errors; `/healthz` reports healthy, secure WebSocket connection succeeds, and an active room reconnects to authoritative state after disconnection.
- **SC-012**: Under a cold-cache browser profile throttled to 4G-class throughput and 150 ms added round-trip latency on a midrange desktop-class test machine, the hero and primary action become visually usable within 2.5 seconds, while below-the-fold artwork does not delay access to profile, audio, or room entry.

## Assumptions

- The approved visual reference remains the source of direction for the final host and player previews.
- The product’s existing game catalog remains the authoritative source of active status; this feature changes Hub visibility and presentation, not game availability rules.
- Current room joining, host authorization, room lifecycle, multiplayer, and gameplay behavior are correct and remain out of scope.
- Existing active games are available for showcase artwork; unavailable or incomplete games will not be added solely for visual variety.
- Browser-localized font rendering may vary slightly, but accessible readability and the approved visual hierarchy remain mandatory.
- A single preview may use representative artwork for review if the final assets preserve the approved composition, role, and quality.
- Enhanced graphics are achieved through appropriate visual assets and page composition rather than requiring a new application framework.
- Production asset delivery and browser security settings remain compatible with same-origin images and the existing deployment model.
- Approved active-game artwork is required before a new catalog entry is marked active; the neutral fallback handles only temporary delivery or loading failure.
