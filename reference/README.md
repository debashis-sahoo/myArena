# Reference Specifications

Product and functional specifications for **myArena Royalty**. They describe the behaviour of the current release (v1.2.0) for both the **admin** (room host / caller) and **players**, including the UI experience.

| Document | Scope |
|---|---|
| [00 — Platform Master Specification](./00-platform-master-spec.md) | Shared platform: roles, screens, room lifecycle, onboarding briefing, real-time model, dice, piece movement, chat, resilience, security, HTTP/SSE contract, storage, accessibility, deployment |
| [01 — Ludo Royalty](./01-ludo-spec.md) | Seats and colours, board, rule presets, turn flow, token hops and captures, AI heuristics |
| [02 — Snakes & Ladders](./02-snakes-and-ladders-spec.md) | Board layout, ladders and snakes, finish modes, themes, pawn hops, ladder climbs and snake slides |
| [03 — Housie / Tambola 90](./03-tambola-spec.md) | Admin game setup, 52 popularity-rated winning patterns, tickets, calling, marking, claim verification, 50-player rooms |

**Conventions**
- *Host* and *admin* are the same role: the player who created the room (hand-over is automatic if they leave).
- Timings are the shipped defaults; under *reduce motion* animations are replaced by instant updates.
- When behaviour changes, update the relevant spec in the same change and bump its version line.
