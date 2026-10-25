import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { APP_COOKIE } from '@/lib/app/session';

export const dynamic = 'force-dynamic';

// Where a link may land: the app's own pages only.
const PAGES = new Set(['checklist', 'learning', 'itinerary', 'messages']);

/**
 * The link in a parent's email: signs them in with their personal code and
 * opens the page it points to, so there's nothing to type on a phone. A code
 * that doesn't work falls back to the sign-in page.
 */
export async function GET(req: NextRequest) {
  const code = (req.nextUrl.searchParams.get('code') ?? '').trim().toUpperCase();
  const page = req.nextUrl.searchParams.get('to') ?? '';
  const signIn = new URL('/app', req.url);

  if (code.length < 8 || code.length > 40) return NextResponse.redirect(signIn);
  const db = createAdminClient();
  const { data } = await db.from('app_members').select('login_code, app_trips(status)').eq('login_code', code).maybeSingle();
  if (!data || (data.app_trips as any)?.status !== 'active') return NextResponse.redirect(signIn);

  const res = NextResponse.redirect(new URL(PAGES.has(page) ? `/app/trip/${page}` : '/app/trip', req.url));
  res.cookies.set(APP_COOKIE, code, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 90,
    path: '/',
  });
  return res;
}
