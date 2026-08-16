'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPortalTeacher, type PortalTeacher } from './session';
import { DOCS_BUCKET, tripForTeacher, type PortalTrip } from './planning';

export type Result = { ok: true; id?: number } | { ok: false; error: string };

type Authorised =
  | { ok: false; error: string }
  | { ok: true; teacher: PortalTeacher; trip: PortalTrip };

/** Every write goes through this: the teacher must be on the trip. */
async function authorise(tripId: number): Promise<Authorised> {
  const teacher = await getPortalTeacher();
  if (!teacher) return { ok: false, error: 'Signed out — please log in again.' };
  const trip = await tripForTeacher(tripId, teacher.id);
  if (!trip) return { ok: false, error: 'That trip is not on your account.' };
  if (trip.dataPurgedAt) {
    return { ok: false, error: 'This trip is closed and its records have been removed.' };
  }
  return { ok: true, teacher, trip };
}

const text = (fd: FormData, k: string) => {
  const v = String(fd.get(k) ?? '').trim();
  return v === '' ? null : v;
};

export async function saveStudent(tripId: number, formData: FormData): Promise<Result> {
  const auth = await authorise(tripId);
  if (!auth.ok) return auth;

  const fullName = text(formData, 'full_name');
  if (!fullName) return { ok: false, error: 'A name is required.' };

  const studentId = Number(formData.get('id')) || null;
  const fields = {
    portal_trip_id: tripId,
    full_name: fullName,
    date_of_birth: text(formData, 'date_of_birth'),
    year_group: text(formData, 'year_group'),
    nationality: text(formData, 'nationality'),
    passport_number: text(formData, 'passport_number'),
    passport_expiry: text(formData, 'passport_expiry'),
    dietary: text(formData, 'dietary'),
    medical: text(formData, 'medical'),
    emergency_contact_name: text(formData, 'emergency_contact_name'),
    emergency_contact_phone: text(formData, 'emergency_contact_phone'),
    room_group: text(formData, 'room_group'),
    notes: text(formData, 'notes'),
  };

  const db = createAdminClient();
  if (studentId) {
    const { error } = await db
      .from('portal_students')
      .update(fields)
      .eq('id', studentId)
      .eq('portal_trip_id', tripId); // scope the update to this trip
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await db.from('portal_students').insert(fields);
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath(`/portal/trips/${tripId}`);
  return { ok: true };
}

export async function deleteStudent(tripId: number, studentId: number): Promise<Result> {
  const auth = await authorise(tripId);
  if (!auth.ok) return auth;

  const db = createAdminClient();
  const { data: student } = await db
    .from('portal_students')
    .select('passport_file, consent_file')
    .eq('id', studentId)
    .eq('portal_trip_id', tripId)
    .maybeSingle();

  const { error } = await db
    .from('portal_students')
    .delete()
    .eq('id', studentId)
    .eq('portal_trip_id', tripId);
  if (error) return { ok: false, error: error.message };

  // Take the documents with them.
  const paths = [student?.passport_file, student?.consent_file].filter(Boolean) as string[];
  if (paths.length) await db.storage.from(DOCS_BUCKET).remove(paths);

  revalidatePath(`/portal/trips/${tripId}`);
  return { ok: true };
}

/** Add several students at once by pasting a list of names. */
export async function addStudentsBulk(tripId: number, names: string): Promise<Result> {
  const auth = await authorise(tripId);
  if (!auth.ok) return auth;

  const rows = names
    .split(/\r?\n/)
    .map((n) => n.replace(/^\s*[\d.)-]+\s*/, '').trim()) // tolerate "1. Name" lists
    .filter(Boolean)
    .slice(0, 200)
    .map((full_name) => ({ portal_trip_id: tripId, full_name }));
  if (!rows.length) return { ok: false, error: 'No names found.' };

  const db = createAdminClient();
  const { error } = await db.from('portal_students').insert(rows);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/portal/trips/${tripId}`);
  return { ok: true, id: rows.length };
}

export async function removeDocument(
  tripId: number,
  studentId: number,
  kind: 'passport' | 'consent'
): Promise<Result> {
  const auth = await authorise(tripId);
  if (!auth.ok) return auth;

  const column = kind === 'passport' ? 'passport_file' : 'consent_file';
  const db = createAdminClient();
  const { data: student } = await db
    .from('portal_students')
    .select(column)
    .eq('id', studentId)
    .eq('portal_trip_id', tripId)
    .maybeSingle();

  const path = (student as any)?.[column] as string | undefined;
  if (path) await db.storage.from(DOCS_BUCKET).remove([path]);

  const { error } = await db
    .from('portal_students')
    .update({ [column]: null })
    .eq('id', studentId)
    .eq('portal_trip_id', tripId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/portal/trips/${tripId}`);
  return { ok: true };
}

/** Open a private document for a moment so the teacher can view it. */
export async function documentUrl(
  tripId: number,
  studentId: number,
  kind: 'passport' | 'consent'
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const auth = await authorise(tripId);
  if (!auth.ok) return auth;

  const column = kind === 'passport' ? 'passport_file' : 'consent_file';
  const db = createAdminClient();
  const { data: student } = await db
    .from('portal_students')
    .select(column)
    .eq('id', studentId)
    .eq('portal_trip_id', tripId)
    .maybeSingle();

  const path = (student as any)?.[column] as string | undefined;
  if (!path) return { ok: false, error: 'No document uploaded.' };

  const { data } = await db.storage.from(DOCS_BUCKET).createSignedUrl(path, 120);
  if (!data?.signedUrl) return { ok: false, error: 'Could not open that document.' };
  return { ok: true, url: data.signedUrl };
}
