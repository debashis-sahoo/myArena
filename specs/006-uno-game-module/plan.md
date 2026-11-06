# Implementation Plan: UNO Multi-Player & AI Game Module

**Branch**: `006-uno-game-module` | **Date**: 2026-11-05 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/006-uno-game-module/spec.md` (clarified on 2026-11-05: catch window, turn countdown, Wild Draw 4, same-kind stacking, "Play again")

## Summary

Add UNO as the fourth real game on the Platform Core and the first game that plays with bots in online rooms: 2 to 5 players, a standard 108-card deck shuffled and
dealt by the server, a table with a Draw Pile, a Discard Pile lit by an ambient aura in the active colour, glowing direction arrows that flip with a flare on a Reverse,
a fanned hand with tactile throws and draws, a four-colour wheel for Wild cards, a manual UNO! button with a 5-second "Catch" window, same-kind Draw 2 and Wild Draw 4
stacking, a 30-second turn countdown, and bots that wait 1.5 to 2 seconds and play by the same server rules as people.

Technical approach (details in [research.md](research.md)):

- **Rendering**: DOM, CSS and inline SVG; card faces and backs drawn by one `CardFace` component; throws, draws, shake and flare with the Web Animations API; the arrows,
  colour wheel and aura are SVG and CSS. No canvas, no 3D library, **no new dependencies**.
- **Authority**: the server owns the deck, every hand, both piles, turn, direction, active colour, pending penalty, UNO! status, catch window, timers, bots and the winner.
  Clients send six intents (`playCard`, `drawCard`, `keepCard`, `callUno`, `catchPlayer`, `playAgain`); no field exists for a card face, a result or a winner.
- **Hidden information**: hands are private, so there is **no broadcast of full state**. Every step is sent as one event per viewer (`emitTo` each human) carrying a public
  `table` snapshot (hand counts only) plus that viewer's own `you` block (hand, playable cards, drawn card). Opponents' cards and the Draw Pile order are never in any payload.
- **Cards**: ids 0 to 107 map to colour and value in `shared/`, so the client can draw any card it is told about and the server never sends faces it has not revealed.
  The server computes the playable list; the client never decides legality.
- **Platform**: three opt-in capabilities that other games can adopt, declared on the game definition (`launch.askCapacity`, `launch.startAiAtOnce`,
  `launch.hostFillWithAi`), one new host event (`room:fillAi`), one new field on `room:create` (`capacity`) and a raised bot ceiling in the schema. Rooms, invites,
  presence, host handover, reconnect, quiet chat and the universal wrapper are reused unchanged. Ludo, Housie and Bingo behave exactly as before. See
  [contracts/platform-integration.md](contracts/platform-integration.md).
- **Layout**: measured, space-filling regions with one seat-placement table for every orientation, a centre ring sized from the space left, and a hand arc that tightens
  with the card count; no page scroll from 320 to 2560 px. See [contracts/match-screen-layout.md](contracts/match-screen-layout.md).
- **Verification**: direct browser play recorded as evidence, scripted Socket.IO clients kept outside the repository for races and the privacy audit, development-only
  deal, bot-pause and countdown controls ignored in production; no new automated suites.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 22 LTS (server); React 19 + Vite (client). Same as the Platform Core, Ludo, Housie and Bingo

**Primary Dependencies**: Existing only (Express, Socket.IO, zod, pino, React, react-router). **No new dependencies**: animation uses the Web Animations API and CSS;
randomness uses `node:crypto`

**Storage**: In-memory match state per room (like rooms, Ludo, Housie and Bingo); no per-device preferences (the chat drawer starts closed). No database

**Testing**: No new automated suites (user policy and constitution Principle III). Browser-based play recorded in `verification.md`; scripted clients for races and the
privacy audit; development-only `UNO_DEV_DECK`, `UNO_DEV_BOT_MS`, `UNO_DEV_TURN_MS`, `UNO_DEV_FORGET`; existing `npm run smoke` extended by one assertion

**Target Platform**: Render.com web service (single instance, Linux, Node 22) serving modern browsers on phones, tablets and laptops

**Project Type**: Web application, one deployable (existing npm workspaces: `shared`, `server`, `client`)

**Performance Goals**: Every event reaches every player within 1 s of the move; bot action 1.5 to 2 s after its turn begins; throw 450 ms, draw flight 400 ms, shake
240 ms and reverse flare 600 ms at a smooth frame rate on a mid-range phone; re-fit within 0.5 s of resize or rotation; an event is under 2 KB

**Constraints**: No page scrolling at any size from 320 to 2560 px; hand slice at least 40 px for 7 cards at 320 px wide; text at least 11 px; production ignores all
development variables; Render plan limits (one instance, 512 MB) unchanged; no new required environment variables

**Scale/Scope**: Rooms of 2 to 5 seats, up to 4 bots each, 108-card deck; existing `MAX_ROOMS` 100 and `MAX_SOCKETS` guard apply; one countdown timer per human turn
plus one catch timer; about 30 events in a typical 4-player match

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design (below).*

Constitution: [.specify/memory/constitution.md](../../.specify/memory/constitution.md) v1.1.0.

| Principle / rule | Gate | Pre-research | Post-design evidence |
|------------------|------|--------------|----------------------|
| I. Repository and Render-ready hosting | No new services; config repository-relative; zero-downtime and `PORT` rules unchanged | PASS | No new required variables; dev variables are optional and ignored in production ([research.md](research.md) R14, R16); `render.yaml` unchanged |
| Runtime: restart behavior documented for active state | Active matches across restart are recovered or explicitly ended | PASS | Matches are in memory and end through the existing reconnect then "room ended" flow (R16; quickstart V13) |
| II. Graphics-first | Saturated palette, tactile states, glowing indicators, smooth effects, max screen use, orientation, safe areas, reduced motion | PASS | R1, R11, R12; [contracts/match-screen-layout.md](contracts/match-screen-layout.md): royal arcade look, throw and draw flights, colour aura, direction arrows with flare, measured fit with no page scroll, safe areas, reduced-motion table; spec FR-023 to FR-036 |
| III. Velocity and pragmatic verification | Minimize automated suites; manual smoke, deterministic checkpoints, visual checks with recorded evidence; controlled outcomes only in a development-only context without client control | PASS | No new suites; [quickstart.md](quickstart.md) V1 to V13; the dev deal and pace controls are server-side, ignored in production and not reachable from any client message (R14) |
| IV. Platform and game decoupling | Reuse rooms, presence, invites, host controls, chat; game owns board, rules, turns, AI; explicit contract; no duplicate chat | PASS (watch item below) | UNO reuses the room wrapper, lobby, invite bar, roster, chat panel and quiet chat. It owns the deck, rules, bots, table and results. The three shared capabilities it needs (ask capacity, start AI at once, host fills empty seats) are added to the platform, opt-in per game, not built inside UNO ([contracts/platform-integration.md](contracts/platform-integration.md)) |
| V. Server-authoritative real-time play | Backend validates state, outcomes, turns, winners; clients send intents; ordered broadcast; reconnect snapshot; AI through the same validation | PASS | Shuffle, deal, legality, effects, penalties, UNO! and catch, timers and the winner are server-only; bots call the same action functions as people ([research.md](research.md) R3, R6, R7); per-viewer events keep hands private (R4); private snapshot in join, create and resume acks; actions are ordered by arrival |
| Workflow: plans identify ownership, authority, Render implications, visual acceptance | Present | PASS | This table, the contracts, SC-010 to SC-012 |
| Workflow: UI checked at phone, tablet, desktop in both orientations with evidence | Planned | PASS | V9 and `verification.md` |
| Workflow: room-flow and multiplayer checks with two clients and reproducible checkpoints | Planned | PASS | V1 to V12 with the dev deal, scripted clients and the privacy audit |
| Workflow: deployment verified on Render; local checks not presented as deployment verification | Planned | PASS | V13 records Render results or marks them pending |

**Result**: No violations. Complexity Tracking is empty. One watch item: the platform changes touch shared paths (`GameDefinition`, `room:create`, `Room`, `RoomStore`,
the launch modal, `HostControls`, the action schema). Every change is opt-in or behavior-neutral for Ludo, Housie and Bingo, and V12 re-checks all three.

## Project Structure

### Documentation (this feature)

```text
specs/006-uno-game-module/
├── plan.md                         # This file
├── research.md                     # Phase 0 decisions R1 to R18
├── data-model.md                   # Phase 1 entities, card ids, rules tables, state machines, constants
├── quickstart.md                   # Phase 1 browser verification guide (V1 to V13)
├── contracts/
│   ├── uno-protocol.md             # game:action intents, per-viewer game:event, UnoView, guarantees
│   ├── platform-integration.md     # Platform changes: launch options, capacity, fill with AI, start at once
│   └── match-screen-layout.md      # Launch modal, lobby, match screen, sizing rules, motion, accessibility
├── checklists/
│   └── requirements.md             # Spec quality checklist
├── verification.md                 # Created during implementation (evidence)
└── tasks.md                        # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root; additions and changes only)

