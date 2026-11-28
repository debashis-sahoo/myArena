[CmdletBinding()]
param(
  [string]$SubscriptionId = 'ec7b61df-f90c-4c20-b089-847e999236d5',
  [string]$TenantId = '70a8c117-8975-4f55-8790-bc32a6ce5f15',
  [string]$ResourceGroup = 'myArena',
  [string]$Region = 'centralindia',
  [string]$CostEstimatePath = 'artifacts/cost-estimate.json',
  [string]$CostOverrideEvidencePath,
  [switch]$SkipCostEstimate
)

$ErrorActionPreference = 'Stop'

function Get-AzJson {
  param([scriptblock]$Command, [string]$Failure)
  $result = & $Command
  if ($LASTEXITCODE -ne 0) {
    throw $Failure
  }
  return ($result -join [Environment]::NewLine | ConvertFrom-Json)
}

$account = Get-AzJson { az account show } 'Azure account is unavailable. Run az login first.'
if ($account.id -ne $SubscriptionId) {
  throw "Active subscription '$($account.id)' is not '$SubscriptionId'."
}
if ($account.tenantId -ne $TenantId) {
  throw "Active tenant '$($account.tenantId)' is not '$TenantId'."
}

$group = Get-AzJson { az group show --name $ResourceGroup } "Resource group '$ResourceGroup' is unavailable."
if ($group.properties.provisioningState -ne 'Succeeded') {
  throw "Resource group '$ResourceGroup' is not in Succeeded state."
}

$providers = @('Microsoft.Web', 'Microsoft.OperationalInsights', 'Microsoft.Insights')
foreach ($provider in $providers) {
  $state = Get-AzJson { az provider show --namespace $provider } "Unable to inspect provider '$provider'."
  if ($state.registrationState -ne 'Registered') {
    throw "Provider '$provider' is '$($state.registrationState)'; register it before provisioning."
  }
}

$locations = az appservice list-locations --sku S1 --linux --query "[].name" -o tsv
$normalizedLocations = @($locations | ForEach-Object { $_.ToLowerInvariant().Replace(' ', '') })
if ($LASTEXITCODE -ne 0 -or $normalizedLocations -notcontains $Region.ToLowerInvariant()) {
  throw "App Service Linux S1 is not reported available in '$Region'."
}

if ($Region -eq 'westeurope') {
  throw 'West Europe is blocked by project policy.'
}

$policyScope = $group.id
$policyAssignments = Get-AzJson { az policy assignment list --scope $policyScope } 'Unable to read policy assignments for the release resource group.'
if ($null -eq $policyAssignments) {
  throw 'Azure Policy assignments could not be verified for the release scope.'
}

$usageUri = "https://management.azure.com/subscriptions/$SubscriptionId/providers/Microsoft.Web/locations/$Region/usages?api-version=2024-04-01"
$usage = Get-AzJson { az rest --method get --url $usageUri } 'Unable to read Central India App Service quota usage.'
$s1Quota = @($usage.value | Where-Object {
    $_.name.value -match '(Standard.*Workers|S1)' -or $_.unit -eq 'Number'
  } | Where-Object { [int64]$_.limit -gt 0 })
if ($s1Quota.Count -eq 0) {
  throw 'Central India Standard App Service worker quota evidence was not returned.'
}
if (@($s1Quota | Where-Object { [int64]$_.currentValue -ge [int64]$_.limit }).Count -gt 0) {
  throw 'Central India Standard App Service worker quota is exhausted.'
}

if (-not $SkipCostEstimate) {
  if (-not (Test-Path $CostEstimatePath)) {
    throw "Missing cost estimate '$CostEstimatePath'."
  }
  $cost = Get-Content -Raw $CostEstimatePath | ConvertFrom-Json
  if ([decimal]$cost.lowTrafficMonthlyUsd -gt 80) {
    if (-not $CostOverrideEvidencePath -or -not (Test-Path $CostOverrideEvidencePath)) {
      throw "Projected idle/low-traffic total $($cost.lowTrafficMonthlyUsd) USD exceeds 80 USD and no override evidence exists."
    }
    $approval = Get-Content -Raw $CostOverrideEvidencePath | ConvertFrom-Json
    if (-not $approval.approvedBy -or -not $approval.approvedAtUtc -or $approval.scope -ne 'USD80-budget-exception') {
      throw 'Cost override evidence is incomplete or has the wrong scope.'
    }
  }
}

& "$PSScriptRoot/assert-production-environment.ps1" | Out-Null

[ordered]@{
  subscriptionId = $account.id
  tenantId = $account.tenantId
  resourceGroup = $ResourceGroup
  region = $Region
  providers = $providers
  policyAssignmentsChecked = @($policyAssignments).Count
  quotaRowsChecked = $s1Quota.Count
  s1RegionAvailable = $true
  costCeilingUsd = 80
  costVerified = -not $SkipCostEstimate
} | ConvertTo-Json -Depth 5
