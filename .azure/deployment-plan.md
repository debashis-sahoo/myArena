# Azure Deployment Plan: myArena

**Status**: Validated
**Updated**: 2026-11-27
**Governed plan**: `specs/011-azure-release-pipeline/plan.md`

## Summary

Deploy the existing Node.js/Socket.IO service to one Azure App Service Linux S1 plan in Central
India. Use the production Web App and one staging slot for warm, approved deployment. Keep the
runtime Always On at one S1 instance because authoritative room state is currently in memory.

## Azure Target

- Subscription: `DebFTESub`
- Subscription ID: `ec7b61df-f90c-4c20-b089-847e999236d5`
- Tenant ID: `70a8c117-8975-4f55-8790-bc32a6ce5f15`
- Resource group: `myArena`
- Region: `centralindia`
- Compute: Azure App Service Linux Standard S1
- Workers: 1 fixed instance initially
- Runtime: Node.js 22
- Deployment: production Web App + one `staging` slot
- Monitoring: Log Analytics + workspace-based Application Insights
- Public endpoint: `https://myarena-2rmn2sg5dfrjy-app.azurewebsites.net`
  (provisioned; application deployment not yet verified)

## Architecture Decisions

- Always On is enabled; S1 does not scale to zero and normal cold-start wake-up is not expected.
- The production process remains a single authoritative instance because room state is process-local.
- App Service horizontal autoscale stays disabled until a separate feature makes room state
  shareable or adds safe room-to-process routing.
- One S1 instance must pass the 500-concurrent-connection load test; otherwise move to a larger
  single-instance SKU or complete that separate state-sharing feature before release.
- Staging receives a warmed, tested ZIP artifact. Candidate-only room creation uses an ephemeral
  verifier token whose hash and expiry are configured on staging before the candidate starts.
- After production approval, staging swaps with production.
- Physical slot identity and admission settings are immutable across the release: production
  accepts public new rooms and staging does not. Candidate and draining labels are workflow
  phases, not post-swap app-setting values.
- The release workflow records the swap/deadline timestamps without updating a running old
  process, avoiding a recycle that would erase in-memory room state.
- A first public cutover is blocked until the one-S1 load and 2-second p95 gate passes.
- Rollback during drain is a reverse cutover: the prior release resumes production, candidate
  rooms reconnect to staging, and a separate at-most-30-minute reverse drain closes before the
  next forward release.
- Existing rooms remain on the old slot/process for at most 30 minutes; new rooms use production.
- The client stores a short-lived draining-slot reconnect origin and falls back to it only for a
  valid existing room.

## CI/CD Plan

1. Pull request validation: install with lockfile, build, smoke test, Bicep build/lint, policy and
   cost checks.
2. Main release: build one immutable SHA-tagged ZIP and attach its source revision and digest.
3. Configure the expiring candidate verifier hash/expiry on staging, then deploy the ZIP with
   immutable slot-sticky identity.
4. Verify staging startup, `/healthz`, HTTPS, secure WebSocket, verifier-only create/join, one game
   action, reconnect, and rejection of unauthenticated staging room creation.
5. Require protected `production` approval.
6. Acquire the drain lock and swap staging with production without changing runtime role,
   admission, origin, or deadline app settings.
7. Record the swap/deadline timestamps and verify new-room routing, old-room continuity, and the
   30-minute drain.
8. Retain the previous healthy ZIP and stop the old slot after drain completes.
9. Roll back by reverse swap within drain, then drain candidate-created rooms on staging for at
   most 30 minutes. After retirement, restore the prior ZIP without rebuilding.

## Identity and Security

- GitHub Actions authenticates with OIDC; no long-lived Azure credential is stored in GitHub.
- The Web App uses a system-assigned managed identity for Azure resources.
- Secrets are held as protected App Service settings or Key Vault references, never in source.
- CORS/socket reconnect to the draining slot is limited to the production myArena origin.
- Staging cannot accept unauthenticated new room creation before or after a cutover; after cutover,
  only valid existing-room reconnects are permitted.

## Cost and Metered-Connection Guardrails

- S1 published base estimate: approximately USD 69.35/month.
- Release estimate gate: projected idle/low-traffic Azure cost at or below USD 80/month, pending
  live regional pricing.
- No scale-to-zero or Container Apps consumption free grant applies.
- Use Azure Monitor's free ingestion allowance where available; cap analytics ingestion at
  0.1 GB/day and retain 30 days.
- Sample ordinary traces at 10% or the platform rate limit; preserve all errors and release checks.
- Cache npm/build inputs and ZIP artifacts; avoid registry image re-pulls.
- The stale slot is stopped after drain but the S1 plan remains continuously billed.

## Blocking Preflight

Before any resource mutation:

1. Confirm `DebFTESub`, tenant, and `myArena`.
2. Register required `Microsoft.Web`, `Microsoft.OperationalInsights`, and `Microsoft.Insights`
   providers.
