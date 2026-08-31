import type { MetadataRoute } from 'next';
import { PRIVATE_PATHS, SITE_URL } from '@/lib/site';

/**
 * Served at /robots.txt.
 *
 * The site previously had no robots.txt at all (404). A 404 is permissive, so
 * nothing was blocked, but crawlers also had no pointer to the sitemap, which is
 * the main discovery path for a domain with few inbound links.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [...PRIVATE_PATHS],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
