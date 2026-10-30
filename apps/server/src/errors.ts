import { problems, type ProblemCode } from '@myarena/protocol';

export interface FieldError { field: string; message: string; }

export class ProblemError extends Error {
  constructor(public readonly code: ProblemCode, public readonly fieldErrors?: FieldError[]) {
    super(problems[code].detail);
  }
}
