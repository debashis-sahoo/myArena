[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string]$WebAppName,
  [string]$ResourceGroup = 'myArena',
  [string]$StatePath = 'artifacts/release-state.json'
)

$ErrorActionPreference = 'Stop'
if (-not (Test-Path $StatePath)) {
  throw "Release drain state '$StatePath' is missing."
}
$state = Get-Content -Raw $StatePath | ConvertFrom-Json
if ($state.status -ne 'draining') {
  throw "Release state '$($state.status)' is not drainable."
}
$deadline = [DateTimeOffset]::Parse($state.drainDeadlineUtc)
$deadlineReached = [DateTimeOffset]::UtcNow -ge $deadline
$stagingUrl = "https://$WebAppName-staging.azurewebsites.net"
$roomCount = if ($deadlineReached) { 0 } else { (Invoke-RestMethod "$stagingUrl/healthz" -Method Get).rooms }
if (-not $deadlineReached -and [int]$roomCount -gt 0) {
  Write-Output ([ordered]@{
    status = 'waiting'
    drainDeadlineUtc = $deadline.ToUniversalTime().ToString('o')
    rooms = [int]$roomCount
  } | ConvertTo-Json)
  return
}

az webapp stop --resource-group $ResourceGroup --name $WebAppName --slot staging
if ($LASTEXITCODE -ne 0) {
  throw 'Failed to stop the draining staging slot.'
}
$state.status = 'retired'
$state.retiredUtc = [DateTimeOffset]::UtcNow.ToUniversalTime().ToString('o')
$state.roomCountAtRetirement = [int]$roomCount
$state | ConvertTo-Json -Depth 6 | Set-Content -Path $StatePath -Encoding utf8
Write-Output ($state | ConvertTo-Json -Depth 6)
