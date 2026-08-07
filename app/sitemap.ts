import type { MetadataRoute } from 'next';
import { getPublishedTrips } from '@/lib/data';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const trips = await getPublishedTrips();
  return [
    { url: base, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/trips`, changeFrequency: 'weekly', priority: 0.9 },
    ...trips.map((t) => ({
      url: `${base}/trips/${t.slug}`,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
  ];
}
