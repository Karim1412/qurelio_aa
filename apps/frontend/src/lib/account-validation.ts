import { z } from 'zod';
import { isValidPhoneNumber } from 'libphonenumber-js/min';

export const ACCOUNT_PASSWORD_MESSAGE =
  'Use 8–128 characters with uppercase, lowercase, a number, and a special character.';

export const ACCOUNT_PHONE_MESSAGE = 'Enter a valid phone number with country code.';

/**
 * Validation copy, so a screen with a translation dictionary can build the same
 * schemas in the visitor's language. Defaults reproduce the English messages,
 * which keeps the pre-existing schema exports below unchanged.
 */
export interface AccountValidationMessages {
  passwordMin: string;
  passwordMax: string;
  passwordComplexity: string;
  phoneRequired: string;
  phoneInvalid: string;
}

export const DEFAULT_ACCOUNT_VALIDATION_MESSAGES: AccountValidationMessages = {
  passwordMin: 'At least 8 characters',
  passwordMax: 'Maximum 128 characters',
  passwordComplexity: ACCOUNT_PASSWORD_MESSAGE,
  phoneRequired: 'Phone required',
  phoneInvalid: ACCOUNT_PHONE_MESSAGE,
};

export function normalizeInternationalPhone(s: string): string {
  return s.replace(/[\s\-().]/g, '');
}

const PASSWORD_COMPLEXITY = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])/;

/** New passwords (register, reset, change, setup), with caller-supplied copy. */
export function createPasswordPolicy(
  messages: AccountValidationMessages = DEFAULT_ACCOUNT_VALIDATION_MESSAGES,
) {
  return z
    .string()
    .min(8, messages.passwordMin)
    .max(128, messages.passwordMax)
    .regex(PASSWORD_COMPLEXITY, { message: messages.passwordComplexity });
}

/** New passwords, English copy. */
export const zPasswordPolicy = createPasswordPolicy();

const PHONE_E164 = /^\+[1-9]\d{6,14}$/;

function phonePreprocess(val: unknown): string {
  if (val === undefined || val === null) return '';
  return String(val);
}

/** Required phone with caller-supplied copy: accepts `undefined` from PhoneInput before submit. */
export function createPhoneE164Required(
  messages: AccountValidationMessages = DEFAULT_ACCOUNT_VALIDATION_MESSAGES,
) {
  return z.preprocess(
    phonePreprocess,
    z
      .string()
      .min(1, messages.phoneRequired)
      .superRefine((val, ctx) => {
        const s = normalizeInternationalPhone(val.trim());
        if (!s) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: messages.phoneRequired });
          return;
        }
        if (!isValidPhoneNumber(s)) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: messages.phoneInvalid });
          return;
        }
        if (!PHONE_E164.test(s)) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: messages.phoneInvalid });
        }
      })
      .transform((val) => normalizeInternationalPhone(val.trim())),
  );
}

/** Required phone, English copy. */
export const zPhoneE164Required = createPhoneE164Required();

/** Profile: allow empty; otherwise must be a valid international number. */
export const zPhoneE164Optional = z.preprocess(
  phonePreprocess,
  z
    .string()
    .transform((s) => normalizeInternationalPhone(s.trim()))
    .superRefine((s, ctx) => {
      if (s === '') return;
      if (!isValidPhoneNumber(s)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: ACCOUNT_PHONE_MESSAGE });
        return;
      }
      if (!PHONE_E164.test(s)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: ACCOUNT_PHONE_MESSAGE });
      }
    }),
);