```text
shared/src/
├── games.ts                        # CHANGE: GameDefinition.launch options; uno entry (active, 2 to 5, default 4, AI, quietChat)
├── protocol.ts                     # CHANGE: EVENTS.ROOM_FILL_AI; CreateRoomPayload.capacity
├── index.ts                        # CHANGE: re-export ./uno/*
└── uno/                            # NEW
    ├── cards.ts                    # card ids 0..107, cardOf(), labels, colour helpers
    ├── timing.ts                   # constants: hand size, countdown, catch window, bot pauses, animation and settle times
    └── types.ts                    # UnoTable, UnoYou, UnoView, UnoEvent, UnoAction, standings

server/src/
├── games/
│   ├── registry.ts                 # CHANGE: register 'uno'
│   └── uno/                        # NEW
│       ├── deck.ts                 # 108-card deck, crypto shuffle, dev deal scenarios (R2, R14)
│       ├── rules.ts                # pure rules: playable, effects, next player, pending, start card, standings (R3)
│       ├── model.ts                # Match, Seat, CatchWindow types
│       ├── matchOps.ts             # deal, turn flow, play, draw, keep, UNO call, catch, timers, release, finish, per-viewer events, views
│       ├── bot.ts                  # bot decisions from own hand + public table only (R7)
│       └── engine.ts               # GameEngine wiring, action routing, again, dev warnings
├── rooms/
│   ├── room.ts                     # CHANGE: startNow(), fillWithBots(); bot naming continues across calls
│   └── roomStore.ts                # CHANGE: capacity for online rooms; start AI rooms at once when the game opts in
└── sockets/
    ├── schemas.ts                  # CHANGE: botCount max 4; capacity; union gains playCard, drawCard, keepCard, callUno, catchPlayer, playAgain
    └── registerHandlers.ts         # CHANGE: pass capacity; room:fillAi handler
server/scripts/smoke.ts             # CHANGE: one assertion: an UNO AI room starts at once and the ack carries a 7-card hand with no other hand

client/src/
├── art/UnoArt.tsx                  # NEW: hub tile art
├── components/
│   ├── hub/GameCard.tsx            # CHANGE: ART map gains uno
│   ├── launch/
│   │   ├── LaunchModal.tsx         # CHANGE: capacity step for games that ask for it
│   │   ├── AiOpponentPicker.tsx    # CHANGE: preselect defaultCapacity - 1; neutral wording
│   │   └── CapacityPicker.tsx      # NEW: 2 to max buttons, default capacity preselected
│   └── room/HostControls.tsx       # CHANGE: "Fill empty slots with AI" with a short confirmation (opt-in per game)
├── state/roomStore.ts              # CHANGE: createRoom(capacity?); fillWithAi()
└── games/
    ├── registry.ts                 # CHANGE: uno match screen; feed import
    └── uno/                        # NEW
        ├── UnoScreen.tsx           # match layout, header, overlays, chat placement, leave dialog
        ├── useFit.ts               # seat placement, centre ring plan, hand plan, chat mode
        ├── TableCenter.tsx         # piles, aura, arrows, pending badge, colour name
        ├── OpponentSeat.tsx        # avatar, name, bot marker, connection, turn ring, countdown, card-back fan, Catch button
        ├── Hand.tsx                # arc fan, hover and press lift, drag, keyboard, scroll fallback
        ├── CardFace.tsx            # card face and back (SVG and CSS), sized by prop
        ├── UnoControls.tsx         # UNO! button, Draw Pile action, Keep, status line
        ├── ColorWheel.tsx          # four-colour wheel dialog
        ├── ResultsOverlay.tsx      # winner, standings, Play again, Leave
        ├── TopLayer.tsx            # portal to document.body for banners, notices and seat flashes above the flight ghosts (R12)
        ├── UnoChat.tsx             # human-only chat: dock or header drawer; hidden in AI rooms
        ├── unoStore.ts             # feed + external store: committed view, event queue, notices, shake, local UNO arming
        ├── useUnoAnimator.ts       # consumes the queue in order and commits state after each animation
        ├── anim/                   # throw.ts, fly.ts, shake.ts, flare.ts
        └── uno.css                 # shared tokens, buttons, cards and effects (scope .un); each component keeps its own .css beside it

README.md                           # CHANGE: UNO section, development-only variables, "Fill empty slots with AI"
```

