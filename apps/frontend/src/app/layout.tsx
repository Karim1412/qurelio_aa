import type { Metadata, Viewport } from 'next';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from '@/lib/theme-provider';
import { InitialLoadingProvider } from '@/components/loading/InitialLoadingProvider';
import { ExtractionProgressProvider } from '@/components/providers/ExtractionProgressProvider';
import { dictionaries, I18nProvider } from '@/i18n';
import { getRequestLocale } from '@/i18n/server';
import { OG_LOCALE, SITE_NAME, SITE_URL } from '@/lib/site';
import './globals.css';

/**
 * Viewport and theme-colour belong to their own export in the App Router: Next
 * emits the `<meta name="viewport">` tag itself from this. Writing the tag by
 * hand in `<head>` (as this file used to) produced a *second* viewport meta in
 * the document, and browsers apply whichever they see first.
 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Tints mobile browser chrome to match the painted background, so the address
  // bar does not flash white above a dark page.
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0c0d10' },
  ],
};

/**
 * Locale-aware because the language is chosen by cookie rather than by URL: a
 * French visitor sharing the page should get a French card, and the `<html lang>`
 * below must agree with the description a crawler reads. Reading the cookie here
 * costs nothing extra — `RootLayout` already reads it, so the tree is dynamic
 * either way.
 *
 * Deliberately no `alternates.canonical` here. Metadata cascades, so a canonical
 * set on the root layout is inherited by every page that does not override it —
 * which pointed `/auth/login`, `/dashboard` and the rest at the homepage,
 * telling crawlers those URLs are duplicates of `/`. Each indexable page now
 * declares its own (see `app/page.tsx`, `app/demo/layout.tsx`).
 */
export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const { seo } = dictionaries[locale];

  return {
    // Resolves every relative URL below (and per-page canonicals) to an absolute
    // one. Without it Next emits relative og:image / canonical values, which
    // crawlers ignore.
    metadataBase: new URL(SITE_URL),
    title: { default: seo.title, template: `%s | ${SITE_NAME}` },
    description: seo.description,
    keywords: ['Compliance OS', 'Compliance Memory', 'Regulatory Monitoring', 'QMS', 'CAPA', 'Audits', 'ISO 9001', 'Multi-tenant'],
    applicationName: SITE_NAME,
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      locale: OG_LOCALE[locale],
      url: SITE_URL,
      title: seo.title,
      description: seo.description,
      images: [{ url: '/brand/og-image.png', width: 1200, height: 630, alt: seo.ogImageAlt }],
    },
    twitter: {
      card: 'summary_large_image',
      title: seo.title,
      description: seo.description,
      images: ['/brand/og-image.png'],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 },
    },
    icons: {
      icon: '/brand/querlio-mini.png',
      shortcut: '/brand/querlio-mini.png',
      apple: '/brand/querlio-mini.png',
    },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getRequestLocale();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="font-sans">
        <ThemeProvider>
          <I18nProvider initialLocale={locale}>
            <ExtractionProgressProvider>
              <InitialLoadingProvider>{children}</InitialLoadingProvider>
            </ExtractionProgressProvider>
          </I18nProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                borderRadius: 12,
                fontFamily: 'var(--font-public-sans), sans-serif',
                fontSize: '0.875rem',
                fontWeight: 500,
                border: '1px solid var(--border)',
                background: 'var(--surface-elevated)',
                color: 'var(--text-primary)',
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
