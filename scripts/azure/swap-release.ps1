[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][ValidateSet('forward', 'rollback')][string]$Direction,
  [Parameter(Mandatory = $true)][string]$WebAppName,
  [string]$ResourceGroup = 'myArena',
  [string]$StatePath = 'artifacts/release-state.json'
)

$ErrorActionPreference = 'Stop'
$stateDirectory = Split-Path -Parent $StatePath
if ($stateDirectory) {
  New-Item -ItemType Directory -Path $stateDirectory -Force | Out-Null
}
$state = if (Test-Path $StatePath) { Get-Content -Raw $StatePath | ConvertFrom-Json } else { $null }
if ($state -and $state.status -eq 'draining' -and $Direction -eq 'forward') {
  throw "A $($state.direction) drain is active until $($state.drainDeadlineUtc)."
}

$started = (Get-Date).ToUniversalTime()
if ($Direction -eq 'rollback') {
  az webapp start --resource-group $ResourceGroup --name $WebAppName --slot staging
  if ($LASTEXITCODE -ne 0) {
    throw 'Unable to start the retained healthy package in staging for rollback.'
  }
}
az webapp deployment slot swap `
  --resource-group $ResourceGroup `
  --name $WebAppName `
  --slot staging `
  --target-slot production
if ($LASTEXITCODE -ne 0) {
  throw "Slot swap '$Direction' failed."
}
$completed = (Get-Date).ToUniversalTime()
$deadline = $completed.AddMinutes(30)
$next = [ordered]@{
  schemaVersion = 1
  status = 'draining'
  direction = $Direction
  swapStartedUtc = $started.ToString('o')
  swapCompletedUtc = $completed.ToString('o')
  drainDeadlineUtc = $deadline.ToString('o')
  postSwapSettingMutation = 'absent'
  activeSlot = 'production'
  drainingSlot = 'staging'
}
$next | ConvertTo-Json -Depth 5 | Set-Content -Path $StatePath -Encoding utf8
Write-Output ($next | ConvertTo-Json -Depth 5)
