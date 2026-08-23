import { revalidatePath } from 'next/cache';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * On-demand revalidation for external triggers (admin server actions
 * already revalidate directly). POST /api/revalidate?secret=…&slug=…
 */
export async function POST(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret');
  if (!process.env.REVALIDATE_SECRET || secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ ok: false, error: 'Invalid secret' }, { status: 401 });
  }
  const slug = request.nextUrl.searchParams.get('slug');
  const scope = request.nextUrl.searchParams.get('scope');

  const revalidated: string[] = ['/', '/trips', '/safety'];
  revalidatePath('/');
  revalidatePath('/trips');
  revalidatePath('/safety');
  if (slug) {
    revalidatePath(`/trips/${slug}`);
    revalidated.push(`/trips/${slug}`);
  }

  // Renaming a subject or country changes every page that lists it, not just
  // the trips themselves.
  if (scope === 'taxonomy') {
    revalidatePath('/countries/[slug]', 'page');
    revalidatePath('/subjects/[slug]', 'page');
    revalidatePath('/cities/[slug]', 'page');
    revalidated.push('/countries/[slug]', '/subjects/[slug]', '/cities/[slug]');
  }

  return NextResponse.json({ ok: true, revalidated });
}
