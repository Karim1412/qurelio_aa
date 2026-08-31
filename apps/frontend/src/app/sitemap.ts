import type { MetadataRoute } from 'next';
import { PUBLIC_ROUTES, SITE_URL } from '@/lib/site';

/** Served at /sitemap.xml. Public marketing routes only: app routes are behind auth. */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return PUBLIC_ROUTES.map(({ path, priority, changeFrequency }) => ({
    // Must byte-match the canonical Next emits. Resolving `canonical: '/'` against
    // metadataBase yields the bare origin with no trailing slash, so the root entry
    // drops its slash here too; otherwise sitemap and canonical name two URLs.
    url: `${SITE_URL}${path === '/' ? '' : path}`,
    lastModified,
    changeFrequency,
    priority,
  }));
}
