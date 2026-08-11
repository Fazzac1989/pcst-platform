import type { MetadataRoute } from 'next';
import { getCountries, getPublishedTrips, getSubjects } from '@/lib/data';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
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
