# Feature Specification: Polish Gameplay Visuals

**Feature Branch**: `010-polish-gameplay-visuals`

**Created**: 2026-11-22

**Status**: Draft

**Input**: User description: "Improve Ludo die realism, Housie called-number visibility on phones, UNO final-card rules, Hub thumbnail proportions and responsiveness, and celebration confetti."

## Clarifications

### Session 2026-11-22

- Q: What should happen when a player legally plays a powercard as their last card? → A: Play the powercard normally, apply its effect, then automatically draw one replacement card so the player remains in the match.
- Q: Where should the additional confetti appear? → A: Increase confetti on every existing confetti surface: the Hub atmosphere and Ludo and UNO result screens.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Experience a Natural Ludo Roll (Priority: P1)

As a Ludo player, I want the die to look and move like a real six-sided object so that each roll feels physical, readable, and satisfying without changing the rolled result.

**Why this priority**: Dice rolling is a frequent core interaction, and unclear corners, pips, motion, or shadowing directly affects confidence in the game state.

**Independent Test**: Trigger controlled rolls for values 1 through 6 and confirm that every value finishes on a readable face with the expected pip pattern while the die uses a visibly rounded form, a physical tumble, and a shadow that tracks its movement.

**Acceptance Scenarios**:

1. **Given** a player can roll, **When** the authoritative roll result arrives, **Then** the die shows a natural multi-stage tumble and settles on the matching face.
2. **Given** the die is at rest on any of the six values, **When** a player views the die, **Then** each pip is dark, correctly placed, and visually distinct from the die surface.
3. **Given** the die lifts, tumbles, or lands during a roll, **When** its distance from the tray changes, **Then** its shadow changes position, size, and softness to support the apparent movement.
4. **Given** the user has requested reduced motion, **When** a roll occurs, **Then** the result remains clear through a short non-spinning state change without loss of outcome information.

---

### User Story 2 - Follow Housie Calls on a Phone (Priority: P1)

As a Housie player on a phone, I want recent called numbers to use the available width efficiently so that I can see as many complete numbers as possible at once and can still reach the complete call history.

**Why this priority**: Mobile players rely on recent calls to track the game, and clipped or partly occupied rows obscure useful information during active play.

**Independent Test**: Open a player match with a representative history of at least 30 called numbers at phone portrait and landscape sizes, and verify that the recent-number area fills at least two complete rows in portrait when space allows, shows whole chips without clipping, and retains access to every called number.

**Acceptance Scenarios**:

1. **Given** a phone player has at least 10 previous called numbers, **When** the player views the caller area in portrait orientation, **Then** the recent numbers use at least two complete, unclipped rows rather than a partial single-line strip.
2. **Given** a phone player has more numbers than fit in the recent-number area, **When** the player views that area, **Then** the newest readable numbers are prioritized and a clear path to the full history remains available.
3. **Given** the phone rotates or the window changes size, **When** the Housie layout reflows, **Then** the recent-number region recalculates its visible capacity without overlap, clipping, or hidden controls.
4. **Given** the player opens the complete called-number view, **When** the view is closed, **Then** focus returns to the initiating control and normal play remains available.

---

### User Story 3 - Win UNO with a Valid Final Card (Priority: P1)

As a UNO player, I want a match to end only when the winning player legally plays a valid non-power final card, while any last powercard resolves normally and leaves me with a replacement card.

**Why this priority**: The final-card rule affects winner determination and fairness for every match.

**Independent Test**: Reproduce a player holding only one action or wild card and confirm that the card's normal effect resolves, the player automatically receives one replacement card, and the match continues; then confirm that a legal non-power final card declares exactly one winner.

**Acceptance Scenarios**:

1. **Given** a player has one powercard remaining, **When** the player legally plays it as the final card, **Then** its normal effect resolves, the player receives one replacement card, and the player does not win.
2. **Given** a player has a normal numbered card as the final card and it is legally playable, **When** the player plays it, **Then** the player becomes the sole winner and all players receive the same result.
3. **Given** a player plays a powercard as the last card in the hand, **When** the effect and replacement draw finish, **Then** the player stays active and normal turn progression resumes.
4. **Given** a final-card attempt occurs in a two-client room, **When** the result is checked by both clients, **Then** neither client observes a transient or contradictory winner.

---

### User Story 4 - See Correct Responsive Game Art (Priority: P2)

As a player or host, I want game thumbnails to have accurate proportions and adapt to the browser dimensions so that the Hub looks polished, the Ludo board reads as a square, and no card artwork is cut off or distorted.

**Why this priority**: Thumbnail quality establishes confidence in the Hub and supports game selection across screen sizes.

**Independent Test**: Inspect the Hub at phone, tablet, desktop, and ultrawide sizes and verify that the Ludo board artwork is square and all active-game images resize fluidly without clipping, stretching, overlap, or horizontal scrolling.

**Acceptance Scenarios**:

