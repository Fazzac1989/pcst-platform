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
  revalidatePath('/');
  revalidatePath('/trips');
  if (slug) revalidatePath(`/trips/${slug}`);
  return NextResponse.json({ ok: true, revalidated: ['/', '/trips', slug && `/trips/${slug}`].filter(Boolean) });
}
