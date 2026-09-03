import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendAppointmentConfirmation, sendAppointmentNotification } from '@/lib/email';
import { getTripBySlug } from '@/lib/data';
import { describeRejection, guardSubmission, remoteIpFrom } from '@/lib/spam-guard';

const APPOINTMENT_TYPES = new Set(['we_visit', 'you_visit', 'online']);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request.' }, { status: 400 });
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

  // Bots, before anything is stored or sent. A silent rejection is answered
  // with the ordinary success, so the bot learns nothing. See lib/spam-guard.ts.
  const verdict = await guardSubmission({
    honeypot: typeof body.honeypot === 'string' ? body.honeypot : null,
    stamp: typeof body.stamp === 'string' ? body.stamp : null,
    turnstile: typeof body.turnstile === 'string' ? body.turnstile : null,
    fields: [name, school],
    remoteIp: remoteIpFrom(request.headers.get('x-forwarded-for')),
  });
  if (!verdict.ok) {
    console.warn(describeRejection(verdict, 'appointments', email));
    return verdict.silent
      ? NextResponse.json({ ok: true })
      : NextResponse.json({ ok: false, error: verdict.message }, { status: 400 });
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