1. **Given** the Ludo card is shown, **When** a player views its board artwork, **Then** the board occupies a visually square playing area with no stretched or incorrect silhouette.
2. **Given** any supported viewport size, **When** the Hub is loaded or resized, **Then** thumbnails use the largest practical card area without hiding the game title, description, status, or available action.
3. **Given** an artwork asset cannot be displayed, **When** the card renders, **Then** a neutral branded fallback preserves the card dimensions and does not imply a different game.
4. **Given** phone portrait or landscape layout, **When** cards reflow, **Then** text and touch targets remain readable and do not overlap artwork.

---

### User Story 5 - Enjoy Richer Celebrations (Priority: P3)

As a player, I want celebratory moments to feel energetic through denser confetti while retaining clear access to controls and result information.

**Why this priority**: Celebration polish increases delight after wins without affecting gameplay decisions.

**Independent Test**: Load the Hub and trigger representative Ludo and UNO result screens, then observe denser, varied confetti while controls and result text remain readable and reduced-motion mode replaces the animation with a static or minimal indication.

**Acceptance Scenarios**:

1. **Given** the Hub or a Ludo or UNO result screen is shown, **When** its existing confetti state is visible, **Then** more pieces appear across the viewport than in the previous treatment.
2. **Given** confetti is present, **When** a player reads or interacts with the result, **Then** essential content and controls are not obscured.
3. **Given** the user has requested reduced motion, **When** a celebratory state appears, **Then** moving confetti is omitted and the outcome remains clear through the result text and non-motion styling.
4. **Given** the celebration ends, **When** normal play resumes, **Then** transient decorative elements do not block interaction or remain over later screens.

### Edge Cases

- A Ludo roll is interrupted by resizing, tab switching, or reconnecting; the final value must still be shown correctly after the view returns.
- Multiple roll events arrive close together; stale animation must not leave the die on the wrong face.
- Housie has 0, 1, exactly 10, 30, or 90 called numbers; recent rows and full-history access must remain usable without partial empty-row controls.
- A Housie phone viewport is too narrow to show a complete two-row recent set; whole chips must take priority over forcing clipped additional columns.
- An UNO player attempts to finish with a powercard through normal play, a drawn-card play, or an automated player action.
- The replacement draw occurs after a final powercard with another pending effect, catch window, or turn reversal; the authoritative sequence must remain unambiguous and synchronized.
- The draw pile needs reshuffling when a replacement card is awarded after a final powercard; a valid match MUST supply exactly one replacement from the remaining deck or recyclable discard.
- If internal state cannot supply the guaranteed replacement, the match MUST NOT declare a winner and MUST fail safely into a resynchronizable authoritative state rather than silently leave an unexplained zero-card hand.
- A game thumbnail is missing or fails during a slow connection; the fallback must not change card dimensions or appear to depict another game.
- Confetti runs during a small phone viewport or reduced-motion mode; decorative density must not hide close buttons, winner text, or navigation.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Ludo die MUST depict a physically plausible six-sided form with rounded or beveled corners and visible face depth at rest and during rolls.
- **FR-002**: Every Ludo die face MUST use the correct 1-to-6 pip layout, with dark, high-contrast circular pips and consistent placement.
- **FR-003**: A Ludo roll MUST communicate lift, spin, bounce, deceleration, and a settling impact while resolving to the received roll value; animation MUST NOT determine or modify that value.
- **FR-004**: The Ludo die shadow MUST track the die's apparent height and travel and MUST return to a stable resting shadow after the animation.
- **FR-005**: Reduced-motion users MUST receive a clear, short result transition for Ludo rolls without continuous spin, blur, shake, or long-distance motion.
- **FR-006**: In the Housie player view, recent called numbers MUST use the available width to render as many complete number chips as practical, with at least two complete rows in phone portrait when ten or more prior numbers exist.
- **FR-007**: Housie called-number chips MUST remain whole and readable; they MUST NOT be cropped into partial rows, columns, or digits.
- **FR-008**: The Housie player view MUST retain access to the complete called-number history when more calls exist than can fit in the recent-number area.
- **FR-009**: Housie called-number layout MUST recalculate after viewport size, orientation, or available-region changes without overlap or stale hidden capacity.
- **FR-010**: The Housie full-history view MUST remain operable by keyboard and touch and MUST return focus to its initiating control when dismissed.
- **FR-011**: UNO powercards MUST be treated as Skip, Reverse, Draw Two, Wild, and Wild Draw Four for final-card validation.
- **FR-012**: When a player legally plays a powercard as the sole card in the hand, the game MUST apply that card's normal effect and MUST NOT declare that player the winner.
- **FR-013**: After a sole final powercard resolves, the player MUST automatically receive exactly one replacement card and remain active so normal turn and hand-management outcomes can continue; a valid match state MUST retain enough recyclable deck/discard content to satisfy this invariant.
- **FR-014**: UNO MUST declare a winner only after a player's last legally played card is a non-power numbered card, and all participants MUST agree on the single declared winner.
- **FR-015**: The Hub Ludo thumbnail MUST contain a recognizably square board with no distorted aspect ratio.
- **FR-016**: Hub game thumbnails MUST dynamically resize with the card and viewport while preserving aspect ratio and keeping titles, descriptions, badges, and actions visible.
- **FR-017**: Active-game thumbnail presentation MUST remain dimensionally stable while loading and MUST provide the approved neutral branded fallback if an asset fails.
- **FR-018**: The Hub atmosphere and Ludo and UNO result screens MUST provide a visibly denser, varied confetti treatment than their previous existing treatments.
- **FR-019**: Confetti MUST remain decorative, MUST NOT intercept input, and MUST NOT obscure winner information, primary actions, or navigation.
- **FR-020**: Confetti animation MUST be omitted or replaced with a stable celebratory treatment when reduced motion is requested.
- **FR-021**: Existing Ludo outcomes, turn authority, movement rules, Housie calling rules, and UNO rules other than the final-powercard restriction MUST remain unchanged.
- **FR-022**: All affected views MUST remain accessible and usable with touch, keyboard, and screen-reader controls at phone, tablet, desktop, and ultrawide sizes.

