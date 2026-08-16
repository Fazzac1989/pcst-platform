import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { DOCS_BUCKET, tripForTeacher } from '@/lib/portal/planning';
import { getPortalTeacher } from '@/lib/portal/session';

export const runtime = 'nodejs';

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'];

/**
 * Uploads a passport copy or consent form into the private bucket. Teachers
 * have no storage credentials of their own — this route checks the session and
 * that they are on the trip, then writes with the service role.
 */
export async function POST(request: Request) {
  const teacher = await getPortalTeacher();
  if (!teacher) return NextResponse.json({ ok: false, error: 'Signed out.' }, { status: 401 });

  const form = await request.formData();
  const tripId = Number(form.get('tripId'));
  const studentId = Number(form.get('studentId'));
  const kind = String(form.get('kind'));
  const file = form.get('file');

  if (!Number.isInteger(tripId) || !Number.isInteger(studentId)) {
    return NextResponse.json({ ok: false, error: 'Bad request.' }, { status: 400 });
  }
  if (kind !== 'passport' && kind !== 'consent') {
    return NextResponse.json({ ok: false, error: 'Bad request.' }, { status: 400 });
  }
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ ok: false, error: 'Choose a file to upload.' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ ok: false, error: 'That file is over 10MB.' }, { status: 400 });
  }
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json(
      { ok: false, error: 'Upload a PDF or a photo (JPG, PNG, WEBP or HEIC).' },
      { status: 400 }
    );
  }

  const trip = await tripForTeacher(tripId, teacher.id);
  if (!trip) return NextResponse.json({ ok: false, error: 'Not your trip.' }, { status: 403 });
  if (trip.dataPurgedAt) {
    return NextResponse.json({ ok: false, error: 'This trip is closed.' }, { status: 403 });
  }

  const db = createAdminClient();
  const { data: student } = await db
    .from('portal_students')
    .select('id, passport_file, consent_file')
    .eq('id', studentId)
    .eq('portal_trip_id', tripId)
    .maybeSingle();
  if (!student) return NextResponse.json({ ok: false, error: 'Student not found.' }, { status: 404 });

  const ext = (file.name.split('.').pop() ?? 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
  const path = `trip-${tripId}/student-${studentId}/${kind}-${Date.now()}.${ext}`;

  const { error: upErr } = await db.storage
    .from(DOCS_BUCKET)
    .upload(path, Buffer.from(await file.arrayBuffer()), {
      contentType: file.type,
      upsert: false,
    });
  if (upErr) return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 });

  // Replace any previous file for this slot rather than orphaning it.
  const column = kind === 'passport' ? 'passport_file' : 'consent_file';
  const previous = (student as any)[column] as string | null;

  const { error } = await db
    .from('portal_students')
    .update({ [column]: path })
    .eq('id', studentId)
    .eq('portal_trip_id', tripId);
  if (error) {
    await db.storage.from(DOCS_BUCKET).remove([path]);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  if (previous) await db.storage.from(DOCS_BUCKET).remove([previous]);

  return NextResponse.json({ ok: true });
}
