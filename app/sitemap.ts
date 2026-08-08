import type { MetadataRoute } from 'next';
import { getPublishedTrips, getSubjects } from '@/lib/data';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const [trips, subjects] = await Promise.all([getPublishedTrips(), getSubjects()]);
  return [
    { url: base, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/trips`, changeFrequency: 'weekly', priority: 0.9 },
    ...subjects.map((s) => ({
      url: `${base}/subjects/${s.slug}`,
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
