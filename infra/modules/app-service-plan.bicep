targetScope = 'resourceGroup'

param name string
param location string
param tags object = {}

module serverFarm 'br/public:avm/res/web/serverfarm:0.7.1' = {
  name: 'appServicePlan'
  params: {
    name: name
    location: location
    kind: 'linux'
    reserved: true
    skuName: 'S1'
    skuCapacity: 1
    zoneRedundant: false
    perSiteScaling: false
    enableTelemetry: false
    tags: tags
  }
}

output resourceId string = serverFarm.outputs.resourceId
output name string = serverFarm.outputs.name
