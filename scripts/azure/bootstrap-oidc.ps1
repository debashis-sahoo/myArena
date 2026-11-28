[CmdletBinding()]
param(
  [string]$InputsPath = '.azure/oidc-inputs.example.json'
)

$ErrorActionPreference = 'Stop'
$inputs = Get-Content -Raw $InputsPath | ConvertFrom-Json
$scope = "/subscriptions/$($inputs.subscriptionId)/resourceGroups/$($inputs.resourceGroup)"
$matches = @(az ad app list --display-name $inputs.applicationDisplayName --query '[].appId' -o tsv)
if ($LASTEXITCODE -ne 0) {
  throw 'Unable to query the OIDC Entra application.'
}
if ($matches.Count -gt 1) {
  throw "Multiple Entra applications match '$($inputs.applicationDisplayName)'."
}
$clientId = if ($matches.Count -eq 1) {
  $matches[0]
} else {
  az ad app create --display-name $inputs.applicationDisplayName --query appId -o tsv
}
if (-not $clientId -or $LASTEXITCODE -ne 0) {
  throw 'Unable to create or resolve the OIDC Entra application.'
}
$objectId = az ad app show --id $clientId --query id -o tsv
$repository = gh api "repos/$($inputs.repository)" | ConvertFrom-Json
$owner = gh api "users/$($repository.owner.login)" | ConvertFrom-Json
$subjectPrefix = "repo:$($repository.owner.login)@$($owner.id)/$($repository.name)@$($repository.id)"
$desiredCredentials = @(
  @{
    name = 'github-main'
    subject = "${subjectPrefix}:ref:refs/heads/main"
  },
  @{
    name = 'github-pull-request'
    subject = "${subjectPrefix}:pull_request"
  },
  @{
    name = 'github-production'
    subject = "${subjectPrefix}:environment:$($inputs.environment)"
  }
)
$credentials = @(az ad app federated-credential list --id $objectId | ConvertFrom-Json)
foreach ($desired in $desiredCredentials) {
  $existing = @($credentials | Where-Object { $_.name -eq $desired.name })
  if ($existing.Count -gt 0 -and (
      $existing[0].subject -ne $desired.subject -or
      $existing[0].issuer -ne 'https://token.actions.githubusercontent.com'
    )) {
    az ad app federated-credential delete --id $objectId --federated-credential-id $desired.name | Out-Null
    if ($LASTEXITCODE -ne 0) {
      throw "Unable to replace outdated GitHub OIDC credential '$($desired.name)'."
    }
    $existing = @()
  }
  if ($existing.Count -eq 0) {
    $credential = @{
      name = $desired.name
      issuer = 'https://token.actions.githubusercontent.com'
      subject = $desired.subject
      audiences = @('api://AzureADTokenExchange')
    } | ConvertTo-Json -Compress
    $temp = New-TemporaryFile
    try {
      Set-Content -Path $temp.FullName -Value $credential
      az ad app federated-credential create --id $objectId --parameters "@$($temp.FullName)" | Out-Null
      if ($LASTEXITCODE -ne 0) {
        throw "Unable to create GitHub OIDC federated credential '$($desired.name)'."
      }
    } finally {
      Remove-Item -LiteralPath $temp.FullName -Force
    }
  }
}

$principal = az ad sp show --id $clientId 2>$null
if ($LASTEXITCODE -ne 0) {
  az ad sp create --id $clientId | Out-Null
}
$principalId = az ad sp show --id $clientId --query id -o tsv
$roleAssignments = az role assignment list --assignee $clientId --scope $scope --query "[?roleDefinitionName=='$($inputs.roleDefinition)'].id" -o tsv
if (-not $roleAssignments) {
  az role assignment create `
    --assignee-object-id $principalId `
    --assignee-principal-type ServicePrincipal `
    --role $inputs.roleDefinition `
    --scope $scope | Out-Null
  if ($LASTEXITCODE -ne 0) {
    throw 'Unable to grant the OIDC principal its resource-group role.'
  }
}

[ordered]@{
  clientId = $clientId
  tenantId = $inputs.tenantId
  subscriptionId = $inputs.subscriptionId
  resourceGroupScope = $scope
  federatedSubjects = @($desiredCredentials.subject)
} | ConvertTo-Json
