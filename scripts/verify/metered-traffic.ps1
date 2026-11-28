[CmdletBinding()]
param(
  [string]$ClientSocketPath = 'client/src/state/socket.ts',
  [string]$IdleTrafficPath = 'artifacts/idle-traffic.json'
)

$ErrorActionPreference = 'Stop'
$source = Get-Content -Raw $ClientSocketPath
if ($source -notmatch 'disconnectSocket') {
  throw 'Client socket has no explicit idle disconnect path.'
}
if ($source -match 'setInterval.*keepalive|fetch\(.*health') {
  throw 'Client source contains an application-level idle keepalive.'
}
if (Test-Path $IdleTrafficPath) {
  $idle = Get-Content -Raw $IdleTrafficPath | ConvertFrom-Json
  if ([int]$idle.gameplayKeepaliveRequests -ne 0) {
    throw 'Idle operation generated gameplay keepalive requests.'
  }
}
[ordered]@{
  explicitDisconnect = $true
  gameplayKeepaliveRequests = 0
  idleSample = Test-Path $IdleTrafficPath
} | ConvertTo-Json
