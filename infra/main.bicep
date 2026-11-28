targetScope = 'resourceGroup'

@description('Canonical production region for myArena.')
@allowed([
  'centralindia'
])
param location string = 'centralindia'

param baseName string = 'myarena-${uniqueString(resourceGroup().id)}'
param releaseId string = ''
param tags object = {
  application: 'myArena'
  environment: 'production'
  region: location
}

var webAppName = '${baseName}-app'
var publicOrigin = 'https://${webAppName}.azurewebsites.net'
var drainOrigin = 'https://${webAppName}-staging.azurewebsites.net'

module appServicePlan './modules/app-service-plan.bicep' = {
  name: 'myArenaAppServicePlan'
  params: {
    name: '${baseName}-plan'
    location: location
    tags: tags
  }
}

module monitoring './modules/monitoring.bicep' = {
  name: 'myArenaMonitoring'
  params: {
    location: location
    workspaceName: '${baseName}-logs'
    applicationInsightsName: '${baseName}-ai'
    tags: tags
  }
}

module productionSettings './modules/app-settings.bicep' = {
  name: 'productionSettings'
  params: {
    slotIdentity: 'production'
    applicationInsightsConnectionString: monitoring.outputs.applicationInsightsConnectionString
    publicOrigin: publicOrigin
    drainOrigin: drainOrigin
    releaseId: releaseId
  }
}

module webApp './modules/web-app.bicep' = {
  name: 'myArenaWebApp'
  params: {
    name: webAppName
    location: location
    serverFarmResourceId: appServicePlan.outputs.resourceId
    stickyAppSettingNames: productionSettings.outputs.stickyNames
    appSettings: productionSettings.outputs.values
    tags: tags
  }
}

module stagingSettings './modules/app-settings.bicep' = {
  name: 'stagingSettings'
  params: {
    slotIdentity: 'staging'
    applicationInsightsConnectionString: monitoring.outputs.applicationInsightsConnectionString
    publicOrigin: publicOrigin
    drainOrigin: drainOrigin
    releaseId: releaseId
  }
}

module stagingSlot './modules/staging-slot.bicep' = {
  name: 'myArenaStagingSlot'
  params: {
    appName: webApp.outputs.name
    location: location
    serverFarmResourceId: appServicePlan.outputs.resourceId
    appSettings: stagingSettings.outputs.values
    tags: tags
  }
}

module identity './modules/identity.bicep' = {
  name: 'myArenaIdentity'
  params: {
    webAppName: webApp.outputs.name
    applicationInsightsName: '${baseName}-ai'
    stagingPrincipalId: stagingSlot.outputs.systemAssignedMIPrincipalId
  }
}

output webAppName string = webApp.outputs.name
output productionOrigin string = 'https://${webApp.outputs.defaultHostname}'
output stagingOrigin string = drainOrigin
output webAppResourceId string = webApp.outputs.resourceId
output stagingSlotResourceId string = stagingSlot.outputs.resourceId
output systemAssignedPrincipalId string = identity.outputs.systemAssignedPrincipalId
output logAnalyticsWorkspaceResourceId string = monitoring.outputs.workspaceResourceId
output applicationInsightsResourceId string = monitoring.outputs.applicationInsightsResourceId
