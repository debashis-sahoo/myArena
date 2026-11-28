# Azure Release Implementation Notes

This runbook index links the executable surfaces created for the Azure S1 release pipeline.

- Preflight and scope: `scripts/azure/preflight.ps1`
- GitHub protection: `scripts/azure/assert-production-environment.ps1`
- Candidate artifact: `scripts/release/create-artifact.mjs`
- Candidate deployment: `scripts/azure/deploy-staging.ps1`
- Candidate verification: `scripts/azure/warm-and-verify.ps1`
- Forward/reverse swap: `scripts/azure/swap-release.ps1`
- Drain retirement: `scripts/azure/retire-draining-slot.ps1`
- Release evidence: `contracts/pipeline-evidence.md`
- Slot routing and drain: `contracts/slot-routing.md`
- Telemetry limits: `contracts/telemetry.md`
- Acceptance evidence: `specs/011-azure-release-pipeline/verification.md`

No script in this feature removes the policy, quota, cost, protected-approval, load, or drain
gates. Azure mutation remains separate from local preparation and requires an approved
readiness-validation workflow.
