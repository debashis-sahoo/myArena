export const problems = {
  VALIDATION_FAILED: { detail: 'Some information is missing or invalid.', nextStep: 'Check the fields and try again.' },
  INVITATION_UNAVAILABLE: { detail: 'This invitation is unavailable.', nextStep: 'Ask the host for a new invitation.' },
  ROOM_FULL: { detail: 'This room has no seats available.', nextStep: 'Ask the host to make space or create another room.' },
  SERVICE_AT_CAPACITY: { detail: 'The service is at capacity.', nextStep: 'Try again later.' },
  RECOVERY_EXPIRED: { detail: 'Your seat can no longer be recovered.', nextStep: 'Create a new room or ask the host to arrange another room.' },
  UNAUTHENTICATED: { detail: 'A room membership is required.', nextStep: 'Join through a valid invitation.' },
  RATE_LIMITED: { detail: 'Too many requests were sent.', nextStep: 'Wait a moment and try again.' },
  ORIGIN_NOT_ALLOWED: { detail: 'This request came from an unrecognized origin.', nextStep: 'Open the room from the original site.' },
  GAME_UNAVAILABLE: { detail: 'This game is unavailable.', nextStep: 'Select another game.' },
} as const;

export const rejections = {
  NOT_HOST: { detail: 'Only the current host can do this.', nextStep: 'Ask the current host.' },
  FORBIDDEN_TARGET: { detail: 'You cannot change another member\'s state.', nextStep: 'Use your own controls.' },
  VALIDATION_FAILED: problems.VALIDATION_FAILED,
  GAME_UNAVAILABLE: problems.GAME_UNAVAILABLE,
  START_BLOCKED_NOT_READY: { detail: 'Some players are not ready.', nextStep: 'Wait for every player to be ready.' },
  START_BLOCKED_DISCONNECTED: { detail: 'A player is disconnected.', nextStep: 'Wait for them to reconnect or for their seat to expire.' },
  START_BLOCKED_PARTICIPANT_COUNT: { detail: 'The number of participants is outside this game\'s limits.', nextStep: 'Adjust participants or select another game.' },
  NO_GAME_SELECTED: { detail: 'No game is selected.', nextStep: 'Select a game.' },
  MATCH_NOT_ENDED: { detail: 'The match has not ended.', nextStep: 'Wait for the match to finish.' },
  TARGET_NOT_ELIGIBLE: { detail: 'That member is not eligible to host.', nextStep: 'Select a current member.' },
  TARGET_NOT_FOUND: { detail: 'That member no longer holds a seat.', nextStep: 'Refresh the member list.' },
  CANNOT_REMOVE_SELF: { detail: 'The host cannot remove themselves.', nextStep: 'Leave or transfer the host role instead.' },
  RATE_LIMITED: problems.RATE_LIMITED,
  ROOM_CLOSED: { detail: 'This room is no longer available.', nextStep: 'Create or join another room.' },
} as const;

export type ProblemCode = keyof typeof problems;
export type RejectionCode = keyof typeof rejections;