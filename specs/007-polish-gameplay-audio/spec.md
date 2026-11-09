# Feature Specification: Gameplay Clarity and Audio Polish

**Feature Branch**: `main` (existing branch; no feature branch created)

**Created**: 2026-11-09

**Status**: Draft

**Input**: User description:

> ## Updates in Ludo
> - In the chat window, restrict systems messages only to some random humor messages only (generalized or specific to a user). Make it funny, random and encouraging to keep all players engaged. Other system messages can be parked in the Activity tab.
> - "Play again" re-deals at once with the same players in both modes, skipping the lobby.
>
> ## Updates in Housie
> - Housie card could look a bit more interesting... also should use space when available. In the mobile expereince numbers were not super clear. May be font size can also increase.
>
> ## Updates in UNO
> - In the multiplayer setup, make it clear whose turn it is. While playing the game, my expereince was not very intuitive to understand which player needed to play.
> - I shoudl be able to minimize chat window
> - Selecting card to present is not super seamless... I first need to tap and after sometime it moves to the play area.
>
> ## Core Platform
> - sound volume across all the games is very low, inspite of full volume in the device.
> - give me an option to also have a background music appropriate to the game being played. Both sound and music should be a toggle to swich on or off and its volume control. Music volument should generally be lower than the sound.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Know Whose UNO Turn It Is (Priority: P1)

As an online UNO player, I can immediately identify the player who must act, recognize my own turn, and distinguish waiting from a required colour choice or automatic penalty.

**Why this priority**: Unclear turn ownership prevents players from knowing when to play and slows the whole table.

**Independent Test**: Use two or more players to check ordinary turns, Skip, Reverse, draw penalties, Wild colour choice, and reconnect; ask each player who must act.

**Acceptance Scenarios**:

1. **Given** an online match is active, **When** any player looks at the table, **Then** a persistent turn label names the active player and that player's seat has a distinct active indicator; the local player sees "Your turn" when appropriate.
2. **Given** a turn changes through an ordinary play, Skip, Reverse, or completed penalty, **When** the next turn begins, **Then** every participant sees the same current player and no obsolete player remains highlighted.
3. **Given** a player must choose a Wild colour or a penalty is being taken automatically, **When** the table is waiting, **Then** the label describes that phase and its player without implying that another participant should play.
4. **Given** the screen is small, chat is expanded, sound is off, or reduced motion is enabled, **When** a turn changes, **Then** turn ownership remains visible and understandable without relying on colour, sound, or animation alone.
5. **Given** I reconnect during a match, **When** the current table is restored, **Then** its player, phase, countdown where applicable, and permitted actions agree before I can resume playing.

---

### User Story 2 - Play an UNO Card Without a Delayed Second Step (Priority: P1)

As an UNO player using touch, pointer, or keyboard, I can play a legal card with one activation, receive immediate feedback, and see it reach the discard pile without a selection pause.

**Why this priority**: Playing a card is the most repeated interaction and must feel direct without compromising move legality.

**Independent Test**: Play an ordinary legal card, play and cancel a Wild, attempt an illegal and out-of-turn play, and rapidly activate the same card twice in both modes.

**Acceptance Scenarios**:

1. **Given** it is my turn and an ordinary card is legal, **When** I tap, click, or activate that card once, **Then** the play begins without a second confirmation, long press, or deliberate selection dwell and immediate visual feedback acknowledges my input.
2. **Given** I play a Wild, **When** I activate it, **Then** the colour choice opens promptly; choosing a colour completes the play, while cancelling leaves the hand and turn unchanged.
3. **Given** a play is illegal, out of turn, or no longer valid after a turn change, **When** I attempt it, **Then** I receive a short reason and the card remains in or returns to my hand without an accepted discard or a changed turn.
4. **Given** a play is awaiting confirmation, **When** I activate it repeatedly, **Then** at most one play is accepted and the pending state remains understandable; a slow or interrupted connection never makes the card silently disappear.
5. **Given** dragging is already available, **When** I drag a legal card to the play area, **Then** it retains the same legality and feedback as single activation; reduced motion preserves clear input and completion feedback.

---

### User Story 3 - Read and Use a Better Housie Ticket (Priority: P1)

