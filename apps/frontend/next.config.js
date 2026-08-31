/** @type {import('next').NextConfig} */
// Browser calls /api/* on the same host as the UI (no localhost vs 127.0.0.1 mismatch).
// Docker build: set API_PROXY_TARGET=http://gateway:3000
// Local dev: default targets gateway on the host (127.0.0.1:3000).
const gatewayProxy =
  process.env.API_PROXY_TARGET || 'http://127.0.0.1:3000';

const nextConfig = {
  output: 'standalone',

  // Drops the `X-Powered-By: Next.js` header (a free byte saving on every response,
  // and one less framework-version disclosure).
  poweredByHeader: false,

  turbopack: {
    root: __dirname,
  },

  experimental: {
    // These packages export hundreds of symbols from a single barrel file. Without
    // this, importing one icon pulls the whole module graph into the client bundle.
    // Next rewrites the barrel imports to deep per-symbol imports at build time.
    optimizePackageImports: [
      'lucide-react',
      '@mui/material',
      '@mui/icons-material',
      '@hugeicons/react',
      '@hugeicons/core-free-icons',
      'date-fns',
      'recharts',
    ],
  },

  images: {
    // Modern formats first; Next falls back automatically for older browsers.
    formats: ['image/avif', 'image/webp'],
  },

  async headers() {
    return [
      {
        // Everything under /_next/static is content-hashed, so it can never go
        // stale: cache it immutably instead of revalidating on each visit.
        source: '/_next/static/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        // Brand and marketing art are not content-hashed, so they get a shorter
        // TTL with stale-while-revalidate rather than an immutable one.
        source: '/:path(brand|landing|previews)/:file*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' }],
      },
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },

  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${gatewayProxy.replace(/\/$/, '')}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
