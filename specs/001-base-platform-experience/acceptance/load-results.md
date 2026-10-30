# Load Results: Base Platform and Experience

Covers SC-009 (no lost or misrepresented room state at the agreed capacity, including 100 in one
room and the launch capacity of 20 rooms and 200 connected participants) and SC-010 (at least 95%
of accepted lobby changes visible to everyone within 1 second).

**Status: local run recorded. Not yet repeated on Render.** The numbers below come from the
service and the harness running on one development machine over loopback, so network latency,
the Render instance size, and the Render proxy are not represented. Repeat these profiles against
the Render preview (task T133) before treating SC-010 as met in production.

## How it was measured

- Harness: `tools/load` (`npm run load -- --profile <name> --url <service>`), which uses real
  HTTP to create and join rooms and real WebSocket clients, one per participant.
- Profiles: `2x100` is 2 rooms of 100 participants. `20x10` is 20 rooms of 10 participants. Both
  hold 200 connected participants, the launch capacity, with the service limits at their defaults
  (20 rooms, 200 participants). Only the per-IP create and join rate limits were raised, because
  the harness joins everyone from one address.
- Workload: every participant toggles its own readiness at a fixed interval for 30 seconds, then
  the harness waits 3 seconds for delivery to settle.
- A change counts as visible only when every member of its room has received its versioned event.
  Latency is measured from sending the intent to the last member receiving the event. A change
  some member never received counts as lost.
- SC-009 checks: no lost change; no gap in any client's version sequence; every client's view,
  built from its first snapshot plus the events it received, equals the server's state after a
  final resync; and all members of a room agree.
- Build: the production build of the service started with `node apps/server/dist/main.js`, one
  instance, `NODE_ENV=test`.

## Machine

AMD Ryzen AI Max+ Pro 395 (16 cores, 32 threads), 96 GB RAM, Windows 11 Enterprise, Node.js 24
(via `npx --package=node@24`). Run on 2026-10-30.

## Results

| Profile | Change interval per member | Changes | Lost | Version gaps | View disagreements | p50 | p95 | p99 | Max | Within 1 s | SC-009 | SC-010 |
|---------|---------------------------|---------|------|--------------|--------------------|-----|-----|-----|-----|-----------|--------|--------|
| `2x100` | 5 s | 1,197 | 0 | 0 | 0 | 6.8 ms | 16.0 ms | 21.2 ms | 31.2 ms | 100% | Pass | Pass |
| `20x10` | 5 s | 1,197 | 0 | 0 | 0 | 1.4 ms | 2.3 ms | 3.1 ms | 12.0 ms | 100% | Pass | Pass |
| `2x100` (stress) | 1 s | 5,909 | 0 | 0 | 0 | 12.3 ms | 29.1 ms | 52.0 ms | 73.2 ms | 100% | Pass | Pass |

The stress row is five times the required change rate and is included to show margin, not as an
acceptance profile.

## Reading the results

- On this machine the service has a wide margin against the 1-second target: the slowest change in
  any run reached all 100 members of a room in about 73 ms.
- The workload only exercises readiness changes. Chat bursts, joins, and leaves under load are not
  part of these profiles.
- Per-participant intent limits (20 intents per 10 seconds) were not hit; the 5-second profiles use
  well under that and the 1-second stress profile uses 10 intents per 10 seconds.

## To repeat

```powershell
npm run build
$env:PORT='3200'; $env:NODE_ENV='test'; $env:ALLOWED_ORIGINS='http://127.0.0.1:3200'
$env:JOIN_LIMIT_PER_MINUTE='5000'; $env:CREATE_LIMIT_PER_MINUTE='5000'
node apps/server/dist/main.js              # in one terminal
npm run load -- --profile 2x100 --url http://127.0.0.1:3200 --duration 30
```

Restart the service between profiles, since each fills the launch capacity. Against Render, pass
the preview URL and raise the per-IP limits there only for the duration of the run.