As a Housie player, I see a more engaging ticket with large, high-contrast numbers, clear marked and unmarked states, and a layout that uses available space on phones, tablets, and desktops.

**Why this priority**: Players cannot confidently follow calls or mark numbers if the ticket is hard to read.

**Independent Test**: Review tickets at 320, 390, 768, 1024, and 1440 pixel screen widths, rotate supported devices, and mark and unmark numbers while checking all other match controls.

**Acceptance Scenarios**:

1. **Given** I open my ticket on a narrow phone, **When** I inspect any number, **Then** all nine columns and three rows of the active ticket are visible without horizontal scrolling, number text is at least 18 pixels, and no number is clipped or hidden by decoration.
2. **Given** more space is available, **When** I resize or rotate the screen, **Then** the ticket and numbers grow until limited by the space needed for the ticket and essential controls, rather than remaining a small fixed-size card.
3. **Given** a cell is blank (no number), unmarked, or marked with my own ink cross, **When** I look at the ticket, **Then** I can distinguish these states without colour alone; number text has at least a 4.5:1 contrast ratio against its background in each state.
4. **Given** I have multiple tickets, **When** I navigate or follow calls, **Then** every ticket remains accessible and all existing numbers, manual marking (the game never marks numbers for me), claim rules, call history, and prizes remain unchanged.
5. **Given** I review the ticket's appearance, **When** I compare it with the current experience, **Then** its stronger hierarchy, ticket identity, and decorative details feel more engaging without covering cells or competing with number readability.

---

### User Story 4 - Replay Ludo Immediately With the Players Still Seated (Priority: P1)

As a Ludo host, I can select "Play again" after results and immediately start a fresh match with the players who are still at the table, without returning everyone to the lobby in either online or AI play.

**Why this priority**: Returning to setup interrupts a table that is already ready to continue.

**Independent Test**: Finish an online match and an AI match, start another game, compare participants and settings; repeat after a player leaves and while a player is disconnected; attempt duplicate and unauthorized replay requests.

**Acceptance Scenarios**:

1. **Given** a Ludo match has finished and every participant is still seated and connected, **When** the current host selects "Play again", **Then** a new match starts in the same room with the same human and computer participants, each keeping their seat and colour, with the same mode and applicable settings, without any lobby or additional Start action.
2. **Given** an AI match has finished, **When** its human host selects "Play again", **Then** the same computer opponents remain and a fresh board and turn sequence appear directly.
3. **Given** a new match starts, **When** players inspect it, **Then** all pawns are reset to their bases and the previous winner, dice result, turn timers, and consecutive-turn counters are cleared; the normal Ludo starting-player rule applies and the Activity tab records the new match boundary.
4. **Given** another participant requests replay, a replay is requested before the match ends, or the host activates replay twice, **When** the request is evaluated, **Then** existing host and match-state restrictions apply and at most one new match starts.
5. **Given** one or more participants have left since the match began and at least two remain, **When** the host selects "Play again", **Then** the new match starts with exactly the participants still seated, each keeping their seat and colour; the corners of those who left stay empty, nobody is recruited or substituted, the remaining players are numbered consecutively in their existing order, and the Activity entry for the new match names the players.
6. **Given** one or more participants have left, **When** the host looks at the results before replaying, **Then** the results show who will play in the next match, so the change in table is never a surprise.
7. **Given** fewer than two participants remain, **When** replay is requested, **Then** it is unavailable with a visible reason, and no match starts.
8. **Given** a seated human participant is temporarily disconnected, **When** replay is requested, **Then** it is blocked with a visible explanation until that participant returns or their seat is released (after which scenario 5 applies); it never silently drops a player or diverts everyone into a lobby.
9. **Given** I do not want another match, **When** I use the existing leave or return-to-Hub action, **Then** that option still works independently of replay.

---

### User Story 5 - Hear Games Clearly and Choose Optional Music (Priority: P1)

As a player in any supported game, I can hear sound effects comfortably, choose game-appropriate background music, and independently switch or adjust each audio channel without affecting other players.

**Why this priority**: Existing effects are difficult to hear, while separate controls make stronger audio and optional music usable in different environments.