**Structure Decision**: UNO is added as a module on both sides of the existing three workspaces. What the server and client must agree on (card ids, types, constants) lives
once in `shared/src/uno/`; the server owns every decision; the client owns presentation, animation and the local UNO! arming hint. Platform files change only to add
opt-in capabilities that any game can use; no UNO rule enters them, keeping Principle IV intact.

## Phase Outputs

| Phase | Artifact | Status |
|-------|----------|--------|
| 0 | [research.md](research.md) | Complete, no open unknowns |
| 1 | [data-model.md](data-model.md) | Complete |
| 1 | [contracts/](contracts/) | Complete (3 contracts) |
| 1 | [quickstart.md](quickstart.md) | Complete |
| 2 | tasks.md | Not created here (`/speckit-tasks`) |

## Spec Coverage Map

| Spec area | Where addressed |
|-----------|-----------------|
| Launch modal, "Play with AI", "Play Online", capacity (FR-001 to FR-005, US1, US2; SC-001, SC-002) | R8; platform-integration; `LaunchModal.tsx`, `CapacityPicker.tsx`, `roomStore.ts` (server), `games.ts` |
| Online lobby, Start, Fill empty slots with AI (FR-006 to FR-010, US2) | R8; platform-integration; `HostControls.tsx`, `room.ts` `fillWithBots()`; the platform Lobby is reused |
| Deck, deal, legality, effects, stacking, draw, winner (FR-011 to FR-020, US3, US4; SC-003, SC-005, SC-006, SC-013, SC-020) | R2, R3, R5; data-model rules tables; `deck.ts`, `rules.ts`, `matchOps.ts` |
| Hidden hands (FR-021; SC-015) | R4; uno-protocol "Privacy"; quickstart V11 |
| Countdown and away handling (FR-022, FR-051 to FR-053, US9; SC-016) | R5, R15; `matchOps.ts` timers and release; quickstart V10 |
| Table layout and seats (FR-023 to FR-029, US6; SC-010 to SC-012) | R11; match-screen-layout; `useFit.ts`, `UnoScreen.tsx`, `OpponentSeat.tsx`, `Hand.tsx`, `TableCenter.tsx` |
| Motion, wheel, arrows (FR-030 to FR-036; SC-004, SC-006, SC-018, SC-019) | R1, R12; match-screen-layout "Motion"; `anim/`, `ColorWheel.tsx`, `useUnoAnimator.ts` |
| UNO! call and catch (FR-037 to FR-041, US5; SC-007, SC-008) | R6; data-model "UNO state machine"; `matchOps.ts`, `UnoControls.tsx`, `OpponentSeat.tsx` |
| Bots (FR-042 to FR-045, US7; SC-009) | R7; `bot.ts`, `matchOps.ts` |
| Chat (FR-046 to FR-048, US8; SC-014) | R10; `quietChat`; `UnoChat.tsx` |
| Results and Play again (FR-049, FR-050, US9; SC-013) | R9; `matchOps.ts` `again`, `ResultsOverlay.tsx` |
| Platform integration and deployment (FR-054 to FR-056) | R8, R14, R16; platform-integration.md |
| Out of scope | Money, scoring across rounds, challenge rules, other house rules, spectators, saved history, voice, more than 5 players, accounts, adding bots to a running match (spec Assumptions) |

