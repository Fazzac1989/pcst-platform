'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { DOCS_BUCKET } from '@/lib/portal/planning';
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

/** Open a planning workspace, optionally seeded from an accepted quote. */
export async function createPortalTrip(input: {
  quoteId: number | null;
  title: string;
  schoolName: string;
  travelDates: string;
  departureDate: string | null;
  paperworkDue: string | null;
  teacherIds: number[];
}): Promise<ActionResult> {
  const denied = await requireAdmin();
  if (denied) return { ok: false, error: denied };
  if (!input.title.trim() || !input.schoolName.trim()) {
    return { ok: false, error: 'Title and school are both required.' };
  }

  const db = createAdminClient();
  const { data, error } = await db
    .from('portal_trips')
    .insert({
      quote_id: input.quoteId,
      title: input.title.trim(),
      school_name: input.schoolName.trim(),
      travel_dates: input.travelDates.trim() || null,
      departure_date: input.departureDate || null,
      paperwork_due: input.paperworkDue || null,
    })
    .select('id')
    .single();
  if (error) return { ok: false, error: error.message };

  if (input.teacherIds.length) {
    const { error: linkErr } = await db
      .from('portal_trip_teachers')
      .insert(input.teacherIds.map((teacher_id) => ({ portal_trip_id: data.id, teacher_id })));
    if (linkErr) return { ok: false, error: linkErr.message };
  }

  revalidatePath('/admin/planning');
  revalidatePath('/portal');
  return { ok: true, id: data.id };
}

export async function setTripTeachers(tripId: number, teacherIds: number[]): Promise<ActionResult> {
  const denied = await requireAdmin();
  if (denied) return { ok: false, error: denied };

  const db = createAdminClient();
  await db.from('portal_trip_teachers').delete().eq('portal_trip_id', tripId);
  if (teacherIds.length) {
    const { error } = await db
      .from('portal_trip_teachers')
      .insert(teacherIds.map((teacher_id) => ({ portal_trip_id: tripId, teacher_id })));
    if (error) return { ok: false, error: error.message };
  }
  revalidatePath('/admin/planning');
  revalidatePath('/portal');
  return { ok: true };
}

export async function setTripStatus(
  tripId: number,
  status: 'planning' | 'ready' | 'travelling' | 'completed'
): Promise<ActionResult> {
  const denied = await requireAdmin();
  if (denied) return { ok: false, error: denied };

  const db = createAdminClient();
  const { error } = await db.from('portal_trips').update({ status }).eq('id', tripId);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/planning');
  revalidatePath('/portal');
  return { ok: true };
}

/**
 * Delete every student record and document for a finished trip. Irreversible —
 * this is how passport and medical data stops being held once it is no longer
 * needed. The trip itself remains, marked as purged.
 */
export async function purgeTripData(tripId: number): Promise<ActionResult> {
  const denied = await requireAdmin();
  if (denied) return { ok: false, error: denied };

  const db = createAdminClient();

  // Remove the documents first, so nothing is orphaned in storage.
  const { data: files } = await db.storage.from(DOCS_BUCKET).list(`trip-${tripId}`, { limit: 1000 });
  for (const folder of files ?? []) {
    const { data: inner } = await db.storage
      .from(DOCS_BUCKET)
      .list(`trip-${tripId}/${folder.name}`, { limit: 1000 });
    const paths = (inner ?? []).map((f) => `trip-${tripId}/${folder.name}/${f.name}`);
    if (paths.length) await db.storage.from(DOCS_BUCKET).remove(paths);
  }

  const { error: delErr } = await db.from('portal_students').delete().eq('portal_trip_id', tripId);
  if (delErr) return { ok: false, error: delErr.message };

  const { error } = await db
    .from('portal_trips')
    .update({ data_purged_at: new Date().toISOString(), status: 'completed' })
    .eq('id', tripId);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/admin/planning');
  revalidatePath('/portal');
  return { ok: true };
}

export async function deletePortalTrip(tripId: number): Promise<ActionResult> {
  const denied = await requireAdmin();
  if (denied) return { ok: false, error: denied };

  const purge = await purgeTripData(tripId);
  if (!purge.ok) return purge;

  const db = createAdminClient();
  const { error } = await db.from('portal_trips').delete().eq('id', tripId);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/planning');
  return { ok: true };
}
