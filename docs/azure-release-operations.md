# myArena Azure Release Operations

## Scope

Production runs on one Azure App Service Linux S1 plan in `DebFTESub` / `myArena`,
Central India. The plan remains at one worker because authoritative room state is in memory.
Horizontal autoscale is not a recovery action.

## Before release

1. Confirm the maintainer approved the S1 estimate and USD 80/month planning gate.
2. Run `npm ci`, `npm run build`, and `npm run smoke`.
3. Run `az bicep build --file infra/main.bicep`.
4. Sign in to the canonical tenant/subscription and run:
   `pwsh -NoProfile -File scripts/azure/preflight.ps1`.
5. Verify the GitHub `production` environment with
   `scripts/azure/assert-production-environment.ps1`.
6. Validate Bicep with `az deployment group what-if`.
7. Confirm S1 worker count with `scripts/azure/assert-s1-single-worker.ps1`.

## Candidate verification

GitHub OIDC prepares a short-lived candidate verifier on staging. Only its SHA-256 digest and
expiry are written to the physical staging slot. The verifier is sent through
`Socket.IO auth.candidateVerifier` and still requires the normal host-entry capability.

The candidate must pass:

- `/healthz`, HTTPS, and secure WebSocket checks;
- create, join, chat, controlled game action, and reconnect;
- rejection of unauthenticated `room:create` on staging;
- the 500-connection, 2-second p95 qualification on one S1 worker;
- cost, telemetry, and evidence checks.

After load qualification, the workflow restarts and re-warms staging to remove qualification rooms.

## Approval and cutover

The protected `production` environment is evaluated only after candidate evidence is complete.
Approval permits one forward swap. The workflow records `swapCompletedUtc` and derives a
30-minute workflow-owned drain deadline. It must not change slot role, origin, admission, or
deadline app settings after the swap.

New rooms use production. Existing rooms reconnect to production first, then use the exact
allowlisted staging origin while their server-issued hint is valid.

## Rollback

During a forward drain, rollback is a reverse cutover. Previous production resumes accepting new
rooms; candidate-created rooms reconnect to staging. The candidate receives a separate at-most
30-minute reverse drain and a new forward release remains blocked until it closes.

After retirement, start the retained healthy staging package and swap it back without rebuilding.
The bounded GitHub artifact remains available to redeploy only if the slot package was replaced.
Traffic restoration must complete within 10 minutes.

## Telemetry and cost recovery

Log Analytics uses 30-day retention and a 0.1 GB/day cap. Ordinary traces sample at 10%; release
and error evidence remains unsampled. If ingestion is near 0.07 GB/day, reduce ordinary traces or
dependency tracing—never suppress deployment, security, health, swap, or capacity refusal events.

The S1 base is itemized separately from transfer, telemetry, storage, and artifact cost. Projected
idle/low-traffic total above USD 80 blocks release pending explicit maintainer approval.

## Render fallback

Render remains available only until Azure startup, WebSocket, reconnect, capacity, and cost
acceptance is complete. Remove Render configuration in a separate post-migration task; do not
remove it during preparation.
