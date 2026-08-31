import type { Metadata } from 'next';
import { dictionaries } from '@/i18n';
import { getRequestLocale } from '@/i18n/server';
import { OG_LOCALE, SITE_NAME } from '@/lib/site';

/**
 * page.tsx is a client component, which cannot export `metadata`. This layout
 * exists solely to give /demo its own title, description and canonical rather
 * than inheriting the homepage's.
 *
 * `openGraph` is spelled out in full rather than only overriding title/url:
 * Next merges metadata shallowly, so declaring the key at all *replaces* the
 * root layout's object. The previous partial override silently dropped
 * og:image, og:type and og:site_name, leaving /demo shares as a bare text link.
 */
export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const { seo } = dictionaries[locale];

  return {
    title: seo.demoTitle,
    description: seo.demoDescription,
    alternates: { canonical: '/demo' },
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      locale: OG_LOCALE[locale],
      url: '/demo',
      title: `${seo.demoTitle} | ${SITE_NAME}`,
      description: seo.demoDescription,
      images: [{ url: '/brand/og-image.png', width: 1200, height: 630, alt: seo.ogImageAlt }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${seo.demoTitle} | ${SITE_NAME}`,
      description: seo.demoDescription,
      images: ['/brand/og-image.png'],
    },
  };
}

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
