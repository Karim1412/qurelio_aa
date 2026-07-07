import type { Metadata } from 'next';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from '@/lib/theme-provider';
import { InitialLoadingProvider } from '@/components/loading/InitialLoadingProvider';
import { ExtractionProgressProvider } from '@/components/providers/ExtractionProgressProvider';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Qurelio — Quality Management System', template: '%s | Qurelio' },
  description: 'Streamline your ISO compliance with cutting-edge QMS tools designed for clarity and efficiency.',
  keywords: ['ISO', 'Quality Management', 'QMS', 'Compliance', 'ISO 9001'],
  icons: {
    icon: '/brand/querlio-mini.png',
    shortcut: '/brand/querlio-mini.png',
    apple: '/brand/querlio-mini.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" type="image/png" href="/brand/querlio-mini.png" />
      </head>
      <body className="font-sans">
        <ThemeProvider>
          <ExtractionProgressProvider>
            <InitialLoadingProvider>{children}</InitialLoadingProvider>
          </ExtractionProgressProvider>
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
