import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { getProposalByToken } from '@/lib/brochure/proposal-view-model';
import {
  generateProposalPdf,
  isStale,
  signedPdfUrl,
  tooManyRecentRenders,
} from '@/lib/brochure/proposal-pdf';

/**
 * The proposal PDF.
 *
 * GET returns the file (the print button's fallback follows a link, so it has
 * to be a GET). POST forces a fresh render and answers with JSON, which is what
 * the studio will use after an edit.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// A cold Chromium launch plus a full page render does not fit in the default
// ten seconds.
export const maxDuration = 60;

/**
 * Two ways in, and no third.
 *
 * A share token proves the holder was sent this proposal; a signed-in staff
 * session proves the caller works here. Without one of them the id alone is
 * just a small integer, and guessing it should get nothing.
 */
async function authorise(id: number, token: string | null) {
  if (token) {
    const vm = await getProposalByToken(token);
    if (vm && vm.id === id) return { ok: true as const, via: 'token' as const };
  }
  const { data } = await createClient().auth.getUser();
  if (data.user) return { ok: true as const, via: 'staff' as const };
  return { ok: false as const };
}

/** Where Chromium should point. Its own origin, so it renders this deploy. */
function pageUrl(req: NextRequest, id: number, token: string | null) {
  const origin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || req.nextUrl.origin;
  return token ? `${origin}/p/${token}` : `${origin}/proposals/${id}`;
}

async function resolve(req: NextRequest, id: number, force: boolean) {
  const token = req.nextUrl.searchParams.get('token');

  if (!Number.isFinite(id)) return { status: 400, error: 'Bad proposal id' };

  const auth = await authorise(id, token);
  if (!auth.ok) {
    // The same answer whether the proposal exists or not.
    return { status: 404, error: 'Not found' };
  }

  const db = createAdminClient();
  const { data: brochure } = await db
    .from('brochures')
    .select('id, updated_at, pdf_storage_path, pdf_generated_at')
    .eq('id', id)
    .maybeSingle();
  if (!brochure) return { status: 404, error: 'Not found' };

  const needsRender = force || isStale(brochure);

  if (needsRender) {
    if (await tooManyRecentRenders(id)) {
      // Serve whatever we already have rather than refusing outright.
      if (brochure.pdf_storage_path) {
        const url = await signedPdfUrl(brochure.pdf_storage_path);
        if (url) {
          // Still a download from the reader's point of view, so it counts.
          await db.from('proposal_events').insert({
            brochure_id: id,
            event: 'pdf_downloaded',
            metadata: { via: auth.via, rendered: false, throttled: true },
          });
          return { status: 200, url, cached: true, throttled: true };
        }
      }
      return { status: 429, error: 'Too many renders for this proposal; try again shortly.' };
    }

    const result = await generateProposalPdf(id, pageUrl(req, id, token));
    if (!result.ok) return { status: 502, error: result.error };

    await db.from('proposal_events').insert({
      brochure_id: id,
      event: 'pdf_downloaded',
      metadata: { via: auth.via, bytes: result.bytes, rendered: true },
    });

    const url = await signedPdfUrl(result.path);
    if (!url) return { status: 502, error: 'Could not sign the stored file' };
    return { status: 200, url, cached: false };
  }

  await db.from('proposal_events').insert({
    brochure_id: id,
    event: 'pdf_downloaded',
    metadata: { via: auth.via, rendered: false },
  });

  const url = await signedPdfUrl(brochure.pdf_storage_path!);
  if (!url) return { status: 502, error: 'Could not sign the stored file' };
  return { status: 200, url, cached: true };
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const out = await resolve(req, Number(params.id), false);
  if (!('url' in out) || !out.url) {
    return NextResponse.json({ error: out.error }, { status: out.status });
  }
  // Redirect rather than proxy: the signed URL streams from Storage, so the
  // function is not holding a several-megabyte body open.
  return NextResponse.redirect(out.url, { status: 302 });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const out = await resolve(req, Number(params.id), true);
  if (!('url' in out) || !out.url) {
    return NextResponse.json({ error: out.error }, { status: out.status });
  }
  return NextResponse.json({ url: out.url, cached: out.cached ?? false });
}
