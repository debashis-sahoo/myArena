# myArena Platform Constitution & Visual-First Governance

## Core Principles

### I. Repository and Render-Ready Hosting

The canonical source repository MUST be `https://github.com/debashis-sahoo/myArena.git`.
Production MUST target a Render.com Web Service with WebSocket support. Repository paths,
deployment configuration, build and start scripts, and environment-variable contracts MUST
work on Render without source edits or developer-machine assumptions. Deployment design MUST
support zero-downtime builds and readiness-gated replacement of the running service.

Rationale: A single, explicit hosting contract prevents local-only success and deployment drift.

### II. Graphics-First Experience

Aesthetics, responsive styling, and vibrant micro-interactions MUST be Tier-1 architectural
requirements and part of feature acceptance, not deferred polish. Interfaces MUST use rich,
saturated palettes, tactile button states, glowing active-turn indicators, and polished 2D game
boards. Games with dice MUST show animated dice rolls; moving tokens MUST have smooth movement
transitions. These effects MUST reflect authoritative game events, not determine their outcomes.

The complete experience MUST remain usable on mobile phones, tablets, and desktop browsers
without layout breakage, unintended overflow, overlapping controls, or obscured game content.
Interaction feedback MUST work for touch and pointer input. Reduced-motion preferences MUST
preserve clear turn, dice-result, and token-position feedback without requiring animation.

Layouts MUST make efficient use of the maximum available screen space for the device class
(laptop, desktop, tablet, or phone) and orientation (portrait or landscape). The game board MUST
scale to the largest size that fits the viewport without scrolling or clipping, and surrounding
elements (players, chat, controls, dice) MUST reflow to the remaining space for the current
orientation. Layouts MUST adapt when the device rotates or the window resizes, MUST respect
safe-area insets, and MUST NOT leave large unused areas, fixed-size boards, or desktop-only
layouts on smaller screens.

Rationale: Visual clarity, responsive interaction, and full use of the screen are core
properties of a playable game.

### III. Velocity and Pragmatic Verification

Early development MUST minimize automated unit and integration suites. Heavy mock harnesses,
blanket coverage targets, and test-first suite mandates MUST NOT block early implementation.
Each behavior change MUST instead receive a fast manual smoke check, deterministic game-state
checkpoints for affected rules, and immediate visual verification for affected UI.

Verification evidence MUST record the scenario, expected result, and observed result. A
checkpoint MUST identify a reproducible initial state and action sequence; dice scenarios MUST
use controlled outcomes in a development-only context without allowing production clients to
choose outcomes. Focused automated checks MAY be added when they are cheaper than repeated
manual checks or protect a demonstrated regression; their scope MUST match the affected risk.

Rationale: Lightweight, repeatable evidence preserves iteration speed without making correctness
or appearance optional.

### IV. Platform and Game Decoupling

The platform MUST own the `myArena Hub` landing page, guest player presence, private room
creation, shareable invite links at `/room/{gameId}/{roomId}`, host controls, and global in-room
chat shared by the room's participants. A universal room wrapper MUST own these shared room
capabilities, and game components MUST mount directly inside it.

Every game added to myArena MUST use these core platform capabilities, including player and room
management, presence, invitations, host controls, and the chat engine, through the universal room
wrapper. A game MUST NOT implement its own parallel room, player-session, or chat mechanism.
New platform capabilities that benefit multiple games MUST be added to the platform rather than
to an individual game.

Game modules MUST own localized board views, rules engines, turn transitions, and AI opponent
behavior. They MUST expose their game behavior through an explicit platform-to-game contract
without duplicating room, presence, invitation, host-control, or chat infrastructure. Backend
game modules MUST retain rule authority; a client board view MUST NOT become the rules authority.

Rationale: New games can reuse the same multiplayer experience without coupling platform
services to one game's board or rules.

### V. Server-Authoritative Real-Time Play

Real-time room communication MUST use WebSocket or Socket.io and work on Render. The backend
MUST validate game state, dice outcomes, player turns, and winner determinations. Clients MUST
submit action intents; they MUST NOT select dice results, advance turns, declare winners, or
replace authoritative state through unchecked client payloads.