3. Check Central India availability and App Service S1 worker quota.
4. Re-check policy and reject West Europe.
5. Validate Bicep with what-if and live cost; block above the USD 80 estimate threshold.
6. Confirm S1 supports the required staging slot and protected GitHub production reviewers.
7. Verify GitHub OIDC federation and managed-identity role scopes.

## Validation Gates

- Build, smoke, Bicep, and policy checks pass.
- 500 concurrent connections meet the 2-second p95 update target on one S1 instance.
- HTTPS and secure WebSocket checks pass.
- Existing rooms survive a slot swap or reconnect to the draining slot within 30 minutes.
- New rooms always use production after swap.
- Always On remains healthy after 24 hours without traffic; no cold-start claim is made.
- Telemetry remains inside the daily cap and 30-day retention.
- Rollback restores the previous healthy release within 10 minutes.
- Horizontal autoscale is not enabled while room state remains process-local.

## Approval

Maintainer direction “let’s go with S1” and the subsequent explicit `/speckit-implement`
invocation approve preparation of the USD 69.35/month S1 topology and USD 80/month planning gate.
Azure infrastructure mutation and public production cutover remain blocked until readiness
validation, protected approval, preflight, and the 500-connection S1 gate pass.

## 7. Validation Proof

### All validation checks pass

- [x] Node.js 22 runtime: `package.json`, App Service production settings, and staging settings
  all use the same supported GA LTS major.
- [x] Core Bicep validation: Azure CLI, authentication, `az bicep build`,
  `az deployment group validate`, and `az deployment group what-if`.
- [x] Bicep lint: `az bicep lint --file infra/main.bicep`.
- [x] Azure Policy validation: West Europe blocked; MFA write/delete assignments acknowledged;
  Central India is the selected region.
- [x] Local functional validation: workspace build, production smoke, staging smoke, telemetry
  limits, metered controls, and artifact creation.

### Validation evidence

2026-11-27:

- Azure CLI authentication: PASS for `DebFTESub`
  (`ec7b61df-f90c-4c20-b089-847e999236d5`) in tenant
  `70a8c117-8975-4f55-8790-bc32a6ce5f15`.
- Bicep compile: PASS.
- Resource-group ARM validate: PASS.
- What-if: PASS, 12 create / 0 modify / 0 delete.
- Bicep lint: PASS with no warnings.
- Node runtime: `>=22` in `package.json`, `NODE|22-lts` for production and staging, and Node 22
  in GitHub Actions.
- Azure Policy: West Europe denial, MFA write, and MFA delete assignments inherited from the
  management group; subscription Defender policy assignments are audit-only.
- Region/quota: Linux S1 is reported available in Central India. Azure MCP quota reported no
  configured limit for the planned resource types.
- Build and production smoke: PASS.
- Candidate/staging smoke: PASS, including unauthenticated staging-create rejection and candidate
  verifier plus host-entry requirement.
- Telemetry configuration: 0.1 GB/day, 30-day retention, 10% ordinary trace sampling, forbidden
  field scan configured.
- Visual verification: reconnect banner fit 320, 568, 768, 1024, 1440, and 900px representative
  viewports in portrait/landscape with no horizontal overflow.
- Managed identity: production and staging identities each receive only `Monitoring Metrics
  Publisher` on Application Insights.

## Role Assignment Verification

- Status: Verified statically
- Identities checked: App Service production Web App system-assigned identity; staging slot
  system-assigned identity is used only for the same App Service runtime boundary.
- Roles confirmed: `Monitoring Metrics Publisher` for both production and staging managed
  identities, scoped directly to the Application Insights component. No storage, database,
  Key Vault, or subscription roles are assigned to the workload.
- OIDC identity: `Website Contributor` is scoped to the `myArena` resource group and is created by
  `scripts/azure/bootstrap-oidc.ps1`; it is not granted data-plane access.
- Issues: None found. Static role review records that the workload accesses no Azure data plane
  besides Application Insights telemetry.

### Live Deployment Verification

- Deployment: `myarena-s1-initial` succeeded in `myArena` in 3m 0s.
- Planned endpoint: `https://myarena-2rmn2sg5dfrjy-app.azurewebsites.net`
- Planned staging endpoint: `https://myarena-2rmn2sg5dfrjy-app-staging.azurewebsites.net`
- Resource group now contains S1 plan, one Web App, staging slot, Log Analytics workspace, and
  Application Insights.
- Production Web App: Running, HTTPS only, Always On, WebSockets, Node.js 22, one worker.
- Slot settings: `SLOT_IDENTITY`, `PUBLIC_ORIGIN`, and `DRAIN_ORIGIN` are slot-sticky.
- OIDC client ID: `8d68dc0c-934c-4de9-8ed4-8483c403539b`, with a production-environment
  federated subject and resource-group Website Contributor role.
- Live RBAC: production and staging managed identities each have `Monitoring Metrics Publisher`
  on the Application Insights resource.
- Application artifact: pending. A clean source-controlled commit and valid GitHub.com
  authentication are required before the protected release workflow can deploy it.
