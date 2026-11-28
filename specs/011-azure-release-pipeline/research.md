# Research: Azure Release Pipeline

**Date**: 2026-11-27
**Feature**: `011-azure-release-pipeline`

## Decision summary

| Decision | Choice | Key reason |
|---|---|---|
| Region | Central India | Aligns with the existing resource group and avoids blocked West Europe |
| Compute | Azure App Service Linux S1 Standard | Always On, WebSockets, deployment slots, and simple operations |
| Baseline capacity | One S1 worker | Current room state is process-local and cannot safely scale across workers |
| Deployment strategy | Staging slot plus swap and 30-minute drain | Warm candidate, zero-downtime HTTP cutover, immediate swap-back |
| Application package | Immutable GitHub Actions ZIP | Avoids registry/image pull overhead and fits source deployment |
| CI/CD identity | GitHub OIDC | No long-lived Azure credential |
| Approval | Protected GitHub `production` environment | Explicit maintainer decision |
| Observability | App Service diagnostics, Log Analytics, Application Insights | Essential evidence with bounded retention |
| Idle model | Always On; no scale-to-zero | Deliberate S1 tradeoff chosen by maintainer |
| Monthly fixed compute | About USD 69.35 before telemetry/transfer | Lowest Standard tier with slots and Always On |

## Current Azure evidence

- `DebFTESub` is Enabled and the personal account has inherited Owner access.
- `myArena` exists in Central India and reports `Succeeded`.
- Policy blocks West Europe and enforces MFA for write/delete actions.
- Provider, region, and S1 capacity must be checked immediately before mutation.

## Key platform findings

### App Service S1

S1 is the smallest Standard Linux App Service tier. Standard supports:

- Always On
- staging slots
- Standard autoscale controls
- secure WebSockets
- production-oriented operation

The published S1 estimate is approximately USD 69.35/month in current public pricing. Exact
Central India pricing, taxes, and transfer must be rechecked in the deployment preflight.

### WebSocket limits and runtime capacity

Paid Linux App Service SKUs support roughly 50,000 concurrent WebSocket connections per instance,
so the platform connection ceiling does not block the 500-connection target. CPU and memory on the
one S1 worker remain the practical limit; the 500-connection load test is therefore mandatory.

### Slot swap and continuity

App Service slot swaps warm the source slot, then redirect traffic without dropping new requests.
The prior production content moves to staging. The plan retains that process and slot for
30 minutes so existing room connections can remain on it; clients may retry the old slot for an
existing-room reconnect.

This connection continuity is not assumed complete merely because HTTP swap is seamless. The
quickstart requires a real long-lived WebSocket swap test and a reconnect fallback test.

### Slot identity and drain transition

The runtime must not be changed from `candidate` to `draining` by updating an App Service app
setting after the swap. An app-setting change can restart the process and erase the in-memory
rooms that the drain protects.

Use one slot-sticky physical identity:

- `production` always derives public room admission.
- `staging` always rejects unauthenticated room creation and accepts valid existing-room resume.
- Before swap, the staging candidate is exercised through an ephemeral, short-lived verification
  token whose hash and expiry are slot-sticky on staging.
- After swap, the workflow—not the running process—records the `draining` phase and exact deadline.
- No post-swap role, admission, origin, or deadline setting is changed.
- The next candidate verifier may be configured only after the prior forward or reverse drain is
  closed, because changing staging settings can restart a process that still owns rooms.

Clients receive a rolling `RoomReconnectHint` while connected. Reconnect probes the production
origin first and the exact allowlisted staging origin second. The hint is not authentication; the
server still validates room membership and host permissions.

The candidate verifier is an infrastructure capability, not a gameplay credential. It is passed in
the Socket.IO handshake as `auth.candidateVerifier`, still requires normal host-entry
authorization, is SHA-256 compared timing-safely against a short-lived slot-sticky hash, and is
never persisted in release evidence. Candidate creation is rejected for requests without host
authorization even when they possess the verifier capability.

### In-memory room state and autoscale

ARR affinity can keep one client on one worker, but it does not ensure that all clients in one room
select the same worker. `RoomStore` remains process-local. Enabling horizontal autoscale now could
split one room across workers.

Therefore the initial S1 plan:

- uses one worker;
- disables plan autoscale;
- load-tests 500 concurrent connections;
- requires a larger single-worker SKU or a separate state-sharing design if one S1 worker fails.

### GitHub Actions and OIDC

GitHub Actions authenticates to Azure through workload identity federation and a short-lived token.
The production job references a protected environment with required reviewers. ZIP Deploy sends one
immutable build artifact to the staging slot, avoiding the need for an Azure Container Registry.

### Observability and cost

Use App Service platform metrics, system/application logs, workspace-based Application Insights,
and Log Analytics:

- 30-day retention
- 0.1 GB/day ingestion cap, warning at 70%
- 10% ordinary trace sampling or platform rate-limited sampling
- 100% error and deployment verification telemetry
- no chat, credentials, raw guest IDs, or payload retention

The S1 fixed cost exceeds the former USD 10 ceiling. The maintainer's S1 selection updates the
approved operating target to approximately USD 69.35/month compute and a total pre-deployment
estimate ceiling of USD 80/month.

## Alternatives reconsidered

- **Container Apps Consumption**: lower idle cost and scale-to-zero, but the maintainer selected
  S1 to avoid normal cold starts and router complexity.
- **B1 Basic**: lower fixed cost, but lacks deployment slots and Standard autoscale.
- **F1 Free**: not for production, no slots, low CPU quota, and limited WebSockets.
- **S2/S3**: keep as vertical scale alternatives only if the S1 load gate fails.
- **S1 horizontal autoscale**: not safe until authoritative room state is shareable or consistently
  routed by room.
- **Redis adapter alone**: Socket.IO event fan-out is insufficient unless the actual room/game
  state and timers are also moved or coordinated.

## Sources

- [Azure App Service pricing](https://azure.microsoft.com/pricing/details/app-service/linux/)
- [App Service plan overview](https://learn.microsoft.com/azure/app-service/overview-hosting-plans)
- [App Service automatic scaling](https://learn.microsoft.com/azure/app-service/manage-automatic-scaling)
- [App Service deployment slots](https://learn.microsoft.com/azure/app-service/deploy-staging-slots)
- [App Service service limits](https://learn.microsoft.com/azure/azure-resource-manager/management/azure-subscription-service-limits)
- [GitHub OIDC for Azure](https://docs.github.com/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-azure)
- [GitHub deployment protection rules](https://docs.github.com/actions/reference/workflows-and-actions/deployments-and-environments)
- [Azure Monitor pricing](https://azure.microsoft.com/pricing/details/monitor/)
- [Application Insights OpenTelemetry sampling](https://learn.microsoft.com/azure/azure-monitor/app/opentelemetry-sampling)
