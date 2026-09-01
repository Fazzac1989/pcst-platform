import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { loadBrochure } from '@/lib/brochure/data';
import { isStale, renderPdf, signedPdfUrl, tooManyRecentRenders } from '@/lib/brochure/proposal-pdf';

/**
 * The brochure PDF.
 *
 * Authorisation is the page's own: loadBrochure applies the same draft,
 * archived, unlisted and password rules, so a brochure that cannot be read at
 * /brochures/<slug> cannot be downloaded here either.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// A cold Chromium launch plus a full render does not fit in ten seconds.
export const maxDuration = 60;

async function resolve(req: NextRequest, slug: string, force: boolean) {
  const pw = req.nextUrl.searchParams.get('pw') ?? undefined;

  const access = await loadBrochure(slug, { password: pw });
  if (access.state !== 'ok') {
    // Missing, draft and wrong-password all answer the same way: a brochure
    // nobody may read should not confirm that it exists.
    return { status: 404, error: 'Not found' };
  }

  const id = access.data.brochure.id;
  const db = createAdminClient();
  const { data: row } = await db
    .from('brochures')
    .select('id, updated_at, pdf_storage_path, pdf_generated_at')
    .eq('id', id)
    .maybeSingle();
  if (!row) return { status: 404, error: 'Not found' };

  if (force || isStale(row)) {
    if (await tooManyRecentRenders(id)) {
      if (row.pdf_storage_path) {
        const url = await signedPdfUrl(row.pdf_storage_path);
        if (url) return { status: 200, url, cached: true };
      }
      return { status: 429, error: 'Too many renders for this brochure; try again shortly.' };
    }

    const origin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || req.nextUrl.origin;
    const pageUrl = `${origin}/brochures/${encodeURIComponent(slug)}${
      pw ? `?pw=${encodeURIComponent(pw)}` : ''
    }`;

    const result = await renderPdf(id, pageUrl, 'brochures');
    if (!result.ok) return { status: 502, error: result.error };

    await db.from('proposal_events').insert({
      brochure_id: id,
      event: 'pdf_downloaded',
      metadata: { kind: 'brochure', bytes: result.bytes, rendered: true },
    });

    const url = await signedPdfUrl(result.path);
    if (!url) return { status: 502, error: 'Could not sign the stored file' };
    return { status: 200, url, cached: false };
  }

  await db.from('proposal_events').insert({
    brochure_id: id,
    event: 'pdf_downloaded',
    metadata: { kind: 'brochure', rendered: false },
  });

  const url = await signedPdfUrl(row.pdf_storage_path!);
  if (!url) return { status: 502, error: 'Could not sign the stored file' };
  return { status: 200, url, cached: true };
}

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  const out = await resolve(req, params.slug, false);
  if (!('url' in out) || !out.url) {
    return NextResponse.json({ error: out.error }, { status: out.status });
  }
  // Redirect rather than proxy: the signed URL streams from Storage, so the
  // function is not holding a several-megabyte body open.
  return NextResponse.redirect(out.url, { status: 302 });
}

export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  const out = await resolve(req, params.slug, true);
  if (!('url' in out) || !out.url) {
    return NextResponse.json({ error: out.error }, { status: out.status });
  }
  return NextResponse.json({ url: out.url, cached: out.cached ?? false });
}
