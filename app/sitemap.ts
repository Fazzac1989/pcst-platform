import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { getCountries, getPublishedTrips, getSubjects } from '@/lib/data';

export const dynamic = 'force-dynamic';

/**
 * Built from the host that asked, not from NEXT_PUBLIC_SITE_URL.
 *
 * That variable still holds the Vercel deployment address, so every entry in
 * this sitemap pointed at pcst-platform.vercel.app. Google rejects a sitemap
 * whose URLs live on another domain — "URL not allowed" against all 109 of
 * them — so none of the site could be indexed from it.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const host = headers().get('host')?.toLowerCase().split(':')[0] ?? '';
  const base = `https://${host}`;
  const [trips, subjects, countries] = await Promise.all([
    getPublishedTrips(),
    getSubjects(),
    getCountries(),
  ]);
  return [
    { url: base, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/trips`, changeFrequency: 'weekly', priority: 0.9 },
    ...subjects.map((s) => ({
      url: `${base}/subjects/${s.slug}`,
      changeFrequency: 'weekly' as const,
      priority: 0.85,
    })),
    ...countries.map((c) => ({
      url: `${base}/countries/${c.slug}`,
      changeFrequency: 'weekly' as const,
      priority: 0.85,
    })),
    ...trips.map((t) => ({
      url: `${base}/trips/${t.slug}`,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
  ];
}
