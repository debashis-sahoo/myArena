# Implementation Plan: Gameplay Clarity and Audio Polish

**Branch**: `main` (existing branch; no feature branch created) | **Date**: 2026-11-09 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/007-polish-gameplay-audio/spec.md`

## Summary

One polish release across the Platform Core and three games, with no new game and no rule change:

- **Platform audio** (all games): one shared audio path with a master limiter and two buses (Sound and Music), levels recalibrated so effects are clearly audible at the default,
  independent on/off and 0 to 100 volume controls per channel, preferences kept on the device, and an opt-in background theme per game (Ludo, Housie, Bingo, UNO) generated in the
  browser. The controls appear in every room screen header.
- **Ludo**: system lines leave Chat for the Activity tab, with Chat keeping only people's messages plus occasional server-picked humor (general and addressed to a player); a host-only
  "Play again" starts a fresh match at once with the players still seated (their seats and colours kept).
- **UNO**: a persistent turn strip and seat marker that say who must act and what they must do; a staged "held then thrown" card play that acknowledges a tap at once; a minimize and
  restore control for chat that keeps the draft and unread count.
- **Housie**: a livelier ticket with number-range column tints, a header ribbon, bigger numbers (at least 18 px on phones and 24 px from 768 px wide) and a planner that uses the space
  it is given.

Technical approach (decisions and alternatives are in [research.md](research.md)):

- **No new dependencies and no binary assets.** Audio is Web Audio synthesis (effects already are; music themes are generated from small pattern tables). Rendering stays DOM, CSS
  and SVG.
- **Authority unchanged.** Ludo replay, humor selection and its timing are server-side; every `playAgain` is validated for host, finished state, at least two players and connected humans. The UNO
  hold is feedback only: the hand, discard pile and turn change only when the server's event arrives, and a refusal returns the card. The UNO turn label is derived from the table the
  server already sends; no UNO protocol change.
- **Platform versus game.** Platform: audio engine, preferences and controls, chat draft and minimize preferences, the new chat-routing hook, the `isConnected` and `humor` additions. Ludo:
  replay, humor pool and schedule, Activity kinds. UNO: turn strip, staged play, rail layout. Housie: ticket presentation. See
  [contracts/platform-extensions.md](contracts/platform-extensions.md).
- **Verification**: browser evidence at phone, tablet and desktop sizes, two-client scripted checks outside the repository, an offline loudness meter for the audio levels, and recorded
  listener checks; no new automated suites.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 22 LTS (server); React 19 + Vite (client). Same as the Platform Core and the four games

**Primary Dependencies**: Existing only (Express, Socket.IO, zod, pino, React, react-router). **No new dependencies**; no audio files, fonts or images are added

**Storage**: Server: in-memory match state only (Ludo gains a match counter, a humor timer and recent-message memory). Client: `localStorage` keys `myarena.audio.v1` (audio preferences)
and `myarena.chat.uno` (chat minimized or open); the chat draft lives in memory for the session. No database

**Testing**: No new automated suites (user policy, constitution Principle III). Browser play recorded in `verification.md`; scripted Socket.IO clients for replay, routing and reconnect;
an `OfflineAudioContext` meter for loudness; development-only `LUDO_DEV_HUMOR_MS` (ignored in production); existing `npm run smoke` unchanged

**Target Platform**: Render.com web service (single instance, Linux, Node 22) serving modern browsers on phones, tablets and laptops

**Project Type**: Web application, one deployable (existing npm workspaces: `shared`, `server`, `client`)

**Performance Goals**: Visible acknowledgement of a UNO card activation within 100 ms; a confirmed play lands within 300 ms of the server event; Ludo replay reaches every screen within 2 s; audio control
changes take effect within 1 s; theme change within 1 s; music uses at most four simultaneous voices (budget for a mid-range phone); resize or rotation re-fit within 0.5 s

**Constraints**: No page scrolling at any size from 320 to 2560 px; Housie numbers at least 18 px on phones and 24 px from 768 px wide; contrast at least 4.5:1 for ticket numbers; no
required environment variables added; production ignores the development humor variable; Render plan limits unchanged

**Scale/Scope**: Four games, nine requested updates; roughly 25 new or changed client files, 8 server and shared files; no change to room limits, capacities or the wire protocol of UNO,
Housie or Bingo

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design (below).*

Constitution: [.specify/memory/constitution.md](../../.specify/memory/constitution.md) v1.1.0.

| Principle / rule | Gate | Pre-research | Post-design evidence |
|------------------|------|--------------|----------------------|
| I. Repository and Render-ready hosting | No new services; config repository-relative; zero-downtime and `PORT` rules unchanged | PASS | No new required variables, services or assets; `LUDO_DEV_HUMOR_MS` is optional and ignored in production ([research.md](research.md) R8); `render.yaml` unchanged |
| Runtime: restart behavior documented for active state | Active matches across restart are recovered or explicitly ended | PASS | Replay and humor state live in the in-memory match and end with the room through the existing reconnect then "room ended" flow; audio and chat preferences are on the device ([research.md](research.md) R14) |
| II. Graphics-first | Saturated palette, tactile states, glowing indicators, smooth effects, max screen use, orientation, safe areas, reduced motion | PASS | UNO turn strip with glow, held-card lift and throw; Housie column tints, ribbon and space-filling planner; audio popover with large targets; reduced-motion and non-colour cues for every new state ([contracts/uno-turn-play-chat.md](contracts/uno-turn-play-chat.md), [contracts/housie-ticket-layout.md](contracts/housie-ticket-layout.md)) |
| III. Velocity and pragmatic verification | Minimize automated suites; manual smoke, deterministic checkpoints, visual checks with recorded evidence; controlled outcomes only in a development-only context | PASS | No new suites; [quickstart.md](quickstart.md) V1 to V13; the only development control (`LUDO_DEV_HUMOR_MS`) shortens a timer, cannot select outcomes and is ignored in production |
| IV. Platform and game decoupling | Reuse rooms, presence, invites, host controls and chat; game owns board, rules, turns, AI; explicit contract; no duplicate chat | PASS (watch item below) | Audio engine, preferences, controls, chat draft and minimize preference, and the engine hook for routine room lines are platform; replay, humor, turn strip, staged play and ticket presentation stay in their games ([contracts/platform-extensions.md](contracts/platform-extensions.md)). UNO's chat uses the platform `ChatPanel`; no parallel chat is built |
| V. Server-authoritative real-time play | Backend validates state, outcomes, turns, winners; clients send intents; ordered broadcast; reconnect snapshot; AI through the same validation | PASS | Ludo `playAgain` is an intent checked for host, finished state, at least two players and connected humans; humor text, timing and addressee are chosen on the server; the UNO hold changes no state and the existing single-flight and server legality checks still decide every play ([research.md](research.md) R9, R11) |
| Workflow: plans identify ownership, authority, Render implications, visual acceptance | Present | PASS | This table, the five contracts, SC-001 to SC-009 mapped in [quickstart.md](quickstart.md) |
| Workflow: UI checked at phone, tablet, desktop in both orientations with evidence | Planned | PASS | V1 to V11 and `verification.md` |
| Workflow: room-flow and multiplayer checks with two clients and reproducible checkpoints | Planned | PASS | V5 to V9 use two clients, the dev humor timer and scripted cases |
| Workflow: deployment verified on Render; local checks not presented as deployment verification | Planned | PASS | V13 records Render results or marks them pending |

**Result**: No violations. Complexity Tracking is empty. Two watch items:

1. Housie already keeps its own chat minimize preference (`client/src/games/housie/ChatDock.tsx`, key `myarena.housie.chat`). This feature adds a platform preference for UNO and leaves
   Housie's untouched so Housie behavior cannot regress; moving Housie onto the platform preference is a recommended follow-up, not part of this plan.
2. The routine-room-line hook (`GameEngine.onRoomNotice`) touches the shared `Room.announce` path. It is a no-op for every game that does not implement it, so Housie, Bingo and UNO
   behave exactly as before (re-checked in V12).

## Project Structure

### Documentation (this feature)

```text
specs/007-polish-gameplay-audio/
├── plan.md                              # This file
├── research.md                          # Phase 0 decisions R1 to R14
├── data-model.md                        # Phase 1 entities, preference schema, state tables, constants
├── quickstart.md                        # Phase 1 verification guide (V1 to V13)
├── contracts/
│   ├── platform-extensions.md           # GameContext, GameEngine hook, SystemCode, chat preference and draft stores
│   ├── audio-platform.md                # Preferences, controls, status, music lifecycle, levels, themes
│   ├── ludo-replay-chat-protocol.md     # playAgain, eligibility, events, Activity kinds, humor rules
│   ├── uno-turn-play-chat.md            # Turn derivation, turn strip, staged play, chat minimize and rail
│   └── housie-ticket-layout.md          # Planner rules, type scale, states, anatomy
├── checklists/
│   └── requirements.md                  # Spec quality checklist
├── verification.md                      # Created during implementation (evidence)
└── tasks.md                             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root; additions and changes only)

