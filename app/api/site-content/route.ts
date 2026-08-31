import { NextResponse, type NextRequest } from 'next/server';
import { getSafetyPage, getSiteSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

/**
 * The content the site is currently publishing — defaults merged with whatever
 * has been saved.
 *
 * The admin console lives in the other project and needs to show the live
 * wording in its editor. Reading it from here rather than keeping a second
 * copy of the defaults means the two cannot drift apart: this is the same
 * function the pages themselves render from.
 *
 * GET /api/site-content?secret=…
 */
export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret');
  if (!process.env.REVALIDATE_SECRET || secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ ok: false, error: 'Invalid secret' }, { status: 401 });
  }

  const [site, safety] = await Promise.all([getSiteSettings(), getSafetyPage()]);
  return NextResponse.json({ ok: true, site, safety }, { headers: { 'Cache-Control': 'no-store' } });
}