## Decisions needing your review

These details were left open by the spec; the plan picks a default so tasks can proceed. Change the spec or plan if you disagree.

1. **A penalty is resolved for you when you cannot stack.** The spec says the next player may play a matching draw card or draw the total. When they hold no matching
   draw card, the server takes the cards for them after a short beat (0.9 s) instead of waiting for a tap on the Draw Pile (R5). Players who can stack always get the choice.
2. **Who starts.** Match 1 starts with the host (the dealer is the seat before the host), and each "Play again" moves the start one seat clockwise (R9). The starting card's
   effect applies as if the dealer played it.
3. **A pending penalty is cleared if its target leaves.** When the player facing a pending Draw 2 or Wild Draw 4 leaves or is removed, the penalty is cancelled rather than
   passed on to a bystander (R5).
4. **After a draw only the drawn card is playable.** With a playable drawn card the player may play that card or keep it; the rest of the hand is locked for that turn (R3).
5. **Stacking changes the active colour.** A stacked Draw 2 sets the active colour to its own colour; a stacked Wild Draw 4 uses the colour its player chooses (R3).
6. **Standings.** The winner is first, then the others by fewest cards left, with ties broken by seat order (data-model).
7. **Bot timing.** A bot catches an uncalled UNO! 2.0 to 3.5 seconds after it happens (after the human has a fair moment), and forgets to call about one time in six (R7).
8. **Shared capabilities.** The three opt-in launch capabilities and `room:fillAi` are generic platform features (any game can switch them on), not UNO-only code
   (R8). If you prefer them hidden inside UNO, the alternative and its cost are in R8.
9. **Seat tag colours** are orange, purple, teal, pink and lime, chosen so a player's ring is never mistaken for one of the four card colours (R13).
10. **Tall phones stack the piles.** In portrait the centre area is taller than wide, so the Draw Pile sits above the Discard Pile (instead of side by side) and the arrow track wraps
    both; this makes the piles and arrows fill 54% to 68% of the height (the budget table in the layout contract) and meets SC-011 literally. Wide centres keep the piles side by side (R11).
11. **Touch gestures** (R17): the spec's "dragging it onto the table plays" and "sliding off cancels" are reconciled as: releasing over the table plays, releasing back over the hand
    band cancels, and releasing on the same card plays.