```text
shared/src/
├── protocol.ts                          # CHANGE: SystemCode gains 'humor'
├── games.ts                             # CHANGE: ludo entry gains quietChat: true
├── ludo/types.ts                        # CHANGE: LudoAction gains playAgain; ActivityKind gains 'room' and 'match'; LudoEvent gains 'notice'
└── uno/timing.ts                        # CHANGE: adds UNO_HOLD_LIFT_MS, UNO_HOLD_FRACTION, UNO_FINISH_THROW_MS, UNO_RETURN_MS and UNO_HOLD_TIMEOUT_MS; UNO_THROW_MS stays 450 (server settle times use it)

server/src/
├── games/
│   ├── registry.ts                      # CHANGE: GameContext.notice(text, code?) and isConnected(playerId); GameEngine.onRoomNotice?
│   └── ludo/
│       ├── engine.ts                    # CHANGE: playAgain, humor timer, onRoomNotice; bot commentary removed
│       ├── humor.ts                     # NEW: pools, picker (no repeat in last 5), name-safe templates, schedule helper
│       ├── bot.ts                       # CHANGE: phrase pools removed (commentary moves to Activity); pawn choice stays
│       └── dice.ts                      # CHANGE: LUDO_DEV_HUMOR_MS in the dev-variable list
└── rooms/
    └── room.ts                          # CHANGE: announce() forwards routine lines to onRoomNotice during a quiet match; context gains isConnected and the notice code

client/src/
├── audio/
│   ├── context.ts                       # NEW: shared AudioContext, master limiter, sound and music buses, resume and status
│   ├── levels.ts                        # NEW: volume curve, authored levels, music trim (tunable constants)
│   ├── prefs.ts                         # NEW: preference store (localStorage, legacy soundOn migration), React hook
│   ├── sfx.ts                           # CHANGE: same API, routed through the sound bus at recalibrated levels
│   ├── useRoomMusic.ts                  # NEW: hook mounted by RoomShell: start, stop, hidden page, status
│   └── music/
│       ├── engine.ts                    # NEW: lookahead step scheduler, voices, fades, one theme at a time
│       ├── index.ts                     # NEW: startMusic(gameId), stopMusic(), status store
│       └── themes/{ludo,housie,bingo,uno}.ts   # NEW: one pattern table per game
├── components/
│   ├── common/AudioControls.tsx         # NEW: header button and popover (Sound and Music rows, status, retry)
│   ├── hub/SoundToggle.tsx              # REMOVE: replaced by AudioControls
│   ├── hub/Header.tsx                   # CHANGE: AudioControls
│   └── room/
│       ├── RoomShell.tsx                # CHANGE: useRoomMusic(room.gameId); AudioControls in the room header
│       └── ChatPanel.tsx                # CHANGE: draft kept in the platform draft store; humor lines styled
├── state/
│   ├── chatPrefs.ts                     # NEW: per-game chat minimized or open (tri-state), React hook
│   ├── chatDraft.ts                     # NEW: per-room draft text kept across unmount
│   └── guest.ts                         # UNCHANGED: its soundOn field is read once as the legacy migration source for audio preferences
├── styles/controls.css                  # CHANGE: audio popover and slider styles
└── games/
    ├── ludo/
    │   ├── LudoScreen.tsx               # CHANGE: AudioControls in the header; replay wiring
    │   ├── ResultsOverlay.tsx           # CHANGE: Play again (host) with player count, next-table line, waiting text, blocked reason
    │   ├── replayPreview.ts             # NEW: derives who plays next, who left and who is disconnected from the state and the room
    │   ├── useLudo.ts                   # CHANGE: playAgain with a pending guard
    │   ├── ActivityLog.tsx              # CHANGE: 'room' and 'match' entries
    │   └── ludo.css                     # CHANGE: entry styles, results actions
    ├── uno/
    │   ├── turnLabel.ts                 # NEW: describeTurn(table, you, wheelOpen) pure function
    │   ├── TurnStrip.tsx / TurnStrip.css  # NEW: persistent turn strip
    │   ├── UnoScreen.tsx                # CHANGE: strip, hand glow, rail mode, AudioControls already via header swap
    │   ├── OpponentSeat.tsx             # CHANGE: text turn chip on the active seat
    │   ├── Hand.tsx                     # CHANGE: held card state, hand glow on your turn
    │   ├── unoStore.ts                  # CHANGE: PlayAttempt (held, confirming, refused), timing marks
    │   ├── useUnoAnimator.ts            # CHANGE: finish a held throw on the server event; return on refusal
    │   ├── anim/throw.ts                # CHANGE: hold, continue and return segments
    │   ├── UnoChat.tsx / UnoChat.css    # CHANGE: Minimize and Restore, rail, unread, draft survives
    │   └── useFit.ts                    # CHANGE: turn strip height; chat mode 'rail'
    └── housie/
        ├── Ticket.tsx / Ticket.css      # CHANGE: ribbon, column tints, type scale, marked cell treatment
        ├── TicketArea.tsx / TicketArea.css  # CHANGE: pass rowH and fontPx, space use
        └── useFit.ts                    # CHANGE: planTickets returns rowH and fontPx; new minimums
```

**Structure Decision**: Keep the existing three-workspace layout. Everything new on the client sits beside the code it extends (`audio/`, `state/`, `components/common/`, the game folders);
nothing new is added to `server/` except Ludo's `humor.ts`, because audio, chat preferences, UNO presentation and Housie presentation are client-only concerns.

## Complexity Tracking

> Constitution Check has no violations to justify.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | n/a | n/a |
