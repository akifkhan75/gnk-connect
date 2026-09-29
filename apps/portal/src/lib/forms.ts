import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { ApiError } from '@gnk/api-client';

/** Maps an API 422's field errors onto the form; returns the message for a form-level alert. */
export function applyServerErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
): string {
  if (error instanceof ApiError) {
    for (const [path, message] of Object.entries(error.fieldErrors))
      setError(path as Path<T>, { type: 'server', message });
    return Object.keys(error.fieldErrors).length
      ? 'Please fix the highlighted fields.'
      : error.message;
  }
  return error instanceof Error ? error.message : 'Something went wrong';
}

export const errorMessage = (e: unknown) =>
  e instanceof Error ? e.message : 'Something went wrong';

/** Browser-generated idempotency key for a single submit attempt. */
export const newIdempotencyKey = () => crypto.randomUUID();
