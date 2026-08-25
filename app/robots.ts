import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';

/**
 * Answers for whichever host asked, so the sitemap reference always points at
 * the same domain the crawler is on. The vercel.app deployment address is a
 * complete copy of the site competing with it for the same content, so it is
 * closed to crawlers instead.
 */
export default function robots(): MetadataRoute.Robots {
  const host = headers().get('host')?.toLowerCase().split(':')[0] ?? '';
  if (host.endsWith('.vercel.app') || host === 'localhost') {
    return { rules: [{ userAgent: '*', disallow: '/' }] };
  }
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: '/admin' }],
    sitemap: `https://${host}/sitemap.xml`,
    host: `https://${host}`,
  };
}
