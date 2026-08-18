import { createClient } from '@/lib/supabase/server';
import ImageCurator, { type CuratorTrip } from './ImageCurator';

export const dynamic = 'force-dynamic';

export default async function AdminImagesPage({ searchParams }: { searchParams: { trip?: string } }) {
  const db = createClient();

  const imagesRes = await db.from('trip_images').select('id, trip_id, role, url, alt_text, caption, width, height, photographer, licence, source_url, sort_order');
  if (imagesRes.error) {
    return (
      <div className="max-w-3xl">
        <h1 className="font-serif text-3xl mb-4">Photography</h1>
        <p className="text-sm text-danger border border-danger/30 bg-danger/5 rounded p-4">
          Photography curation is unavailable until the{' '}
          <code>20260817000000_trip_images.sql</code> migration has been run in the Supabase SQL
          editor.
        </p>
      </div>
    );
  }

  const { data: trips } = await db
    .from('trips')
    .select('id, slug, title, status, hero_image, subjects(name), countries(name)')
    .eq('status', 'published')
    .order('title');

  const byTrip = new Map<number, any[]>();
  for (const img of imagesRes.data ?? []) {
    (byTrip.get(img.trip_id) ?? byTrip.set(img.trip_id, []).get(img.trip_id))!.push(img);
  }

  const rows: CuratorTrip[] = (trips ?? []).map((t: any) => {
    const imgs = (byTrip.get(t.id) ?? []).sort((a, b) => a.sort_order - b.sort_order);
    return {
      id: t.id,
      slug: t.slug,
      title: t.title,
      subject: t.subjects?.name ?? null,
      country: t.countries?.name ?? null,
      legacyHero: t.hero_image,
      images: imgs.map((i) => ({
        id: i.id,
        role: i.role,
        url: i.url,
        altText: i.alt_text ?? '',
        caption: i.caption,
        width: i.width,
        height: i.height,
        photographer: i.photographer,
        licence: i.licence,
        sourceUrl: i.source_url,
        sortOrder: i.sort_order,
      })),
    };
  });

  return <ImageCurator trips={rows} initialTripId={searchParams.trip ? Number(searchParams.trip) : null} />;
}
