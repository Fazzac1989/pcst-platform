import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { loadBrochure } from '@/lib/brochure/data';
import BrochureSlides from '@/components/brochure/BrochureSlides';
import { gatherTrips, groupSpreads } from '@/lib/brochure/spreads';
import { buildEditorialSlides, editorialFor } from '@/lib/brochure/editorial';
import PasswordGate from '@/components/brochure/PasswordGate';
import '@/components/brochure/gate.css';

/**
 * The public brochure.
 *
 * Rendered per request rather than statically: a brochure can be unlisted or
 * password protected, and those checks have to happen before any content is
 * sent. Published public brochures are cached at the edge instead.
 *
 * It reads as a deck — cover, contents, a page per trip — one page at a time,
 * with a turn between them. Every slide is rendered and the print stylesheet
 * lays them out as A4 pages, so the PDF is this document rather than a second
 * one built to match, and there is no separate accessible view to keep in step.
 */
export const dynamic = 'force-dynamic';

type Props = {
  params: { slug: string };
  searchParams: { pw?: string };
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const result = await loadBrochure(params.slug, { password: searchParams.pw });
  if (result.state !== 'ok') return { title: 'Brochure', robots: { index: false, follow: false } };

  const { brochure } = result.data;
  // Only a deliberately public brochure is indexable. A school's bespoke
  // proposal must never turn up in a search result.
  const indexable = brochure.visibility === 'public' && !brochure.hasPassword;

  return {
    title: brochure.seoTitle ?? `${brochure.title} — Premium Choice School Trips`,
    description: brochure.seoDescription ?? brochure.subtitle ?? undefined,
    robots: indexable ? undefined : { index: false, follow: false },
    openGraph: {
      title: brochure.title,
      description: brochure.subtitle ?? undefined,
      images: brochure.coverImage ? [{ url: brochure.coverImage }] : undefined,
    },
  };
}

export default async function BrochurePage({ params, searchParams }: Props) {
  const result = await loadBrochure(params.slug, { password: searchParams.pw });

  if (result.state === 'missing') notFound();
  if (result.state === 'draft') {
    return (
      <div className="bgate">
        <div style={{ textAlign: 'center' }}>
          <h1>Not published yet</h1>
          <p>This brochure is still a draft.</p>
        </div>
      </div>
    );
  }
  if (result.state === 'password') {
    return <PasswordGate title={result.title} wrong={Boolean(searchParams.pw)} />;
  }

  const { brochure, pages, trips, brochureQrSvg } = result.data;

  // The password travels with the PDF request, since that route has to load the
  // brochure the same way this page did.
  const pdfHref = `/api/brochures/${encodeURIComponent(params.slug)}/pdf${
    searchParams.pw ? `?pw=${encodeURIComponent(searchParams.pw)}` : ''
  }`;

  const visible = pages.filter((p) => !p.hidden);
  const cover = visible.find((p) => p.pageType === 'cover')?.content ?? {};
  const closing = visible.find(
    (p) => p.pageType === 'contact' || p.pageType === 'callToAction',
  )?.content;
  const spreads = gatherTrips(visible, trips);

  // Who we are, how a group is kept safe, and the app the trip runs on — the
  // ones this brochure asked for. The safety content is the same the public
  // safety page shows, rather than a second copy that would drift from it.
  const editorial = editorialFor(await buildEditorialSlides(), brochure.design);

  return (
    <BrochureSlides
      brochure={brochure}
      cover={cover}
      spreads={spreads}
      groups={groupSpreads(spreads, brochure.kind === 'subject' ? 'subject' : 'country')}
      editorial={editorial}
      showItinerary={brochure.design.showItinerary !== false}
      closing={closing}
      brochureQrSvg={brochureQrSvg}
      pdfHref={pdfHref}
    />
  );
}
