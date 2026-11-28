[CmdletBinding()]
param(
  [string]$CostEstimatePath = 'artifacts/cost-estimate.json',
  [decimal]$CeilingUsd = 80,
  [string]$OverrideEvidencePath
)

$ErrorActionPreference = 'Stop'
if (-not (Test-Path $CostEstimatePath)) {
  throw "Cost estimate '$CostEstimatePath' is missing."
}
$cost = Get-Content -Raw $CostEstimatePath | ConvertFrom-Json
$required = @('s1MonthlyUsd', 'supportingMonthlyUsd', 'transferMonthlyUsd', 'telemetryMonthlyUsd', 'artifactMonthlyUsd', 'lowTrafficMonthlyUsd')
foreach ($field in $required) {
  if ($null -eq $cost.PSObject.Properties[$field]) {
    throw "Cost estimate is missing '$field'."
  }
}
if ([decimal]$cost.lowTrafficMonthlyUsd -gt $CeilingUsd) {
  if (-not $OverrideEvidencePath -or -not (Test-Path $OverrideEvidencePath)) {
    throw "Projected monthly total $($cost.lowTrafficMonthlyUsd) USD exceeds $CeilingUsd USD and no override evidence exists."
  }
  $approval = Get-Content -Raw $OverrideEvidencePath | ConvertFrom-Json
  if (-not $approval.approvedBy -or -not $approval.approvedAtUtc -or $approval.scope -ne 'USD80-budget-exception') {
    throw 'Cost override evidence is incomplete or has the wrong scope.'
  }
}
Write-Output ($cost | ConvertTo-Json -Depth 6)
