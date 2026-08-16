/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // mammoth is CommonJS and reads files at runtime — keep it out of the bundle.
    serverComponentsExternalPackages: ['mammoth'],
    // Trip documents are uploaded through a server action.
    serverActions: { bodySizeLimit: '10mb' },
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: '**.supabase.co', pathname: '/storage/v1/object/public/**' },
    ],
  },
};

export default nextConfig;
