targetScope = 'resourceGroup'

param name string
param location string
param serverFarmResourceId string
param tags object = {}
param stickyAppSettingNames array

@secure()
param appSettings object

module site 'br/public:avm/res/web/site:0.24.1' = {
  name: 'webApp'
  params: {
    name: name
    location: location
    kind: 'app,linux'
    serverFarmResourceId: serverFarmResourceId
    httpsOnly: true
    clientAffinityEnabled: true
    managedIdentities: {
      systemAssigned: true
    }
    publicNetworkAccess: 'Enabled'
    basicPublishingCredentialsPolicies: [
      {
        name: 'ftp'
        allow: false
      }
      {
        name: 'scm'
        allow: false
      }
    ]
    siteConfig: {
      alwaysOn: true
      webSocketsEnabled: true
      http20Enabled: true
      minTlsVersion: '1.2'
      ftpsState: 'Disabled'
      linuxFxVersion: 'NODE|22-lts'
      healthCheckPath: '/healthz'
      numberOfWorkers: 1
      scmType: 'None'
      appSettings: map(items(appSettings), setting => {
        name: setting.key
        value: string(setting.value)
      })
    }
    enableTelemetry: false
    tags: tags
  }
}

resource webApp 'Microsoft.Web/sites@2024-11-01' existing = {
  name: name
}

resource slotConfigNames 'Microsoft.Web/sites/config@2024-11-01' = {
  name: 'slotConfigNames'
  parent: webApp
  properties: {
    appSettingNames: stickyAppSettingNames
    connectionStringNames: []
    azureStorageConfigNames: []
  }
  dependsOn: [
    site
  ]
}

output resourceId string = site.outputs.resourceId
output name string = site.outputs.name
output defaultHostname string = site.outputs.defaultHostname
output systemAssignedMIPrincipalId string = site.outputs.?systemAssignedMIPrincipalId ?? ''
