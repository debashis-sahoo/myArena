[CmdletBinding()]
param(
  [string]$TelemetryPath = 'artifacts/telemetry-samples.jsonl',
  [string]$InfrastructurePath = 'infra'
)

$ErrorActionPreference = 'Stop'
$forbidden = @('guestId', 'displayName', 'cookie', 'token', 'credential', 'chat', 'raw Socket.IO payload')
$infraText = Get-ChildItem $InfrastructurePath -Recurse -File | ForEach-Object { Get-Content -Raw $_.FullName } | Out-String
if ($infraText -notmatch "dailyQuotaGb:\s*'0\.1'") {
  throw 'Log Analytics daily cap is not bounded to 0.1 GB.'
}
if ($infraText -notmatch 'dataRetention:\s*30') {
  throw 'Telemetry retention is not bounded to 30 days.'
}
if ($infraText -notmatch 'OTEL_TRACES_SAMPLER_ARG:\s*''0\.1''') {
  throw 'Ordinary traces are not configured for 10% sampling.'
}
if (Test-Path $TelemetryPath) {
  Get-Content $TelemetryPath | ForEach-Object {
    foreach ($field in $forbidden) {
      if ($_ -match [Regex]::Escape($field)) {
        throw "Telemetry sample contains prohibited field or content '$field'."
      }
    }
  }
}
Write-Output ([ordered]@{
  dailyCapGb = 0.1
  retentionDays = 30
  ordinaryTraceSample = 0.1
  forbiddenFields = $forbidden.Count
  sampleScan = Test-Path $TelemetryPath
} | ConvertTo-Json)