The backend MUST validate room membership, applicable host permissions, turn ownership, and
move legality before accepting an action. Invalid or repeated actions MUST NOT produce illegal
state transitions. Accepted changes MUST be ordered and broadcast consistently to room members;
reconnecting clients MUST receive an authoritative snapshot before resuming play. AI actions
MUST pass through the same authoritative validation as human actions.

Rationale: One authoritative state prevents divergent boards and client-controlled outcomes.

## Runtime and Deployment Constraints

- Render configuration, such as `render.yaml`, a `Dockerfile`, or build and start scripts,
  MUST use repository-relative paths and documented environment variables. Required defaults
  MUST support deployment without modifying source; secrets MUST remain outside source control.
- The web process MUST bind to Render's supplied `PORT` on `0.0.0.0`. Production browser
  connections MUST use HTTPS and secure WebSockets, with compatible origin and proxy handling.
- Builds MUST NOT stop the active service. The replacement MUST pass a readiness check before
  receiving traffic, and shutdown MUST allow in-flight work to finish within the host's limits.
- Zero-downtime deployment MUST NOT be interpreted as a guarantee that every existing WebSocket
  survives service replacement. Clients MUST reconnect and resynchronize; deployment plans MUST
  document how active room state is recovered or explicitly ended across process replacement.
- Platform and game boundaries MUST be explicit in feature plans. A game-specific rule change
  MUST NOT require rewriting the universal room wrapper or shared room services.

## Development Workflow and Quality Gates

- Specifications and plans MUST identify applicable principles, platform versus game ownership,
  server-authoritative transitions, Render implications, and visual acceptance criteria before
  implementation begins.
- Each UI change MUST be inspected immediately in a browser. Before acceptance, affected views
  MUST be checked at phone, tablet, and desktop sizes, in both portrait and landscape where the
  device supports them, for readability, board fit, screen-space use, control access, overflow,
  and required interaction states; screenshots or recorded observations MUST accompany the
  change evidence.
- Room-flow changes MUST receive a manual smoke check covering Hub entry, guest presence,
  private room creation, invite-link joining, host controls, and shared in-room chat as affected.
- Multiplayer state changes MUST be checked with at least two clients and reproducible
  checkpoints, covering legal and illegal actions, turn agreement, dice-result agreement where
  applicable, winner agreement, and disconnect/reconnect synchronization as affected.
- Deployment changes MUST be verified on Render for startup, readiness, WebSocket connectivity,
  and replacement/reconnect behavior. Local-only checks MUST NOT be presented as deployment
  verification; unavailable verification MUST be recorded as pending.
- Reviews MUST reject unexplained constitutional violations and missing required smoke or visual
  evidence. Automated test volume MUST NOT substitute for these focused acceptance checks.

## Governance

This constitution takes precedence over conflicting project plans, implementation preferences,
and development guidance. Specifications, plans, tasks, and reviews MUST check compliance;
dependent templates and commands consume these rules at runtime rather than being rewritten by
the constitution workflow.

Amendments MUST document the proposed rule changes, rationale, affected workflows, and any
migration or exception requirements. The repository maintainer MUST approve an amendment before
it is adopted. Temporary exceptions MUST have explicit maintainer approval, a bounded scope, a
rationale, and an expiry or removal condition; silent exceptions are prohibited.

Constitution versions MUST follow semantic versioning: MAJOR for incompatible principle or
governance removals or redefinitions, MINOR for new principles or sections or materially expanded
guidance, and PATCH for non-semantic clarifications or corrections. Initial adoption is version
1.0.0. Every amendment MUST update the version and last-amended date, preserve the original
ratification date, and include a temporary Sync Impact Report for review. The report MUST be
removed before the amendment is committed and is not itself governance content.

Every feature review MUST record compliance with applicable principles and any approved
exceptions. Compliance MUST also be reviewed when changing game contracts, authoritative state
handling, deployment topology, or the early-development testing policy.

**Version**: 1.1.0 | **Ratified**: 2026-10-31 | **Last Amended**: 2026-11-01