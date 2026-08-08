import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendAppointmentConfirmation, sendAppointmentNotification } from '@/lib/email';
import { getTripBySlug } from '@/lib/data';

const APPOINTMENT_TYPES = new Set(['we_visit', 'you_visit', 'online']);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request.' }, { status: 400 });
  }

  // Honeypot: real users never fill this hidden field.
  if (typeof body.website === 'string' && body.website.trim() !== '') {
    return NextResponse.json({ ok: true });
  }

  const name = String(body.name ?? '').trim();
  const school = String(body.school ?? '').trim();
  const email = String(body.email ?? '').trim();
  const appointmentType = String(body.appointmentType ?? '');
  const tripSlug = body.tripSlug ? String(body.tripSlug) : null;
  const consent = body.consent === true;

  if (!name || !school) {
    return NextResponse.json({ ok: false, error: 'Please fill in your name and school.' }, { status: 400 });
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ ok: false, error: 'Please enter a valid email address.' }, { status: 400 });
  }
  if (!APPOINTMENT_TYPES.has(appointmentType)) {
    return NextResponse.json({ ok: false, error: 'Please choose an appointment type.' }, { status: 400 });
  }
  if (!consent) {
    return NextResponse.json({ ok: false, error: 'Please confirm the privacy consent.' }, { status: 400 });
  }

  const db = createAdminClient();
  const { error } = await db.from('appointment_requests').insert({
    name,
    school,
    email,
    appointment_type: appointmentType,
    trip_slug: tripSlug,
    consent,
  });
  if (error) {
    console.error('[appointments] insert failed:', error.message);
    return NextResponse.json(
      { ok: false, error: 'Something went wrong saving your request — please try again or call us.' },
      { status: 500 }
    );
  }

  const tripTitle = tripSlug ? (await getTripBySlug(tripSlug))?.title ?? null : null;
  const details = { name, school, email, appointmentType, tripTitle };

  // Fire both emails; failures are logged but never block the booking.
  await Promise.allSettled([
    sendAppointmentConfirmation(details),
    sendAppointmentNotification(details),
  ]);

  return NextResponse.json({ ok: true });
}
