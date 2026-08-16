'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

/**
 * All mutations run through the cookie-authenticated client, so RLS
 * (is_admin) is the enforcement layer — not this code.
 */

export type ActionResult = { ok: true; id?: number } | { ok: false; error: string };

export type TripPayload = {
  id?: number;
  slug: string;
  title: string;
  subject_id: number | null;
  country_id: number | null;
  city: string;
  duration_days: number;
  duration_nights: number;
  departs: string;
  hero_image: string | null;
  hero_alt: string | null;
  gallery: { url: string; alt: string }[];
  overview: string[];
  includes: string[];
  itinerary: { label: string; title: string; description: string }[];
  status: 'draft' | 'published' | 'archived';
  featured: boolean;
};

function revalidatePublic(slugs: string[]) {
  revalidatePath('/');
  revalidatePath('/trips');
  revalidatePath('/subjects/[slug]', 'page'); // subject listings reflect any trip change
  revalidatePath('/countries/[slug]', 'page'); // country listings too
  for (const slug of slugs) revalidatePath(`/trips/${slug}`);
}

export async function saveTrip(payload: TripPayload): Promise<ActionResult> {
  const db = createClient();
  const { itinerary, id, ...fields } = payload;

  // Track the previous slug so a rename revalidates the old URL too.
  let previousSlug: string | null = null;
  if (id) {
    const { data } = await db.from('trips').select('slug').eq('id', id).maybeSingle();
    previousSlug = data?.slug ?? null;
  }

  const query = id
    ? db.from('trips').update(fields).eq('id', id).select('id').single()
    : db.from('trips').insert(fields).select('id').single();
  let { data: trip, error } = await query;
  // Safety net until the gallery migration has been run on the live database.
  if (error?.message.includes('gallery') || error?.message.includes('hero_alt')) {
    const { gallery: _gallery, hero_alt: _heroAlt, ...legacyFields } = fields;
    const retry = id
      ? await db.from('trips').update(legacyFields).eq('id', id).select('id').single()
      : await db.from('trips').insert(legacyFields).select('id').single();
    trip = retry.data;
    error = retry.error;
  }
  if (error) return { ok: false, error: error.message };
  if (!trip) return { ok: false, error: 'Trip not saved — please try again.' };

  const { error: delErr } = await db.from('itinerary_days').delete().eq('trip_id', trip.id);
  if (delErr) return { ok: false, error: delErr.message };
  if (itinerary.length) {
    const { error: insErr } = await db.from('itinerary_days').insert(
      itinerary.map((d, i) => ({
        trip_id: trip.id,
        sort_order: i + 1,
        label: d.label || null,
        title: d.title,
        description: d.description,
      }))
    );
    if (insErr) return { ok: false, error: insErr.message };
  }

  revalidatePublic(previousSlug && previousSlug !== fields.slug ? [previousSlug, fields.slug] : [fields.slug]);
  return { ok: true, id: trip.id };
}

export async function deleteTrip(id: number): Promise<ActionResult> {
  const db = createClient();
  const { data } = await db.from('trips').select('slug').eq('id', id).maybeSingle();
  const { error } = await db.from('trips').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePublic(data ? [data.slug] : []);
  return { ok: true };
}

export async function setTripFeatured(id: number, featured: boolean): Promise<ActionResult> {
  const db = createClient();
  const { data, error } = await db
    .from('trips')
    .update({ featured })
    .eq('id', id)
    .select('slug')
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePublic([data.slug]);
  return { ok: true };
}

export async function addSubject(name: string): Promise<ActionResult> {
  const db = createClient();
  const slug = name.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const { data, error } = await db
    .from('subjects')
    .insert({ name: name.trim(), slug })
    .select('id')
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath('/trips');
  return { ok: true, id: data.id };
}

export async function updateSubject(id: number, name: string): Promise<ActionResult> {
  const db = createClient();
  const slug = name.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const { error } = await db.from('subjects').update({ name: name.trim(), slug }).eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/');
  revalidatePath('/trips');
  revalidatePath('/subjects/[slug]', 'page');
  return { ok: true };
}

export async function updateCountry(id: number, name: string, region: string | null): Promise<ActionResult> {
  const db = createClient();
  const slug = name.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const { error } = await db.from('countries').update({ name: name.trim(), slug, region }).eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/');
  revalidatePath('/trips');
  revalidatePath('/subjects/[slug]', 'page');
  return { ok: true };
}

export async function deleteSubject(id: number): Promise<ActionResult> {
  const db = createClient();
  const { error } = await db.from('subjects').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/trips');
  return { ok: true };
}

export async function addCountry(name: string, region: string | null): Promise<ActionResult> {
  const db = createClient();
  const slug = name.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const { data, error } = await db
    .from('countries')
    .insert({ name: name.trim(), slug, region })
    .select('id')
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath('/trips');
  return { ok: true, id: data.id };
}

export async function deleteCountry(id: number): Promise<ActionResult> {
  const db = createClient();
  const { error } = await db.from('countries').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/trips');
  return { ok: true };
}

export async function saveBookingTerms(texts: string[]): Promise<ActionResult> {
  const db = createClient();
  const { error: delErr } = await db.from('booking_terms').delete().gte('id', 0);
  if (delErr) return { ok: false, error: delErr.message };
  if (texts.length) {
    const { error } = await db
      .from('booking_terms')
      .insert(texts.map((text, i) => ({ sort_order: i + 1, text })));
    if (error) return { ok: false, error: error.message };
  }
  // Terms render on every trip page
  const { data: trips } = await db.from('trips').select('slug');
  revalidatePublic((trips ?? []).map((t) => t.slug));
  return { ok: true };
}

export async function setAppointmentStatus(
  id: number,
  status: 'new' | 'contacted' | 'closed'
): Promise<ActionResult> {
  const db = createClient();
  const { error } = await db.from('appointment_requests').update({ status }).eq('id', id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deleteMediaObject(path: string): Promise<ActionResult> {
  const db = createClient();
  const { error } = await db.storage.from('trip-images').remove([path]);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
