# Contract: Essential Telemetry

## Mandatory aggregate signals

| Signal | Source | Use |
|---|---|---|
| Service availability and readiness | App Service health/reachability | Deployment and uptime |
| HTTP failure rate and response delay | Platform metrics and sampled traces | Availability and performance |
| Active connections by slot | Application aggregate metric | Load and drain decisions |
| Active rooms by slot | Application aggregate metric | Drain completion and capacity |
| Worker count and health | App Service metrics | Enforce one-worker state-safe mode |
| CPU and memory usage | App Service metrics | S1 load and capacity sizing |
| Restart and crash count | App Service diagnostics | Reliability |
| Deployment and slot swap failures | GitHub/App Service evidence | Release failure diagnosis |
| Capacity refusals | Safe aggregate application log/metric | 500-connection ceiling |
| Slot transitions and one-worker capacity/health changes | Structured application log | Cutover, rollback, drain audit, and confirmation that no horizontal scaling occurred |
| Warm-instance response delay | Availability check | 10-second Always On target |
| Cost/ingestion warnings | Azure Monitor and pipeline estimate | USD 80 and telemetry guardrails |

## Log envelope

```json
{
  "timestamp": "ISO-8601 UTC",
  "severity": "info | warning | error | critical",
  "releaseId": "artifact digest",
  "slot": "production | staging",
  "category": "startup | health | routing | swap | capacity | release | error",
  "event": "stable event name",
  "correlationId": "random non-user correlation id",
  "metric": "optional aggregate number",
  "unit": "optional unit"
}
```

## Collection policy

- Retention: 30 days.
- Workspace daily cap: 0.1 GB/day initially, warning at 70%.
- Normal request/dependency trace sampling: 10% or the platform rate limit.
- Error and deployment-verification traces: 100%.
- Standard App Service and Azure activity metrics remain enabled.
- Chat, raw Socket.IO payloads, tokens, cookies, credentials, display names, and guest identifiers
  are prohibited.
- No sampling or cap may suppress a deployment failure, health failure, security refusal, slot
  transition, or capacity refusal needed for release decisions.

## Alert thresholds

- Always On: one healthy worker; production readiness must remain true after 24 hours idle.
- Warm response: landing page usable in 10 seconds for 95% of inactive-period checks.
- Connection ceiling: 500; warn at 350 and 450, then return a clear capacity outcome above 500.
- CPU/memory warnings: alert before the worker becomes unable to maintain the response target.
- Drain deadline: 30 minutes from slot swap.
- Cost gate: projected idle/low-traffic total at or below USD 80/month.
- Telemetry cap: 0.1 GB/day, warning at 0.07 GB/day.