### Key Entities

- **Ludo Die Presentation**: A six-faced visual state carrying the current result, pip layout, physical roll phase, shadow, and reduced-motion presentation.
- **Housie Call History**: The ordered set of called numbers, the currently prioritized recent subset, and access to the full 90-number history.
- **UNO Card Class**: A card's classification as a numbered card or one of the defined powercards, used when validating whether a final-card move can win.
- **Hub Game Thumbnail**: Active-game artwork with a preserved shape, responsive display dimensions, and a neutral failure fallback.
- **Celebration State**: The transient visual response to a win or other celebratory outcome, including density, duration, readability, input safety, and reduced-motion behavior.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Controlled visual checks for Ludo values 1 through 6 produce the correct face 6 out of 6 times, with all expected pip positions visible and no final-face mismatch.
- **SC-002**: In the representative Ludo roll check, the die performs one visible lift-and-tumble sequence and at least three decaying landing or settling stages before the final face becomes stable, except in reduced-motion mode.
- **SC-003**: At a 320-by-568 viewport with at least 30 Housie calls, the recent-number area shows at least 10 complete number chips across at least two rows and retains a usable route to the complete history.
- **SC-004**: Housie recent calls and full-history controls produce zero clipped chips, overlapping controls, or horizontal page overflow across the defined responsive matrix.
- **SC-005**: 100% of automated or deterministic UNO final-play checks apply each of the five defined powercard classes without declaring a winner, award exactly one replacement card—including a forced-reshuffle case—and accept all legally playable numbered final cards.
- **SC-006**: Two-client UNO checks report one agreed winner, no contradictory winner, and no premature finish in every tested final-powercard scenario.
- **SC-007**: The Ludo thumbnail board has a 1:1 visible aspect ratio and none of the active-game thumbnails appear stretched, cropped beyond their intended artwork framing, or misidentified as another game.
- **SC-008**: Hub thumbnail, title, description, badge, and action checks pass with no clipping, overlap, or horizontal overflow at 320x568, 390x844, 640x360, 844x390, 768x1024, 1024x768, 1366x768, 1920x1080, and 2560x1440.
- **SC-009**: The Hub and each in-scope game result display at least 24 visible confetti pieces during the first two seconds on desktop and at least 16 on a 320-pixel-wide phone, while each surface exceeds its measured baseline count and never blocks primary controls or result text.
- **SC-010**: Reduced-motion verification shows zero animated or falling confetti and zero spinning, shaking, or traveling dice animation while preserving the same outcomes and status text.
- **SC-011**: The existing build and focused Ludo, Housie, UNO, room, and responsive smoke checks pass, with zero regressions in server-authoritative outcomes or reconnect behavior.

## Assumptions

- "Powercards" refers to the existing UNO action and wild categories: Skip, Reverse, Draw Two, Wild, and Wild Draw Four.
- A legal final powercard leaves the player's hand, resolves its normal effect, and results in exactly one automatic replacement card without declaring a win.
- A player with only powercards continues using existing rules; no new card-swapping or discard-selection system is introduced.
- Housie can show only a finite recent subset at once on small screens; "show as many as possible" means maximizing whole, readable chips while preserving access to the complete call history.
- Additional confetti applies only to the existing Hub atmosphere and Ludo and UNO result surfaces, not to every routine call, turn, room join, or menu interaction.
- No new game, room, host-authorization, or deployment behavior is introduced by this feature.
- Existing accessibility requirements, server-authoritative rules, and Render readiness checks remain in force.

## Constitution Compliance

- **Graphics-First Experience**: Rich dice movement, responsive called-number layouts, accurate thumbnail proportions, and energetic celebration visuals are explicit acceptance requirements.
- **Velocity and Pragmatic Verification**: Success depends on controlled value checks and immediate visual evidence across affected screens rather than broad unrelated test expansion.
- **Platform and Game Decoupling**: Hub thumbnail work remains platform-owned, while Ludo, Housie, and UNO presentation and rules remain localized to their game modules.
- **Server-Authoritative Real-Time Play**: Dice outcomes and UNO winner determination remain authoritative; visual animation and responsive presentation do not select outcomes.
- **Render-Ready Hosting**: The feature introduces no deployment contract change; affected flows still require production WebSocket and reconnect verification before production acceptance.
