import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

/**
 * Records a trip page view, then updates it with dwell time when the visitor
 * leaves. No cookies and no personal data — just a count and a duration.
 *
 * POST { tripId, referrer }        -> { id }
 * POST { id, dwellSeconds }        -> {}   (sent via sendBeacon on leave)
 */
export async function POST(request: Request) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const db = createAdminClient();

  // Second call: close out an existing view with its dwell time.
  if (body.id) {
    const id = Number(body.id);
    const dwell = Math.round(Number(body.dwellSeconds));
    if (!Number.isInteger(id) || !Number.isFinite(dwell) || dwell < 0) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    // Cap at 30 minutes so an abandoned tab doesn't skew the averages.
    await db
      .from('trip_views')
      .update({ dwell_seconds: Math.min(dwell, 1800) })
      .eq('id', id)
      .is('dwell_seconds', null);
    return NextResponse.json({ ok: true });
  }

  // First call: open a view.
  const tripId = Number(body.tripId);
  if (!Number.isInteger(tripId)) return NextResponse.json({ ok: false }, { status: 400 });

  const referrer =
    typeof body.referrer === 'string' && body.referrer ? body.referrer.slice(0, 200) : null;

  const { data, error } = await db
    .from('trip_views')
    .insert({ trip_id: tripId, referrer })
    .select('id')
    .single();
  if (error) return NextResponse.json({ ok: false }, { status: 500 });

  return NextResponse.json({ ok: true, id: data.id });
}
