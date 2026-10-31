# Load harness

Two scenarios, both against a running server (default `http://127.0.0.1:3000`).

## Lobby changes (001)

`npm run load -w @myarena/load -- --profile 2x100 --duration 30` — many members toggling readiness; reports how long every member
takes to see each change (SC-009, SC-010).

## Ludo bots (003)

`npm run load:ludo -w @myarena/load -- --matches 5 --players 4 --max-seconds 120`

Each bot is a real WebSocket client that plays Ludo through the game channel: it rolls on its turn and moves the legal pawn that is
furthest along once the die has settled. Several matches run at once. The report gives:

- action latency (time to the server's answer), p50, p95 and max;
- broadcast latency (time until every bot in the match has the resulting game message), p50, p95, max, and the share within one second;
- any refused action, by code, which should be none (bots only act when allowed).

Evidence for quickstart scenario 27: SC-004 (a roll is seen by everyone within about a second) and SC-008 (updates reach every
member within one second for at least 95% of messages). A full four-player match takes many minutes in real time because the die
takes 2.4 s to settle, so `--max-seconds` caps each run and the report says how many matches finished.
