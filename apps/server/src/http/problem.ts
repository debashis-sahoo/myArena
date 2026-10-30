import { problems, type ProblemCode } from '@myarena/protocol';
import type { FastifyReply } from 'fastify';
import type { FieldError } from '../errors.js';

export { ProblemError } from '../errors.js';

const statuses: Record<ProblemCode, number> = {
  VALIDATION_FAILED: 400, INVITATION_UNAVAILABLE: 404, ROOM_FULL: 409,
  SERVICE_AT_CAPACITY: 503, RECOVERY_EXPIRED: 410, UNAUTHENTICATED: 401,
  RATE_LIMITED: 429, ORIGIN_NOT_ALLOWED: 403, GAME_UNAVAILABLE: 409,
};
export function problemBody(code: ProblemCode, fieldErrors?: FieldError[]) {
  return {
    type: `urn:myarena:problem:${code.toLowerCase()}`, title: problems[code].detail, status: statuses[code], code, ...problems[code],
    ...(fieldErrors?.length ? { fieldErrors } : {}),
  };
}
export function sendProblem(reply: FastifyReply, code: ProblemCode, fieldErrors?: FieldError[]) {
  return reply.code(statuses[code]).type('application/problem+json').send(problemBody(code, fieldErrors));
}