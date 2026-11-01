export type ServerPhase = 'starting' | 'ready' | 'draining';

let phase: ServerPhase = 'starting';

export function getServerPhase(): ServerPhase {
  return phase;
}

export function setServerPhase(next: ServerPhase): void {
  phase = next;
}
