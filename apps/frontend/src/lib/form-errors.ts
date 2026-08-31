import toast from 'react-hot-toast';
import type { FieldErrors, FieldValues } from 'react-hook-form';

const DEFAULT_FALLBACK = 'Please fix the highlighted fields.';

function firstMessage(errors: FieldErrors): string | undefined {
  for (const val of Object.values(errors)) {
    if (!val || typeof val !== 'object') continue;
    if ('message' in val && typeof (val as { message?: unknown }).message === 'string') {
      return (val as { message: string }).message;
    }
    const nested = firstMessage(val as FieldErrors);
    if (nested) return nested;
  }
  return undefined;
}

/** Surfaces the first nested field error (including Zod refine paths) in a toast. */
export function toastFirstFieldError<T extends FieldValues>(errors: FieldErrors<T>) {
  toast.error(firstMessage(errors as FieldErrors) ?? DEFAULT_FALLBACK);
}

/**
 * Same handler with a caller-supplied fallback, for screens that render in the
 * visitor's language. Returns a `SubmitErrorHandler`, so it drops straight into
 * `handleSubmit(onValid, createFieldErrorToast(t('…')))`.
 */
export function createFieldErrorToast(fallback: string) {
  return <T extends FieldValues>(errors: FieldErrors<T>) => {
    toast.error(firstMessage(errors as FieldErrors) ?? fallback);
  };
}
