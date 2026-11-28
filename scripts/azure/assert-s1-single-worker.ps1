[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string]$ResourceGroup,
  [Parameter(Mandatory = $true)][string]$PlanName
)

$ErrorActionPreference = 'Stop'

$plan = az appservice plan show --resource-group $ResourceGroup --name $PlanName | ConvertFrom-Json
if ($LASTEXITCODE -ne 0) {
  throw 'Unable to read the App Service plan.'
}
if ($plan.sku.name -ne 'S1') {
  throw "Expected S1, found $($plan.sku.name)."
}
if ([int]$plan.sku.capacity -ne 1) {
  throw "Expected one worker, found $($plan.sku.capacity)."
}

$autoscaleIds = az monitor autoscale list `
  --resource-group $ResourceGroup `
  --query "[?targetResourceUri=='$($plan.id)'].id" `
  -o tsv
if ($LASTEXITCODE -ne 0) {
  throw 'Unable to inspect autoscale settings.'
}
if ($autoscaleIds) {
  throw 'Autoscale is enabled for the stateful myArena App Service plan.'
}

[ordered]@{
  resourceGroup = $ResourceGroup
  plan = $PlanName
  sku = $plan.sku.name
  workers = [int]$plan.sku.capacity
  autoscale = 'disabled'
} | ConvertTo-Json
