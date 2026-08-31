'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  DEFAULT_LOCALE,
  INTL_LOCALE,
  isLocale,
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  LOCALE_STORAGE_KEY,
  type Locale,
} from './config';
import { dictionaries, type Messages } from './dictionaries';
import { interpolate, lookup } from './resolve';
import { renderRich } from './rich';

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  /** Full typed dictionary, for structured content (lists, tables, cards). */
  m: Messages;
  /** Plain string lookup by dot path, with {var} interpolation. */
  t: (key: string, vars?: Record<string, string | number>) => string;
  /** Same as `t`, but renders the `<b>` / `<em>` / `<br/>` markup subset. */
  tRich: (key: string, vars?: Record<string, string | number>) => React.ReactNode;
  /** Localized label for an option value that is sent to the API verbatim. */
  tOption: (value: string) => string;
  /** Intl tag matching the active locale (`en-US`, `fr-FR`). */
  intlLocale: string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within <I18nProvider>');
  return ctx;
}

function persist(locale: Locale) {
  if (typeof document === 'undefined') return;
  try {
    document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE}; samesite=lax`;
  } catch {
    /* cookies disabled */
  }
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    /* storage disabled */
  }
}

export function I18nProvider({
  initialLocale = DEFAULT_LOCALE,
  children,
}: {
  initialLocale?: Locale;
  children: React.ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  // A locale stored before cookies existed (or in another tab) still wins.
  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    } catch {
      /* storage disabled */
    }
    if (isLocale(stored) && stored !== initialLocale) {
      setLocaleState(stored);
      persist(stored);
    }
  }, [initialLocale]);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    persist(next);
    setLocaleState(next);
  }, []);

  const value = useMemo<I18nContextValue>(() => {
    const dict = dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE];

    const resolve = (key: string): string => {
      const hit = lookup(dict, key);
      if (typeof hit === 'string') return hit;

      const fallback = lookup(dictionaries[DEFAULT_LOCALE], key);
      if (typeof fallback === 'string') return fallback;

      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.warn(`[i18n] missing translation key: ${key}`);
      }
      return key;
    };

    const t = (key: string, vars?: Record<string, string | number>) =>
      interpolate(resolve(key), vars);

    return {
      locale,
      setLocale,
      m: dict,
      t,
      tRich: (key, vars) => renderRich(t(key, vars)),
      tOption: (option: string) => {
        const labels = dict.optionLabels as Record<string, string | undefined>;
        return labels[option] ?? option;
      },
      intlLocale: INTL_LOCALE[locale],
    };
  }, [locale, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** Renders a translation key that contains inline markup. */
export function Rich({
  k,
  vars,
}: {
  k: string;
  vars?: Record<string, string | number>;
}) {
  const { tRich } = useI18n();
  return <>{tRich(k, vars)}</>;
}
