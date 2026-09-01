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