**Independent Test**: In Ludo, Housie, Bingo, and UNO, trigger representative effects, toggle and adjust both channels, change games, replay, reload, and leave the room; compare preferences on two players' devices.

**Acceptance Scenarios**:

1. **Given** sound effects are enabled with their default volume, **When** representative game events occur on a device set to 50% volume in a quiet room, **Then** their cues are clearly audible without requiring maximum device volume and without audible distortion at maximum in-game volume.
2. **Given** I open the in-room audio controls, **When** I adjust sound or music, **Then** each has its own labelled on/off control and a volume control from 0 to 100%; adjusting or muting one does not change the other or another participant's preferences.
3. **Given** I have no saved preferences, **When** I enter a game, **Then** sound is enabled at 80% and music is disabled with a remembered 30% level; enabling music starts the theme for that game after any required user interaction.
4. **Given** both channels are enabled at their default levels, **When** a game cue occurs, **Then** background music is audibly quieter than the effect; I may deliberately choose a different balance through the independent volume controls.
5. **Given** music is enabled, **When** I switch between Ludo, Housie, Bingo, and UNO, **Then** the current game's distinct theme plays, previous music stops, and no overlapping themes accumulate on replay or reconnect.
6. **Given** I mute a channel, change games, replay, or reload on the same device, **When** I return to the controls, **Then** each channel's preference is retained; turning it back on restores its last nonzero volume rather than losing that setting.
7. **Given** I leave the room or the page is hidden, **When** the game is no longer foregrounded, **Then** its music stops or pauses; returning resumes only when music remains enabled and playback is permitted.
8. **Given** playback is blocked or music is unavailable, **When** I continue playing, **Then** the match remains fully usable and a visible audio status lets me retry where appropriate without a repeated prompt or an unexpected later burst of sound.

---

### User Story 6 - Keep Ludo Chat Social and Activity Informative (Priority: P2)

As a Ludo player, I read other players' messages and occasional playful encouragement in Chat, while routine match and room updates stay in Activity.

**Why this priority**: Separating social conversation from routine events reduces clutter without losing information needed to follow the game.

**Independent Test**: During active Ludo play, send player messages and trigger rolls, moves, captures, joins, departures, warnings, and a match end; inspect both tabs and a repeatable sequence of humor messages.

**Acceptance Scenarios**:

