[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string]$CandidateUrl,
  [string]$CandidateVerifierToken = $env:CANDIDATE_VERIFIER_TOKEN,
  [int]$Attempts = 30
)

$ErrorActionPreference = 'Stop'
if ([Uri]$CandidateUrl -and ([Uri]$CandidateUrl).Scheme -ne 'https') {
  throw 'CandidateUrl must use HTTPS outside local smoke validation.'
}
if (-not $CandidateVerifierToken) {
  throw 'A short-lived candidate verifier token is required for staging room creation.'
}

$healthy = $false
for ($i = 0; $i -lt $Attempts; $i++) {
  try {
    $response = Invoke-RestMethod -Uri "$($CandidateUrl.TrimEnd('/'))/healthz" -Method Get
    if ($response.status -eq 'ok' -and $response.slot -eq 'staging') {
      $healthy = $true
      break
    }
  } catch {
    # Warm-up is intentionally retried.
  }
  Start-Sleep -Seconds 10
}
if (-not $healthy) {
  throw "Candidate '$CandidateUrl' did not become healthy as the staging slot."
}

$oldVerifier = $env:CANDIDATE_VERIFIER_TOKEN
$oldSmokeUrl = $env:SMOKE_URL
$oldCandidateOnly = $env:SMOKE_CANDIDATE_ONLY
$oldSmokeTestOrigin = $env:SMOKE_TEST_ORIGIN
try {
  $env:CANDIDATE_VERIFIER_TOKEN = $CandidateVerifierToken
  $env:SMOKE_URL = $CandidateUrl
  $env:SMOKE_CANDIDATE_ONLY = '1'
  $productionHost = ([Uri]$CandidateUrl).Host -replace '-staging\.azurewebsites\.net$', '.azurewebsites.net'
  $env:SMOKE_TEST_ORIGIN = "https://$productionHost"
  & npm run smoke
  if ($LASTEXITCODE -ne 0) {
    throw 'Candidate room-flow smoke validation failed.'
  }
} finally {
  $env:CANDIDATE_VERIFIER_TOKEN = $oldVerifier
  $env:SMOKE_URL = $oldSmokeUrl
  $env:SMOKE_CANDIDATE_ONLY = $oldCandidateOnly
  $env:SMOKE_TEST_ORIGIN = $oldSmokeTestOrigin
  $CandidateVerifierToken = ''
}

[ordered]@{
  candidateUrl = $CandidateUrl
  health = 'pass'
  https = 'pass'
  websocket = 'pass'
  roomFlow = 'pass'
  verifierMasked = $true
} | ConvertTo-Json
