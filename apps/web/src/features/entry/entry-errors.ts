import { displayNameSchema } from '@myarena/protocol';
import type { FormError } from '../../a11y/ErrorSummary';
import { ApiError } from '../../platform/api-client';

/** Maps a failed request to form errors; server field errors point at the field named in `fieldMap`. */
export function toFormErrors(error: unknown, fieldId: string, fieldMap: Record<string, string> = {}): FormError[] {
  if (error instanceof ApiError) {
    if (error.fieldErrors.length > 0) {
      return error.fieldErrors.map((problem) => ({ message: problem.message, nextStep: error.nextStep, fieldId: fieldMap[problem.field] ?? fieldId }));
    }
    return [{ message: error.message, nextStep: error.nextStep, fieldId: error.code === 'VALIDATION_FAILED' ? fieldId : undefined }];
  }
  return [{ message: 'Something went wrong.', nextStep: 'Try again.' }];
}

export function validateName(name: string, fieldId: string): { name: string } | { errors: FormError[] } {
  const parsed = displayNameSchema.safeParse(name);
  if (parsed.success) return { name: parsed.data };
  return { errors: [{ message: parsed.error.issues[0]?.message ?? 'Enter a display name.', nextStep: 'Use 1 to 24 letters, numbers, or spaces.', fieldId }] };
}
