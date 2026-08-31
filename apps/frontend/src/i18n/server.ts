import { cookies } from 'next/headers';
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, type Locale } from './config';

/**
 * Locale for the current request, read from the preference cookie.
 *
 * Reading it server-side is what lets the first paint already be in the right
 * language: there is no post-hydration swap and no mismatch warning.
 */
export async function getRequestLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}
