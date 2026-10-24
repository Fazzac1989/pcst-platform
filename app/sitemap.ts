import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { getCities, getCountries, getPublishedTrips, getSubjects } from '@/lib/data';

/**
 * The pages a teacher, parent or school leader reads before they choose a
 * trip. They are linked from the footer, but a sitemap is how they get
 * crawled promptly after a change rather than whenever the footer is found.
 */
const INFO_PAGES = [
  '/why-premium-choice',
  '/safety',
  '/for-teachers',
  '/for-parents',
  '/for-school-leaders',
  '/our-app',
  '/about',
];

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
  const [trips, subjects, countries, cities] = await Promise.all([
    getPublishedTrips(),
    getSubjects(),
    getCountries(),
    getCities(),
  ]);
  return [
    { url: base, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/trips`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${base}/countries`, changeFrequency: 'weekly', priority: 0.9 },
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
    ...cities.map((c) => ({
      url: `${base}/cities/${c.slug}`,
      changeFrequency: 'weekly' as const,
      priority: 0.75,
    })),
    ...INFO_PAGES.map((path) => ({
      url: `${base}${path}`,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
    ...trips.map((t) => ({
      url: `${base}/trips/${t.slug}`,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
  ];
}
