'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { extractDay, extractTripHighlights, EXTRACT_MODEL } from '@/lib/itinerary/extract';
import type { StructuredDay } from '@/lib/itinerary/schema';
import type { ActionResult } from './actions';

async function requireAdmin(): Promise<string | null> {
  const db = createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return 'Signed out — please log in again.';
  const { data } = await db.from('profiles').select('role').eq('id', user.id).maybeSingle();
  return data?.role === 'admin' ? null : 'Admin access required.';
}

/** Column shape for a structured day; the description is never touched. */
const toRow = (s: StructuredDay) => ({
  display_title: s.displayTitle,
  summary: s.summary,
  primary_location: s.primaryLocation,
  highlights: s.highlights.map((h) => ({
    name: h.name, summary: h.summary, type: h.type, location: h.location,
    conditional: h.conditional, conditional_text: h.conditionalText,
  })),
  learning_focus: s.learningFocus,
  experience_types: s.experienceTypes,
  locations: s.locations,
  meals: s.meals,
  transport: s.transport,
  notices: s.notices,
  review_flags: s.reviewFlags,
  structured_at: new Date().toISOString(),
  structured_model: EXTRACT_MODEL,
});

/** Rebuild the journey rail and trip highlights from whatever days now exist. */
async function rollUpTrip(tripId: number) {
  const db = createAdminClient();
  const { data: trip } = await db
    .from('trips')
    .select('id, slug, title, itinerary_days(sort_order, display_title, summary, primary_location, highlights, structured_at)')
    .eq('id', tripId)
    .maybeSingle();
  if (!trip) return;

  const days = (trip.itinerary_days ?? [])
    .filter((d: any) => d.structured_at)
    .sort((a: any, b: any) => a.sort_order - b.sort_order);
  if (!days.length) return;

  const journey: { location: string; from_day: number; to_day: number }[] = [];
  for (const d of days) {
    const place = (d.primary_location ?? '').trim();
    if (!place) continue;
    const last = journey[journey.length - 1];
    if (last && last.location.toLowerCase() === place.toLowerCase()) last.to_day = d.sort_order;
    else journey.push({ location: place, from_day: d.sort_order, to_day: d.sort_order });
  }

  let highlights: string[] = [];
  try {
    highlights = await extractTripHighlights(
      trip.title,
      days.map((d: any) => ({
        dayNumber: d.sort_order,
        title: d.display_title ?? '',
        summary: d.summary ?? '',
        highlights: (d.highlights ?? []).map((h: any) => h.name),
      }))
    );
  } catch {
    // A failed rollup should not undo the per-day work.
  }

  await db
    .from('trips')
    .update({ journey, trip_highlights: highlights, structured_at: new Date().toISOString() })
    .eq('id', tripId);
}

/** Regenerate the structured summary for one day. Never touches description. */
export async function regenerateDay(dayId: number): Promise<ActionResult> {
  const denied = await requireAdmin();
  if (denied) return { ok: false, error: denied };

  const db = createAdminClient();
  const { data: day } = await db
    .from('itinerary_days')
    .select('id, trip_id, sort_order, label, title, description')
    .eq('id', dayId)
    .maybeSingle();
  if (!day) return { ok: false, error: 'Day not found.' };
  if (!day.description?.trim()) return { ok: false, error: 'This day has no description to work from.' };

  const { data: trip } = await db
    .from('trips')
    .select('id, slug, title, subjects(name), countries(name), itinerary_days(id)')
    .eq('id', day.trip_id)
    .maybeSingle();
  if (!trip) return { ok: false, error: 'Trip not found.' };

  try {
    const structured = await extractDay({
      dayNumber: day.sort_order,
      totalDays: (trip.itinerary_days ?? []).length,
      label: day.label,
      title: day.title,
      description: day.description,
      tripTitle: trip.title,
      subject: (trip.subjects as any)?.name ?? null,
      country: (trip.countries as any)?.name ?? null,
    });
    const { error } = await db.from('itinerary_days').update(toRow(structured)).eq('id', dayId);
    if (error) return { ok: false, error: error.message };
  } catch (e: any) {
    return { ok: false, error: `Could not analyse this day: ${e.message}` };
  }

  await rollUpTrip(day.trip_id);
  revalidatePath(`/trips/${trip.slug}`);
  revalidatePath(`/admin/trips/${day.trip_id}`);
  return { ok: true };
}

/**
 * Analyse every day of a trip. Called automatically after a document import,
 * and available in the admin as Regenerate all days.
 */
export async function structureTrip(
  tripId: number,
  { force = true }: { force?: boolean } = {}
): Promise<ActionResult & { days?: number; failed?: number }> {
  const denied = await requireAdmin();
  if (denied) return { ok: false, error: denied };

  const db = createAdminClient();
  const { data: trip } = await db
    .from('trips')
    .select('id, slug, title, subjects(name), countries(name), itinerary_days(id, sort_order, label, title, description, structured_at)')
    .eq('id', tripId)
    .maybeSingle();
  if (!trip) return { ok: false, error: 'Trip not found.' };

  const days = (trip.itinerary_days ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order);
  if (!days.length) return { ok: false, error: 'This trip has no itinerary days yet.' };

  let done = 0;
  let failed = 0;
  for (const day of days) {
    if (!force && day.structured_at) continue;
    if (!day.description?.trim()) continue;
    try {
      const structured = await extractDay({
        dayNumber: day.sort_order,
        totalDays: days.length,
        label: day.label,
        title: day.title,
        description: day.description,
        tripTitle: trip.title,
        subject: (trip.subjects as any)?.name ?? null,
        country: (trip.countries as any)?.name ?? null,
      });
      const { error } = await db.from('itinerary_days').update(toRow(structured)).eq('id', day.id);
      if (error) throw new Error(error.message);
      done++;
    } catch {
      failed++;
    }
  }

  await rollUpTrip(tripId);
  revalidatePath(`/trips/${trip.slug}`);
  revalidatePath(`/admin/trips/${tripId}`);
  return { ok: true, days: done, failed };
}

/** Save hand-edited structured fields for a day. */
export async function saveDayStructure(
  dayId: number,
  fields: Partial<Pick<StructuredDay, 'displayTitle' | 'summary' | 'primaryLocation' | 'highlights' | 'learningFocus' | 'notices'>>
): Promise<ActionResult> {
  const denied = await requireAdmin();
  if (denied) return { ok: false, error: denied };

  const patch: Record<string, unknown> = {};
  if (fields.displayTitle !== undefined) patch.display_title = fields.displayTitle;
  if (fields.summary !== undefined) patch.summary = fields.summary;
  if (fields.primaryLocation !== undefined) patch.primary_location = fields.primaryLocation;
  if (fields.learningFocus !== undefined) patch.learning_focus = fields.learningFocus;
  if (fields.notices !== undefined) patch.notices = fields.notices;
  if (fields.highlights !== undefined) {
    patch.highlights = fields.highlights.map((h) => ({
      name: h.name, summary: h.summary, type: h.type, location: h.location,
      conditional: h.conditional, conditional_text: h.conditionalText,
    }));
  }

  const db = createAdminClient();
  const { data, error } = await db.from('itinerary_days').update(patch).eq('id', dayId).select('trip_id').single();
  if (error) return { ok: false, error: error.message };

  await rollUpTrip(data.trip_id);
  const { data: trip } = await db.from('trips').select('slug').eq('id', data.trip_id).maybeSingle();
  if (trip) revalidatePath(`/trips/${trip.slug}`);
  return { ok: true };
}
