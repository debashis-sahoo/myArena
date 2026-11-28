[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string]$ManifestPath,
  [string]$ResourceGroup = 'myArena',
  [Parameter(Mandatory = $true)][string]$WebAppName
)

$ErrorActionPreference = 'Stop'
$manifest = Get-Content -Raw $ManifestPath | ConvertFrom-Json
$zipPath = Join-Path (Get-Location) $manifest.artifactPath
if (-not (Test-Path $zipPath)) {
  throw "Artifact '$zipPath' is missing."
}
$actual = "sha256:$((Get-FileHash -Algorithm SHA256 $zipPath).Hash.ToLowerInvariant())"
if ($actual -ne $manifest.artifactDigest) {
  throw "Artifact digest mismatch: expected $($manifest.artifactDigest), found $actual."
}
if ($manifest.commitSha -notmatch '^[0-9a-f]{40}$') {
  throw 'Artifact manifest is missing an immutable 40-character commit SHA.'
}

az webapp start --resource-group $ResourceGroup --name $WebAppName --slot staging
if ($LASTEXITCODE -ne 0) {
  throw 'Unable to start the staging slot before deployment.'
}
$deployed = $false
for ($attempt = 1; $attempt -le 3; $attempt++) {
  az webapp deployment source config-zip `
    --resource-group $ResourceGroup `
    --name $WebAppName `
    --slot staging `
    --src $zipPath
  if ($LASTEXITCODE -eq 0) {
    $deployed = $true
    break
  }
  if ($attempt -lt 3) {
    Start-Sleep -Seconds (30 * $attempt)
  }
}
if (-not $deployed) {
  throw 'Staging ZIP deployment failed after three bounded attempts.'
}

[ordered]@{
  artifactDigest = $manifest.artifactDigest
  commitSha = $manifest.commitSha
  deployedSlot = 'staging'
} | ConvertTo-Json
