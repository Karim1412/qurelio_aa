/**
 * Locale configuration for the public site.
 *
 * Translations are static dictionaries (`src/i18n/messages/*`), not machine
 * translation: every string the visitor can read exists in both languages.
 */

export const LOCALES = ['en', 'fr'] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';

/** Cookie is the source of truth so the server renders the right language (no flash). */
export const LOCALE_COOKIE = 'qurelio_locale';

/** Mirrored to localStorage so a cookie-less context still remembers the choice. */
export const LOCALE_STORAGE_KEY = 'qurelio.locale';

/** One year, in seconds. */
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

/** Intl tag used for number / date formatting in each locale. */
export const INTL_LOCALE: Record<Locale, string> = {
  en: 'en-US',
  fr: 'fr-FR',
};
