targetScope = 'resourceGroup'

@description('Immutable physical slot identity.')
@allowed([
  'production'
  'staging'
])
param slotIdentity string

@secure()
param applicationInsightsConnectionString string

param publicOrigin string
param drainOrigin string
param releaseId string = ''

@secure()
param candidateVerifierTokenHash string = ''
param candidateVerifierExpiresUtc string = ''

var requiredSettings = {
  NODE_ENV: 'production'
  PORT: '8080'
  SLOT_IDENTITY: slotIdentity
  PUBLIC_ORIGIN: publicOrigin
  DRAIN_ORIGIN: drainOrigin
  RELEASE_ID: releaseId
  MAX_SOCKETS: '500'
  OTEL_TRACES_SAMPLER: 'traceidratio'
  OTEL_TRACES_SAMPLER_ARG: '0.1'
  WEBSITE_RUN_FROM_PACKAGE: '1'
  SCM_DO_BUILD_DURING_DEPLOYMENT: 'false'
  APPLICATIONINSIGHTS_CONNECTION_STRING: applicationInsightsConnectionString
}

var verifierSettings = empty(candidateVerifierTokenHash)
  ? {}
  : {
      CANDIDATE_VERIFIER_TOKEN_HASH: candidateVerifierTokenHash
      CANDIDATE_VERIFIER_EXPIRES_UTC: candidateVerifierExpiresUtc
    }

@secure()
output values object = union(requiredSettings, verifierSettings)

output stickyNames array = [
  'SLOT_IDENTITY'
  'PUBLIC_ORIGIN'
  'DRAIN_ORIGIN'
  'CANDIDATE_VERIFIER_TOKEN_HASH'
  'CANDIDATE_VERIFIER_EXPIRES_UTC'
]
