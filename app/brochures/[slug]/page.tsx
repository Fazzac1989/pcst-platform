import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { loadBrochure } from '@/lib/brochure/data';
import BrochureSlides from '@/components/brochure/BrochureSlides';
import SchoolCollection from '@/components/collection/SchoolCollection';
import { schoolName, toCollectionTrip } from '@/lib/brochure/collection';
import { gatherTrips, groupSpreads, orderByContinent } from '@/lib/brochure/spreads';
import { buildEditorialSlides, editorialFor } from '@/lib/brochure/editorial';
import PasswordGate from '@/components/brochure/PasswordGate';
import '@/components/brochure/gate.css';
import '@/components/collection/collection.css';

/**
 * The public brochure.
 *
 * Rendered per request rather than statically: a brochure can be unlisted or
 * password protected, and those checks have to happen before any content is
 * sent. Published public brochures are cached at the edge instead.
 *
 * A brochure is published in one of two presentations, and the record says
 * which. The classic one reads as a deck — cover, contents, a page per trip —
 * one page at a time, with a turn between them; every slide is rendered and the
 * print stylesheet lays them out as A4 pages, so the PDF is this document
 * rather than a second one built to match. The collection reads as a website:
 * a hero, filters and a card per trip, each with a page of its own.
 *
 * Both are built from the same spreads, and the PDF is the deck either way, so
 * switching between them changes nothing about the content.
 */
export const dynamic = 'force-dynamic';

type Props = {
  params: { slug: string };
  searchParams: { pw?: string; via?: string; style?: string };
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const result = await loadBrochure(params.slug, { password: searchParams.pw, invite: searchParams.via });
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
  const result = await loadBrochure(params.slug, { password: searchParams.pw, invite: searchParams.via });

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
  const carried = new URLSearchParams();
  if (searchParams.pw) carried.set('pw', searchParams.pw);
  if (searchParams.via) carried.set('via', searchParams.via);
  const pdfHref = `/api/brochures/${encodeURIComponent(params.slug)}/pdf${
    carried.toString() ? `?${carried}` : ''
  }`;

  const visible = pages.filter((p) => !p.hidden);
  const cover = visible.find((p) => p.pageType === 'cover')?.content ?? {};
  const closing = visible.find(
    (p) => p.pageType === 'contact' || p.pageType === 'callToAction',
  )?.content;
  // A collection of trips reads by region: continent by continent, cities in
  // alphabetical order inside each. A brochure built around a subject keeps the
  // order it was arranged in, because there the subject is the organising idea.
  const bySubject = brochure.kind === 'subject';
  const spreads = bySubject
    ? gatherTrips(visible, trips)
    : orderByContinent(gatherTrips(visible, trips));

  // Who we are, how a group is kept safe, and the app the trip runs on — the
  // ones this brochure asked for. The safety content is the same the public
  // safety page shows, rather than a second copy that would drift from it.
  const editorial = editorialFor(await buildEditorialSlides(), brochure.design);

  // Which of the two presentations. The record decides; ?style= overrides it
  // for one page view so the two can be compared side by side before either is
  // saved. The override changes nothing that is stored, and both presentations
  // show the same content, so it grants no access the link did not already.
  const asked = searchParams.style === 'classic' || searchParams.style === 'collection'
    ? searchParams.style
    : null;
  // Anything but 'collection' is the deck, which is what every brochure was
  // before there was a choice.
  const presentation = asked ?? brochure.design.presentation ?? 'classic';

  if (presentation === 'collection') {
    const collectionTrips = spreads.map(toCollectionTrip);
    const edition = `Your school collection · ${
      (brochure.publishedAt ?? brochure.createdAt).slice(0, 4)
    }`;
    return (
      <SchoolCollection
        brochure={brochure}
        trips={collectionTrips}
        schoolName={schoolName(brochure)}
        edition={edition}
        heroImage={brochure.coverImage ?? collectionTrips[0]?.image ?? null}
        pdfHref={pdfHref}
        // The existing teachers' page is the support content; no new route invented.
        supportHref="/for-teachers"
      />
    );
  }

  return (
    <BrochureSlides
      brochure={brochure}
      cover={cover}
      spreads={spreads}
      groups={groupSpreads(spreads, bySubject ? 'subject' : 'continent')}
      editorial={editorial}
      showItinerary={brochure.design.showItinerary !== false}
      closing={closing}
      brochureQrSvg={brochureQrSvg}
      pdfHref={pdfHref}
    />
  );
}
