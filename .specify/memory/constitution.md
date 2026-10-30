<!--
Sync Impact Report (temporary; remove before commit)
- Version change: template (unversioned) -> 0.1.0 (initial DRAFT)
- Modified principles: none renamed; all five template slots replaced by 11 principles
- Added sections: Core Principles I-XI, Delivery Features, Platform & Experience Standards,
  Development Quality Gates, Governance (amendments, versioning, exceptions)
- Removed sections: none (template placeholder sections replaced)
- Deferred: TODO(RATIFICATION_DATE) - draft is not ratified
- Note: resolve-template.ps1 could not run (execution policy); the on-disk template was used.
-->
# myArena Hub Constitution

**Status: DRAFT. Not ratified, approved, implemented, or tested.**

myArena Hub is a browser-based multiplayer gaming platform for friends and families.

## Core Principles

### I. Account-Free Play
Players MUST be able to join and play using only a display name plus a private room code or
invite link. The platform MUST NOT require registration, email, or phone number to play.
Room codes and invite links MUST be unguessable enough to keep rooms private.
Rationale: friends and families want to start a game in seconds.

### II. Browser-First, Mixed-Device Support
The platform MUST work in current browsers on laptops, Android phones, and iPhones, and rooms
MUST support any mix of these devices at once. Native mobile apps are NOT required and MUST
NOT be needed for any feature.

### III. Two Room Roles, No Global Admin
Every room has exactly two roles: host/admin and player. The host manages the room (invites,
start, removal, settings) but MUST remain subject to the same game rules as every player.
A global or platform-wide administrator role MUST NOT be introduced. Host handoff MUST be
supported when the host leaves or is lost.

### IV. Server-Authoritative Gameplay
For online play the server MUST decide permissions, turn order, random results (dice, draws),
legal moves, claims, and winners. Clients MUST only submit intents and render server state.
Client-supplied outcomes MUST NOT be trusted. Solo modes MAY run locally under game rules.

### V. Security and Privacy
Member authentication, where offered, MUST be secure. Credentials, private information, game
state, recovery data, and production secrets MUST be protected, MUST NOT be committed to
source control, and MUST NOT appear in logs. Players MUST see only the information their
role and game rules permit. Secrets MUST be rotatable.

### VI. Reliable Reconnection
The system MUST distinguish temporary disconnection from intentional departure. A
disconnected participant MUST keep their seat, role, and state for a defined grace period and
MUST be restored on reconnect without losing game progress. Only an explicit leave action, or
expiry of the documented grace period, may release a seat.

### VII. Accessible, Responsive Interaction
All gameplay and room features MUST work with keyboard and touch input, honor reduced-motion
preferences, handle phone orientation changes, and survive background/resume without lost or
duplicated actions. Core flows MUST meet WCAG 2.2 AA contrast and focus requirements.

### VIII. Platform and Game Separation
The shared platform owns rooms, permissions, lobby, chat, transport, and recovery. Each game
owns its rules, state, presentation, and solo mode. Games MUST use platform contracts and
MUST NOT reimplement platform concerns; the platform MUST NOT contain game-specific rules.

### IX. Evidence-Based Delivery
Every feature MUST progress through requirements, prioritized user stories, acceptance
scenarios, traceable tasks, and automated or manual test evidence. Work MUST NOT be
described as done, tested, or certified without recorded evidence.

### X. Simple, Maintainable Architecture
Game rules, room management, transport, and presentation MUST have clear boundaries and be
testable independently. Complexity MUST be justified in writing; start with the simplest
design that satisfies the requirements.

### XI. Clean, Intuitive Design
The interface MUST be clean and immediately understandable, maximize usable screen space,
and provide both dark and light modes. 3D effects SHOULD be used where they aid clarity and
delight, but MUST NOT harm performance, legibility, accessibility, or reduced-motion users.

## Delivery Features

Each of the following is a separate delivery feature with its own specification, plan,
tasks, and evidence:
1. Base platform and experience
2. Ludo
3. Snakes & Ladders
4. 90-ball Tambola

Game features depend on the base platform contracts and MUST NOT block each other.

## Device Acceptance Requirements

- Each feature MUST be accepted on real hardware: a laptop, an Android phone, and an iPhone.
- Acceptance MUST cover both host and player roles, mixed-device rooms, and host handoff.
- Viewport or browser emulation MAY support development but MUST NOT count as mobile-device
  certification.
- Evidence MUST record device, OS, browser versions, tester, date, and scenario results.

## Development Quality Gates

- Specifications MUST contain requirements, prioritized stories, and acceptance scenarios
  before planning; plans MUST show compliance with this constitution.
- Tasks MUST trace to requirements and stories.
- Server-authoritative rules, reconnection, and permissions MUST have automated tests where
  practicable; remaining behavior MUST have documented manual evidence.
- Changes MUST pass review for security (Principle V), accessibility (VII), and boundary
  integrity (VIII, X).
- A feature is releasable only when device acceptance evidence exists for all required
  devices and roles.

## Governance

- This constitution supersedes other practices. All specs, plans, tasks, and reviews MUST
  verify compliance.
- **Amendments**: proposed in writing with rationale and impact on existing artifacts,
  reviewed by project maintainers, approved by consensus of maintainers, recorded with a
  version bump and a migration note for affected work.
- **Versioning**: semantic. MAJOR for incompatible removals or redefinitions of principles or
  governance; MINOR for new principles/sections or materially expanded guidance; PATCH for
  clarifications and wording fixes.
- **Exceptions**: a violation MUST be documented with the principle affected, justification,
  risk, mitigation, owner, and expiry or review date, and approved by maintainers. Exceptions
  MUST NOT waive Principles IV, V, or the real-device acceptance requirement without a
  constitutional amendment.
- **Compliance review**: performed at spec, plan, and pre-release stages.

**Version**: 0.1.0-draft | **Ratified**: TODO(RATIFICATION_DATE): pending approval; draft is not ratified | **Last Amended**: 2026-10-09
