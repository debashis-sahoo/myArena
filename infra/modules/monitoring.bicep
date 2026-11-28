targetScope = 'resourceGroup'

param location string
param workspaceName string
param applicationInsightsName string
param tags object = {}

module workspace 'br/public:avm/res/operational-insights/workspace:0.16.2' = {
  name: 'logAnalyticsWorkspace'
  params: {
    name: workspaceName
    location: location
    dailyQuotaGb: '0.1'
    dataRetention: 30
    publicNetworkAccessForIngestion: 'Enabled'
    publicNetworkAccessForQuery: 'Enabled'
    enableTelemetry: false
    tags: tags
  }
}

module applicationInsights 'br/public:avm/res/insights/component:0.8.0' = {
  name: 'applicationInsights'
  params: {
    name: applicationInsightsName
    location: location
    kind: 'web'
    applicationType: 'web'
    workspaceResourceId: workspace.outputs.resourceId
    enableTelemetry: false
    tags: tags
  }
}

output workspaceResourceId string = workspace.outputs.resourceId
output workspaceName string = workspace.outputs.name
output applicationInsightsResourceId string = applicationInsights.outputs.resourceId
@secure()
output applicationInsightsConnectionString string = applicationInsights.outputs.connectionString
