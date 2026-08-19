import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Brochure engagement, recorded as plainly as possible.
 *
 * One row per meaningful action, enough to tell a salesperson that a school
 * lingered on Japan and skipped Oman. No cookie, no fingerprint, no identifier
 * that outlives the visit: the session key is random per page load and is only
 * ever used to count sessions rather than follow anyone.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const EVENTS = new Set(['view', 'page', 'cta', 'share', 'trip_click']);

export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const brochureId = Number(body?.brochureId);
  const event = String(body?.event ?? '');
  if (!Number.isFinite(brochureId) || !EVENTS.has(event)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const db = createAdminClient();

  // Only against a published brochure, so this cannot be used to probe drafts.
  const { data: brochure } = await db
    .from('brochures')
    .select('id')
    .eq('id', brochureId)
    .eq('status', 'published')
    .maybeSingle();
  if (!brochure) return NextResponse.json({ ok: false }, { status: 404 });

  await db.from('brochure_events').insert({
    brochure_id: brochureId,
    event,
    page_index: Number.isFinite(Number(body?.pageIndex)) ? Number(body.pageIndex) : null,
    trip_id: Number.isFinite(Number(body?.tripId)) ? Number(body.tripId) : null,
    session_key: typeof body?.sessionKey === 'string' ? body.sessionKey.slice(0, 40) : null,
  });

  return NextResponse.json({ ok: true });
}
