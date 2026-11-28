targetScope = 'resourceGroup'

param appName string
param location string
param serverFarmResourceId string
param tags object = {}
@secure()
param appSettings object

module slot 'br/public:avm/res/web/site/slot:0.5.1' = {
  name: 'stagingSlot'
  params: {
    name: 'staging'
    appName: appName
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

output resourceId string = slot.outputs.resourceId
output name string = slot.outputs.name
output systemAssignedMIPrincipalId string = slot.outputs.?systemAssignedMIPrincipalId ?? ''
