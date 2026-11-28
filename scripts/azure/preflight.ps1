[CmdletBinding()]
param(
  [string]$SubscriptionId = 'ec7b61df-f90c-4c20-b089-847e999236d5',
  [string]$TenantId = '70a8c117-8975-4f55-8790-bc32a6ce5f15',
  [string]$ResourceGroup = 'myArena',
  [string]$Region = 'centralindia',
  [string]$PolicyBaselinePath = '.azure/policy-baseline.json',
  [string]$CostEstimatePath = 'artifacts/cost-estimate.json',
  [string]$CostOverrideEvidencePath,
  [switch]$SkipCostEstimate
)

$ErrorActionPreference = 'Stop'
$deploymentPlanPath = '.azure/deployment-plan.md'
if (-not (Test-Path $deploymentPlanPath) -or
    (Get-Content -Raw $deploymentPlanPath) -notmatch '\*\*Status\*\*: Validated') {
  throw 'The authoritative deployment plan is missing or not Validated.'
}

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

if (-not (Test-Path $PolicyBaselinePath)) {
  throw "Policy baseline '$PolicyBaselinePath' is missing."
}
$policyBaseline = Get-Content -Raw $PolicyBaselinePath | ConvertFrom-Json
$validatedAt = [DateTimeOffset]$policyBaseline.validatedAtUtc
if ($validatedAt -lt ([DateTimeOffset]::UtcNow.AddDays(-7))) {
  throw 'Policy baseline is older than seven days; refresh it before release.'
}
if ($policyBaseline.subscriptionId -ne $SubscriptionId -or
    $policyBaseline.tenantId -ne $TenantId -or
    $policyBaseline.resourceGroup -ne $ResourceGroup -or
    $policyBaseline.selectedRegion -ne $Region) {
  throw 'Policy baseline does not match the release subscription, tenant, resource group, or region.'
}
if ($policyBaseline.blockedRegions -contains $Region) {
  throw "Selected region '$Region' is blocked by the policy baseline."
}
$requiredPolicies = @('sys.blockwesteurope', 'sys.mfa-write', 'sys.mfa-delete')
foreach ($policyName in $requiredPolicies) {
  if (-not ($policyBaseline.requiredInheritedPolicies | Where-Object { $_.name -eq $policyName })) {
    throw "Required inherited policy '$policyName' is missing from the policy baseline."
  }
}

$quotaValidatedAt = [DateTimeOffset]$policyBaseline.appServiceQuota.validatedAtUtc
if ($quotaValidatedAt -lt ([DateTimeOffset]::UtcNow.AddDays(-7)) -or
    $policyBaseline.appServiceQuota.description -ne 'No Limit') {
  throw 'Central India App Service quota evidence is stale or exhausted.'
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
  policyBaseline = $policyBaseline.validatedAtUtc
  quotaBaseline = $policyBaseline.appServiceQuota.validatedAtUtc
  s1RegionAvailable = $true
  costCeilingUsd = 80
  costVerified = -not $SkipCostEstimate
} | ConvertTo-Json -Depth 5
