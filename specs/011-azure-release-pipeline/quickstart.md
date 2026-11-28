# Quickstart: Azure App Service Release Pipeline

This guide validates the feature after implementation. It does not authorize provisioning.

## Prerequisites

- Personal Azure authentication for `debashiss@outlook.com`.
- Default subscription `DebFTESub`
  (`ec7b61df-f90c-4c20-b089-847e999236d5`) and existing resource group `myArena`.
- Central India App Service S1 availability and worker quota confirmed.
- One Linux Web App plus one staging slot on an S1 plan.
- GitHub OIDC identity and protected `production` environment with required reviewers.
- Node.js 22, Azure CLI, Bicep, and GitHub Actions access.

## V1. Local release artifact

1. Run `npm ci`, `npm run build`, and `npm run smoke`.
2. Build the production ZIP artifact and start the built service locally with `PORT=10000`.
3. Verify `/healthz`, Hub load, host room creation, guest join, chat, and one game action.
4. Verify application logs exclude tokens, cookies, guest credentials, chat text, and unnecessary
   identity.

**Expected**: the same immutable repository-only artifact can be deployed to staging.

## V2. Policy, quota, and cost preflight

1. Verify subscription, tenant, resource group, and Central India.
2. Confirm required providers and S1 availability.
3. Confirm the App Service plan is one worker and supports one staging slot.
4. Review Bicep `what-if`.
5. Record live S1, telemetry, transfer, and supporting-service estimates.

**Expected**: West Europe is rejected and the projected idle/low-traffic Azure total is at or
below USD 80/month, or release remains blocked.

## V3. Candidate staging release

1. Push the intended commit to the release workflow.
2. Confirm dependency cache reuse and one immutable SHA-tagged ZIP.
3. Generate a short-lived candidate verifier token; configure only its hash and expiry on the
   physical staging slot and restart staging before candidate warm-up.
4. Deploy only to `staging`.
5. Connect as the verifier with `Socket.IO auth.candidateVerifier`; confirm the verifier also has
   the normal host-entry capability.
6. Warm and test `/healthz`, HTTPS, secure WebSocket, verifier-only create/join, chat, one game
   action, and reconnect.
7. Confirm an unauthenticated `room:create` and a verifier request without host-entry authorization
   are rejected.
8. Confirm production continues to use the previous artifact and the raw token appears in no log
   or evidence record.

**Expected**: staging is healthy without changing production.

## V4. Approved swap and drain

Do not execute the first public cutover until V5 has qualified one S1 worker at 500 concurrent
connections and the required p95 latency.

1. Approve the protected `production` environment.
2. Keep one room open on production before swap.
3. Acquire the release/drain lock and record the exact swap start time.
4. Swap staging with production.
5. Confirm the workflow has not changed production/staging role, admission, origin, or deadline
   app settings after the swap.
6. Record `swapCompletedUtc` and a `drainDeadlineUtc` exactly 30 minutes later.
7. Create a fresh room and confirm it uses the candidate.
8. Force the old room to reconnect and confirm fallback to the allowlisted staging origin over a
   browser-compatible secure WebSocket request.
9. Confirm the old slot rejects unauthenticated new-room creation but accepts the valid existing
   room.
10. Verify a second forward swap is rejected while drain is active.
11. End the room or simulate the 30-minute deadline, then stop staging and record the retirement.
12. Measure routine rollout duration. Fail when it exceeds 15 minutes; retain the timed value for
    the rolling 95% sample.
13. Have an operator locate revision, approval, endpoint, health, and rollback evidence. Fail when
    retrieval takes 5 minutes or more.

**Expected**: new rooms use production, existing rooms remain on the old process for at most
30 minutes, the draining slot is stopped, and no post-swap app-setting mutation occurs.

## V5. Load and Always On

1. Raise one S1 worker to 500 concurrent connections across many rooms.
2. Measure room updates, CPU, memory, HTTP queue, restarts, and capacity refusals.
3. Confirm no healthy connection is refused below 500.
4. Keep the app idle for 24 hours or use an equivalent controlled check.
5. Open the Hub and record time to usability.

**Expected**: 95% of room updates complete within 2 seconds at 500 connections, exactly one
stateful worker is used, and 95% of inactive-period page checks become usable within 10 seconds.
If S1 fails, do not enable multi-instance autoscale; choose a larger single worker or complete the
separate shared-state feature.

## V6. Observability and metered controls

1. Create one successful deploy, one candidate failure, one reconnect, and one swap/drain event.
2. Find revision, status, room/connection aggregates, errors, restarts, CPU/memory, and release
   transitions in retained evidence.
3. Verify no chat, token, cookie, credential, display name, or guest ID appears in telemetry.
4. Simulate 70% and 100% ingestion-cap signals.
5. Compare a clean build with an unchanged cached build.

**Expected**: required categories are visible, sensitive content is absent, cap warnings are
actionable, and cached release transfer is at least 50% lower.

## V7. Rollback

1. Mark a verified candidate unhealthy after swap in a controlled test.
2. Keep at least one old-release room and one candidate-created room active so both sides contain
   authoritative state.
3. During forward drain, swap back without changing runtime settings.
4. Confirm the previous healthy release accepts new production rooms while candidate-created rooms
   reconnect only to the now-staging candidate through the exact allowlisted origin.
5. Record a rollback-specific deadline at most 30 minutes after reverse swap and stop the
   candidate slot when no candidate rooms remain or the deadline arrives.
6. Confirm a new forward release is blocked until the reverse drain closes.
7. After drain, redeploy the retained previous healthy ZIP to staging and swap if rollback is no
   longer available through swap-back.
8. Confirm no source rebuild and total rollback traffic restoration within 10 minutes.

**Expected**: the previous healthy release is restored, no post-swap process setting is changed,
candidate-room state is bounded by a separate reverse drain, and evidence identifies active,
forward-draining, reverse-draining, and rollback artifacts.

## V8. Cost evidence

1. Inspect S1, Log Analytics, Application Insights, transfer, and retained artifact usage after
   30 days or a representative simulation.
2. Itemize the S1 base separately from supporting-variable cost.
3. Compare the idle/low-traffic estimate with USD 80.

**Expected**: the S1 baseline is explicit, no gameplay keepalive is introduced merely for warmth,
and the estimate remains within the approved ceiling.
