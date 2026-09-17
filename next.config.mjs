import { createRequire } from 'node:module';
import { legacyRedirects } from './lib/legacy-redirects.mjs';

const require = createRequire(import.meta.url);
// Old site addresses → new pages; see lib/legacy-redirects.mjs.
const legacy = require('./lib/generated/legacy-redirects.json');

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // mammoth is CommonJS and reads files at runtime — keep it out of the bundle.
    //
    // @sparticuz/chromium ships a browser binary alongside its code and resolves
    // it by path at runtime. Bundling relocates the code away from the binary,
    // and the PDF route then fails on Vercel with "the input directory
    // .../@sparticuz/chromium/bin does not exist" — which is exactly how it
    // failed on the first real deploy. puppeteer-core goes with it.
    serverComponentsExternalPackages: ['mammoth', '@sparticuz/chromium', 'puppeteer-core'],
    // Trip documents are uploaded through a server action.
    serverActions: { bodySizeLimit: '10mb' },
    // Externalising keeps the code and its binary together, but Vercel's file
    // tracer still has to be told the binary exists: nothing imports it, it is
    // resolved by path at runtime, so tracing leaves it out and the route fails
    // with "/var/task/node_modules/@sparticuz/chromium/bin does not exist".
    outputFileTracingIncludes: {
      '/api/brochures/[slug]/pdf': ['./node_modules/@sparticuz/chromium/bin/**'],
      '/api/proposals/[id]/pdf': ['./node_modules/@sparticuz/chromium/bin/**'],
    },
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: '**.supabase.co', pathname: '/storage/v1/object/public/**' },
      { protocol: 'https', hostname: '**.supabase.co', pathname: '/storage/v1/render/image/public/**' },
    ],
  },
  async redirects() {
    // School Trips is managed in the Premium Choice Travel group console —
    // this platform's own admin is retired (remove these entries to restore it).
    return [
      ...legacyRedirects(legacy),
      {
        source: '/admin',
        destination: 'https://premium-choice-travel.vercel.app/admin/school-trips',
        permanent: false,
      },
      {
        source: '/admin/:path*',
        destination: 'https://premium-choice-travel.vercel.app/admin/school-trips',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
