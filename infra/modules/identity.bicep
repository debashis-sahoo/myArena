targetScope = 'resourceGroup'

param webAppName string
param applicationInsightsName string
param stagingPrincipalId string

resource webApp 'Microsoft.Web/sites@2024-11-01' existing = {
  name: webAppName
}

resource applicationInsights 'Microsoft.Insights/components@2020-02-02' existing = {
  name: applicationInsightsName
}

resource monitoringMetricsPublisher 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(applicationInsights.id, webApp.id, 'Monitoring Metrics Publisher')
  scope: applicationInsights
  properties: {
    roleDefinitionId: subscriptionResourceId(
      'Microsoft.Authorization/roleDefinitions',
      '3913510d-42f4-4e42-8a64-420c390055eb'
    )
    principalId: webApp.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

resource stagingMonitoringMetricsPublisher 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(applicationInsights.id, stagingPrincipalId, 'Monitoring Metrics Publisher')
  scope: applicationInsights
  properties: {
    roleDefinitionId: subscriptionResourceId(
      'Microsoft.Authorization/roleDefinitions',
      '3913510d-42f4-4e42-8a64-420c390055eb'
    )
    principalId: stagingPrincipalId
    principalType: 'ServicePrincipal'
  }
}

output systemAssignedPrincipalId string = webApp.identity.principalId
output leastPrivilegeScope string = applicationInsights.id
output roleAssignmentCount int = 2
