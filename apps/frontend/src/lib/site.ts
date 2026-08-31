import type { Locale } from '@/i18n/config';

/**
 * Canonical origin for the public site.
 *
 * Absolute URLs are required by Open Graph, canonical links, robots.txt and
 * sitemap.xml: crawlers resolve them independently of the request host, so a
 * relative path is silently useless there. Override per environment with
 * NEXT_PUBLIC_SITE_URL (e.g. a staging origin) to avoid staging pages claiming
 * production URLs as their canonical.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://qurelio.com').replace(/\/$/, '');

/**
 * Route prefixes that must never be indexed: authenticated product surfaces and
 * the auth flow itself. These are already behind a login, but keeping them out
 * of the index stops crawlers wasting budget on redirect chains and stops
 * half-rendered app shells from surfacing as search results.
 */
export const PRIVATE_PATHS = [
  '/api/',
  '/auth/',
  '/dashboard',
  '/documents',
  '/evaluations',
  '/audits',
  '/nc',
  '/reports',
  '/analytics',
  '/activity-log',
  '/calendar',
  '/company',
  '/file-manager',
  '/kanban',
  '/profile',
  '/rag-chat',
  '/docs',
] as const;

/** Publicly indexable routes, with their relative crawl priority. */
export const PUBLIC_ROUTES = [
  { path: '/', priority: 1.0, changeFrequency: 'weekly' as const },
  { path: '/demo', priority: 0.8, changeFrequency: 'monthly' as const },
];

/** Brand name, used in the title template, og:site_name and schema.org nodes. */
export const SITE_NAME = 'Qurelio';

/**
 * og:locale wants an IETF tag with an underscore (`fr_FR`), not the bare
 * language code used for `<html lang>`. Facebook and LinkedIn ignore the tag
 * when it is malformed, falling back to the site default.
 */
export const OG_LOCALE: Record<Locale, string> = {
  en: 'en_US',
  fr: 'fr_FR',
};
