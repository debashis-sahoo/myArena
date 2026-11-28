[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string]$Endpoint,
  [int]$Checks = 20,
  [int]$MaxSeconds = 10
)

$ErrorActionPreference = 'Stop'
$results = [Collections.Generic.List[object]]::new()
for ($i = 0; $i -lt $Checks; $i++) {
  $started = [Diagnostics.Stopwatch]::StartNew()
  $ok = $false
  try {
    $response = Invoke-WebRequest -Uri $Endpoint -UseBasicParsing
    $ok = $response.StatusCode -eq 200
  } catch {
    $ok = $false
  }
  $started.Stop()
  $results.Add([ordered]@{ ok = $ok; seconds = $started.Elapsed.TotalSeconds })
  Start-Sleep -Seconds 30
}
$usable = @($results | Where-Object { $_.ok -and $_.seconds -lt $MaxSeconds }).Count
$percentage = if ($Checks -eq 0) { 0 } else { $usable / $Checks }
if ($percentage -lt 0.95) {
  throw "Only $([math]::Round($percentage * 100, 2))% of page checks became usable within $MaxSeconds seconds."
}
[ordered]@{
  checks = $Checks
  usableWithinSeconds = $MaxSeconds
  successPercent = $percentage * 100
  maxSecondsObserved = [math]::Round(($results.seconds | Measure-Object -Maximum).Maximum, 3)
} | ConvertTo-Json