1. **Given** a routine game or room event occurs, **When** its system message is published, **Then** it appears in Activity with its time and relevant player, not in Chat; player-written messages still appear in Chat unchanged.
2. **Given** active play continues with Chat available, **When** an encouragement message is due, **Then** Chat receives a clearly identified system humor message selected at random from general and player-addressed encouragement, with no exact repeat among the previous five humor messages.
3. **Given** humor messages are scheduled, **When** play continues, **Then** they appear at randomized intervals of 45 to 90 seconds, never more than once in any 45-second period, and do not accumulate while the match is inactive or disconnected.
4. **Given** a message addresses a player, **When** it is shown, **Then** it uses only their public display name and harmless game context, remains encouraging, and avoids insults, sensitive traits, embarrassing comparisons, or invented claims about that person.
5. **Given** a player must act on an error, connection issue, or timer warning while Activity is hidden, **When** it occurs, **Then** the necessary status or warning remains visible outside Chat, and events the server knows about (another player's disconnect or reconnect, a warning, a removal) are also recorded in Activity; suppressing routine chat lines never hides critical feedback.

---

### User Story 7 - Minimize UNO Chat Without Losing Conversation (Priority: P2)

As an online UNO player, I can minimize and restore the shared chat panel to give the table more room while keeping unread messages and my draft.

**Why this priority**: Chat should remain available without obscuring the hand, turn indicator, or discard pile.

**Independent Test**: Minimize chat on desktop and phone, receive messages, rotate the device, restore chat, and confirm the conversation and a partially written message remain.

**Acceptance Scenarios**:

1. **Given** online UNO chat is expanded, **When** I activate its labelled minimize control, **Then** the panel collapses, the table uses the released space, and a visible restore control remains without covering game controls.
2. **Given** chat is minimized, **When** new player messages arrive, **Then** an unread indicator updates; restoring chat shows the retained history and draft and clears the read indicator once the new messages are viewed.
3. **Given** chat is minimized or expanded, **When** I rotate, resize, replay, or reload on the same device, **Then** the chosen state is retained and the hand, active-turn label, piles, and actions remain accessible.
4. **Given** I am playing UNO with AI, **When** I inspect the table, **Then** chat and chat restore controls remain absent as in the existing AI experience.

### Edge Cases

- A long or duplicate display name must not obscure UNO's turn label; the active seat indicator must distinguish players with identical names.
- Turn changes during a card gesture or pending play must reject stale actions, including when a timeout or automatic penalty advances play.
- Cancelling a Wild colour choice, touching two overlapping cards, and rapid repeat taps must not discard unintended or duplicate cards.
- Very slow or lost connections must show a pending or unavailable state, retain truthful hand contents, and restore the confirmed table before actions resume.
- A host change after results must transfer replay permission to the current host without changing seats or starting two matches.
- A Ludo participant who left cannot be recovered or replaced; replay continues with those still seated and their corners stay empty, as they already do during a match after a departure.
- A temporarily disconnected Ludo participant blocks replay until they return or their seat is released; existing reconnect deadlines remain unchanged.
- If the host left after the match ended, replay is controlled by the host the platform has since appointed.
- Multiple Housie tickets, two-digit numbers, marked cells, short landscape screens, safe-area insets, and enlarged text must retain access to ticket numbers and essential controls.
- Minimized chat must not lose draft text, reorder messages, or expand itself on each incoming message.
- Ludo humor stops after match completion and while the room is inactive; reconnect must not replay missed humor or duplicate scheduled messages.
- Audio at zero volume counts as muted; restoring a channel uses its last nonzero level, or its default if no such level exists.
- Audio permission refusal, unavailable preferences, a missing theme, rapid room changes, repeated replay, and repeated reconnect must not block play or leave duplicate music running.
- Reduced motion and muted audio must not remove turn, number-marking, pending-play, or warning information.

## Requirements *(mandatory)*

### Functional Requirements

**UNO Turn and Card Interaction**

- **FR-001**: Active UNO matches MUST show a persistent current-player label and a distinct indicator on the active seat; the local active player MUST see "Your turn". Turn cues MUST include text or a recognizable symbol, not colour alone.
- **FR-002**: UNO's current-player label, seat indicator, applicable timer, and permitted actions MUST agree across participants for ordinary turns, Skip, Reverse, penalties, colour selection, and reconnect; no actionable stale turn may be presented after resynchronization.
- **FR-003**: UNO MUST explicitly distinguish a player's required action from automatic penalty resolution and connection waiting, without assigning a false turn to another player.
- **FR-004**: A legal ordinary UNO card MUST begin playing after one tap, click, or keyboard activation with visible acknowledgement within 100 milliseconds; no second selection step or deliberate dwell may be required. Existing drag-to-play MUST remain available.
- **FR-005**: Wild cards MUST open colour selection on the first activation and commit only after a colour is chosen; cancellation MUST preserve the original hand and turn.
- **FR-006**: Every UNO play MUST remain subject to authoritative membership, turn, and card-legality decisions. Illegal or stale actions MUST NOT change the hand, discard pile, or turn; repeated activation of a valid play MUST commit at most once. Rejection MUST have a visible reason.
- **FR-007**: Pending UNO plays MUST be visually acknowledged without representing an unconfirmed card as accepted. Throw animations MUST complete within 400 milliseconds once play is confirmed and MUST NOT impose an additional delay before the next available action.

**Housie Tickets**

- **FR-008**: Housie tickets MUST have a more engaging visual hierarchy and decorative treatment that preserves the existing ticket structure and does not reduce number readability or obscure cells.
- **FR-009**: The active ticket MUST retain all nine columns and three rows without horizontal scrolling from 320 pixels wide, with number text at least 18 pixels on phones and at least 24 pixels at widths of 768 pixels or more when space permits.
- **FR-010**: Tickets MUST scale with available space and use at least 90% of their allocated width unless constrained by available height or readable access to essential controls; multiple-ticket layouts MUST use available space without making another ticket inaccessible.
- **FR-011**: Blank, unmarked, and marked cells MUST remain distinguishable without colour alone. Number text MUST maintain at least 4.5:1 contrast in every state; manual marking MUST remain usable by touch, pointer, and keyboard.
- **FR-012**: Housie ticket generation, number placement, manual marking (the game never marks a number for the player), claims, calling behavior, and prizes MUST remain unchanged.

**Ludo Replay**

- **FR-013**: The current host MUST be able to start a fresh Ludo match directly from finished results through "Play again" in both Play Online and Play with AI, without a lobby, extra Start action, or new invite link.
- **FR-014**: Ludo replay MUST preserve the room, every participant still seated, their human or computer identities, seats, colours, mode, and applicable settings while resetting match-specific state and following the existing starting-player rule. Participants who left MUST NOT be replaced, their corners MUST stay empty, and the remaining players MUST be numbered consecutively in their existing order.
- **FR-015**: Replay MUST obey current host permissions and completed-match eligibility, accept at most one transition per finished match, require at least two participants, and synchronize the fresh board and turn with all participants. Activity MUST distinguish the new match from the previous match and name the players taking part.
- **FR-016**: Replay MUST be blocked with a visible reason while a seated human participant is temporarily disconnected and when fewer than two participants remain; it MUST NOT recruit, substitute or recolour players. When participants have left, the host MUST be able to see who will play before starting the next match. Existing leave and return-to-Hub actions MUST remain available.

**Ludo Chat and Activity**

- **FR-017**: Ludo Chat MUST retain player-authored conversation and contain only playful encouragement as system-authored messages. Routine game, bot-action, room, presence, and result messages MUST appear in Activity instead.
- **FR-018**: Ludo Activity MUST preserve chronological system-event information, including time and relevant actor, while urgent errors, connection status, and actionable warnings MUST also remain visible outside Chat even when Activity is hidden.
- **FR-019**: Active Ludo play with Chat available MUST receive randomly selected humor at intervals of 45 to 90 seconds, capped at one message per 45 seconds and excluding exact repeats among the previous five messages. The selection MUST include at least five general and five player-addressed messages.
- **FR-020**: Player-addressed humor MUST use only public display names and harmless game context, remain encouraging, and exclude insults, sensitive personal traits, embarrassing comparisons, or unsupported personal claims. Humor MUST stop when play is inactive and MUST NOT build a reconnect backlog.

**Shared Chat Presentation**

- **FR-021**: Online UNO MUST provide accessible minimize and restore controls for the shared room chat at phone, tablet, and desktop sizes, reclaiming the collapsed panel's space without hiding the turn label, hand, piles, or game actions.
- **FR-022**: UNO chat minimization MUST preserve message order, retained history, drafts, unread indication, and the chosen presentation state across resize, rotation, replay, and same-device reload; viewing unread messages MUST clear their indicator. AI UNO MUST remain chat-free.

**Shared Audio**

- **FR-023**: All supported playable games MUST provide clearly audible, undistorted sound effects at the shared default volume without requiring maximum device volume; each game's existing meaningful cues MUST remain available.
- **FR-024**: Every supported game room MUST expose independent, accessible Sound and Music on/off controls and volume controls spanning 0 to 100%. Changes MUST take effect within one second and affect only the local player.
- **FR-025**: Unsaved audio preferences MUST default to Sound on at 80% and Music off with a remembered 30% level. At these levels, music when enabled MUST be audibly quieter than effects; deliberate user adjustments may override that balance.
- **FR-026**: Ludo, Housie, Bingo, and UNO MUST each provide a distinct game-appropriate background theme; themes MUST repeat without abrupt audible cuts, and previous game music MUST stop before another theme plays.
- **FR-027**: Sound and music preferences MUST be retained independently on the same device across games, replay, and reload. Muting or setting a channel to zero MUST silence it without losing its last nonzero setting; enabling it MUST restore that setting or the default.
- **FR-028**: Music MUST stop or pause when leaving a room or hiding the page and resume only if enabled and playback is permitted. Replay and reconnect MUST NOT start overlapping music or duplicate one-shot effects from past events.
- **FR-029**: Blocked or unavailable audio MUST NOT block gameplay; the player MUST receive a visible, non-repeating status with an appropriate retry control. Audio MUST respect user activation and saved mute settings without unexpected deferred playback. Preferences MUST still work for the current session when saving is unavailable.

**Cross-Game Quality and Ownership**

- **FR-030**: Shared chat presentation and audio controls/preferences MUST remain platform capabilities reused by games; Ludo humor and replay, Housie ticket presentation, and UNO turn/card behavior MUST remain game-specific. No parallel room, chat, player-session, or invitation experience may be introduced.
- **FR-031**: Updated views MUST remain usable from 320 to 2560 pixels wide, at phone, tablet, and desktop sizes and applicable orientations, without unintended page overflow, overlapping controls, or obscured essential game content. Resize and rotation MUST refit the affected layout within 0.5 seconds without changing game state.
- **FR-032**: New controls MUST be labelled and keyboard accessible with visible focus, and required information MUST remain available with sound off and reduced motion enabled. Visual game feedback MUST reflect confirmed game outcomes, not determine them.
- **FR-033**: Acceptance evidence MUST record initial state, action sequence, expected and observed outcomes, responsive visual checks, and at least two-player checks for affected online flows, including unauthorized/repeated actions and reconnect. Local checks MUST NOT be represented as proof of hosted compatibility.

### Key Entities *(include if feature involves data)*

- **Turn Presentation**: The current UNO player's seat and display name, whether that player is local, the current action phase, and any applicable countdown; reflects confirmed match state.
- **Card Play Attempt**: The acting player, selected card, optional chosen colour, and pending, accepted, cancelled, or rejected outcome; relates to a single UNO turn and must not cause duplicate plays.
- **Ticket Presentation**: A Housie ticket's identity, unchanged number grid, the player's own marking states, and available display space.
- **Replay Table**: The finished Ludo match's room and the participants still seated (with their seats, colours, human or computer identity, and connection state), the mode and settings, together with current host permission and readiness to start exactly one fresh match.
- **Room Message**: A player chat message, humor message, or Activity event, with origin, time, and relevant public actor; its category determines where it is shown.
- **Chat Presentation Preference**: The local device's expanded or minimized UNO chat state; conversation, draft, and unread status remain available independently of visibility.
- **Audio Preference**: The local player's independently enabled sound and music channels, current volumes, and last nonzero volumes; shared across games on the same device.
- **Game Music Theme**: A background theme associated with a supported game, its foreground playback status, and the local player's music preference.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: At least 4 of 5 first-time reviewers correctly identify who must act within two seconds in each of ten staged UNO situations, including Skip, Reverse, colour selection, and automatic penalties, without spoken guidance. All participating screens agree on the active player and phase.
- **SC-002**: Across 20 legal ordinary UNO plays split between touch and pointer input, every play requires one activation, acknowledgement appears within 100 milliseconds, and the confirmed card reaches the discard pile within one second on a stable connection. Ten illegal, stale, or repeated attempts produce zero incorrect or duplicate plays; Wild cancellation preserves state.
- **SC-003**: At each reference width of 320, 390, 768, 1024, and 1440 pixels and applicable orientations, every active Housie ticket number is visible without horizontal scrolling and meets the specified text-size and contrast thresholds. At least 4 of 5 reviewers correctly read ten sampled numbers and distinguish their marking states without zoom, and rate the ticket more engaging than the previous view.
- **SC-004**: In five eligible replay trials per Ludo mode, one host action produces a fresh match for all participants within two seconds on a stable connection, preserves the table and settings, and never shows a lobby. Unauthorized, premature, and duplicate trials yield zero incorrect starts; a trial after a participant left starts a match with exactly the participants still seated, keeping their seats and colours; a trial with a disconnected participant is blocked until they return or are released; a trial with fewer than two participants is refused.
- **SC-005**: In a ten-minute active Ludo chat checkpoint, zero routine system events appear in Chat, every triggered routine event appears in Activity, and all player messages remain visible in Chat. Humor follows the 45-to-90-second interval and five-message non-repeat rules, and at least 4 of 5 reviewers rate the sample messages both encouraging and amusing.
- **SC-006**: In ten UNO chat minimize/restore cycles, including incoming messages, resize, rotation, replay, and reload, there are zero lost drafts or retained messages, unread indicators remain accurate, and no essential game control becomes inaccessible. A player can minimize or restore with one activation.
- **SC-007**: For three representative effects in each of Ludo, Housie, Bingo, and UNO, at least 4 of 5 listeners can hear every cue clearly at default Sound volume and 50% device volume in a quiet room on a reference phone and laptop. No audible distortion occurs at maximum in-game volume, and at least 4 of 5 listeners rate default-enabled music quieter than those cues.
- **SC-008**: In each supported game, both channels switch and adjust independently within one second, mute and 0% volume are silent, and preferences survive game changes, replay, and reload in every checkpoint. Ten leave, hide/return, reconnect, and rapid-switch trials produce zero overlapping themes or unexpected muted playback; at least 4 of 5 listeners rate each distinct theme appropriate for its game.
- **SC-009**: Every affected view passes the recorded phone, tablet, and desktop visual checks in applicable orientations from 320 to 2560 pixels wide, with zero unintended overflow, obscured essential content, or overlapping controls. Refit completes within 0.5 seconds, and all required information and controls remain usable with reduced motion, muted audio, and keyboard input.

## Assumptions

- This is one bounded polish feature covering Ludo, Housie, UNO, and platform audio; Bingo receives shared audio improvements but no rule or board changes. Placeholder or unavailable games do not require music themes.
- The feature builds on the existing platform, Ludo, Housie, visual-polish, Bingo, and UNO specifications. This specification supersedes the original Ludo exclusion of rematches and the earlier requirement for routine bot commentary in Chat; gameplay rules otherwise remain unchanged. It reinforces UNO's already specified single-activation play rather than adding a new card-selection rule.
- "Both modes" means Play Online and Play with AI. "Re-deal" means resetting a Ludo board and match state, not dealing cards. Existing host permissions govern replay; no new player-voting or consent flow is introduced.
- "Same players" means every participant of the finished match who is still seated, as UNO's "Play again" already works. There is no recruitment, silent replacement, or recovery of released seats. Each remaining player keeps their seat and colour, because chat tags, player lists and avatars already use those colours; this can leave empty corners or two adjacent corners in use, which the board already supports after a departure mid-match, and is accepted rather than recolouring players. A match needs at least two participants. Temporary disconnection blocks replay only until the participant returns or their seat is released; reconnect deadlines remain unchanged.
- Ludo's routine room lines (joined, left, host changed) stay in Chat before a match starts, because the pre-match lobby has no Activity view; the chat/activity separation applies from the moment a match is running, including after "Play again".
- Ludo humor is occasional room-visible encouragement during active play where Chat is available, not a live conversational assistant. Its public-name personalization and variety rules are sufficient; personality profiling and external personal information are out of scope. AI-only rooms do not gain a new chat panel.
- UNO chat minimization is presentation of the existing shared room chat, not a new chat system. The preference is local to the device; cross-device synchronization and additional changes to other games' chat layouts are out of scope.
- Sound effects remain enabled by default; music is opt-in to avoid surprising players. The 80% Sound and 30% Music defaults are starting user-facing levels, with audibility and relative-loudness criteria taking precedence over assuming percentages alone guarantee loudness. Existing saved mute and volume choices are respected.
- Audio preferences are local-device choices shared across games, not room-wide host settings. Theme selection follows the current game automatically; a music library, track picker, user uploads, and a Hub soundtrack are out of scope. Themes must be suitable for casual group play and cleared for use.
- The existing ticket structure and manual marking remain authoritative. Decorative styling must support the product's vibrant game identity while giving numbers and marking states priority. Normal-size layout checks do not remove enlarged-text access requirements.
- Applicable governance requires graphics-first responsive acceptance, shared-platform ownership of chat and audio, authoritative game decisions, reproducible smoke checkpoints, and multiplayer reconnect checks. This specification introduces no hosting-topology or deployment-contract changes; compatibility with the existing production hosting contract must be preserved, with hosted verification recorded separately from local evidence during implementation.
- The listed timings assume a stable connection and foreground play; slower connections require immediate acknowledgement and truthful pending status, not a false accepted move or bypassed validation. Reviewer/listener samples and reference devices must be identified in acceptance evidence. Success criteria are release targets, not claims that implementation or verification has already occurred.