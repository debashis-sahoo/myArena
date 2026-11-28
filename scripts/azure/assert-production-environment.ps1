[CmdletBinding()]
param(
  [string]$Repository = 'debashis-sahoo/myArena',
  [string]$Environment = 'production',
  [string]$RequiredReviewer,
  [bool]$PreventSelfReview = $false,
  [switch]$Configure
)

$ErrorActionPreference = 'Stop'

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
  throw 'GitHub CLI (gh) is required to verify the protected production environment.'
}

function Invoke-Gh {
  param([string[]]$Arguments)
  $output = & gh @Arguments 2>&1
  if ($LASTEXITCODE -ne 0) {
    throw "GitHub CLI failed: $($output -join [Environment]::NewLine)"
  }
  return $output -join [Environment]::NewLine
}

$path = "repos/$Repository/environments/$Environment"
if ($Configure) {
  if (-not $RequiredReviewer) {
    throw 'RequiredReviewer is mandatory when -Configure is supplied.'
  }
  $body = @{
    wait_timer = 0
    prevent_self_review = $PreventSelfReview
    deployment_branch_policy = @{
      protected_branches = $true
      custom_branch_policies = $false
    }
    reviewers = @(
      @{
        type = 'User'
        id = [int64](Invoke-Gh @('api', "users/$RequiredReviewer", '--jq', '.id'))
      }
    )
  } | ConvertTo-Json -Depth 8
  $temp = New-TemporaryFile
  try {
    Set-Content -Path $temp.FullName -Value $body
    & gh api --method PUT $path --input $temp.FullName
    if ($LASTEXITCODE -ne 0) {
      throw 'Unable to update the protected GitHub environment.'
    }
  } finally {
    Remove-Item -LiteralPath $temp.FullName -Force
  }
}

$environmentData = gh api $path | ConvertFrom-Json
if ($LASTEXITCODE -ne 0) {
  throw "Unable to read environment '$Environment'."
}
$reviewRule = @($environmentData.protection_rules | Where-Object { $_.type -eq 'required_reviewers' })
if ($reviewRule.Count -eq 0) {
  throw "Environment '$Environment' has no required reviewer."
}
$reviewerLogins = @($reviewRule.reviewers | ForEach-Object {
    if ($_.login) { $_.login }
    elseif ($_.reviewer.login) { $_.reviewer.login }
  })
if ($RequiredReviewer) {
  if ($reviewerLogins -notcontains $RequiredReviewer) {
    throw "Environment '$Environment' does not include required reviewer '$RequiredReviewer'."
  }
}
if ($environmentData.deployment_branch_policy.protected_branches -ne $true) {
  throw "Environment '$Environment' is not restricted to protected branches."
}
if ([bool]$reviewRule.prevent_self_review -ne $PreventSelfReview) {
  throw "Environment '$Environment' self-review policy does not match the release configuration."
}

[ordered]@{
  repository = $Repository
  environment = $Environment
  reviewers = @($reviewerLogins)
  protectedBranches = $true
  preventSelfReview = $PreventSelfReview
} | ConvertTo-Json -Depth 6
