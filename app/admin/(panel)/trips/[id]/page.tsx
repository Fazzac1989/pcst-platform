import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import TripEditor, { type EditorTrip } from '../TripEditor';

export const dynamic = 'force-dynamic';

export default async function EditTripPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isInteger(id)) notFound();

  const db = createClient();
  const TRIP_FIELDS =
    'id, slug, title, subject_id, country_id, city, duration_days, duration_nights, departs, hero_image, gallery, overview, includes, status, featured, itinerary_days(label, title, description, sort_order)';
  const [tripRes, { data: subjects }, { data: countries }] = await Promise.all([
    db.from('trips').select(TRIP_FIELDS).eq('id', id).maybeSingle(),
    db.from('subjects').select('id, name').order('name'),
    db.from('countries').select('id, name').order('name'),
  ]);
  let trip: any = tripRes.data;
  // Safety net until the gallery migration has been run on the live database.
  if (tripRes.error?.message.includes('gallery')) {
    const retry = await db
      .from('trips')
      .select(TRIP_FIELDS.replace('hero_image, gallery,', 'hero_image,'))
      .eq('id', id)
      .maybeSingle();
    trip = retry.data;
  }
  if (!trip) notFound();

  const editorTrip: EditorTrip = {
    id: trip.id,
    slug: trip.slug,
    title: trip.title,
    subject_id: trip.subject_id,
    country_id: trip.country_id,
    city: trip.city ?? '',
    duration_days: trip.duration_days,
    duration_nights: trip.duration_nights,
    departs: trip.departs,
    hero_image: trip.hero_image,
    gallery: (trip.gallery as string[]) ?? [],
    overview: (trip.overview as string[])?.length ? (trip.overview as string[]) : [''],
    includes: (trip.includes as string[])?.length ? (trip.includes as string[]) : [''],
    itinerary: (trip.itinerary_days ?? [])
      .sort((a: any, b: any) => a.sort_order - b.sort_order)
      .map((d: any) => ({ label: d.label ?? '', title: d.title, description: d.description })),
    status: trip.status,
    featured: trip.featured,
  };

  return <TripEditor trip={editorTrip} subjects={subjects ?? []} countries={countries ?? []} />;
}
