import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { loadBrochure } from '@/lib/brochure/data';
import { gatherTrips, orderByContinent } from '@/lib/brochure/spreads';
import { preparedFor, schoolName, toCollectionTrip } from '@/lib/brochure/collection';
import { contactHref } from '@/lib/brochure/collection-contact';
import TripDetail from '@/components/collection/TripDetail';
import PasswordGate from '@/components/brochure/PasswordGate';
import '@/components/brochure/gate.css';
import '@/components/collection/collection.css';
import '@/components/collection/detail.css';

/**
 * One trip from a school's collection.
 *
 * Access is the brochure's own: loadBrochure applies the same draft, archived,
 * unlisted and password rules, so a trip page cannot be read by anyone who
 * could not read the brochure it belongs to. A trip that is not in this
 * brochure is a 404 here even when it exists in the catalogue.
 */
export const dynamic = 'force-dynamic';

type Props = {
  params: { slug: string; id: string };
  searchParams: Record<string, string | string[] | undefined>;
};

async function find(slug: string, id: string, searchParams: Props['searchParams']) {
  const pw = typeof searchParams.pw === 'string' ? searchParams.pw : undefined;
  const via = typeof searchParams.via === 'string' ? searchParams.via : undefined;
  const access = await loadBrochure(slug, { password: pw, invite: via });
  if (access.state !== 'ok') return { access, trip: null as ReturnType<typeof toCollectionTrip> | null };

  const { brochure, pages, trips } = access.data;
  const visible = pages.filter((p) => !p.hidden);
  const spreads = orderByContinent(gatherTrips(visible, trips));
  const wanted = Number(id);
  const found = spreads.find((s) => s.tripId === wanted);
  return { access, trip: found ? toCollectionTrip(found) : null };
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { access, trip } = await find(params.slug, params.id, searchParams);
  if (access.state !== 'ok' || !trip) return { title: 'Not found', robots: { index: false } };
  return {
    title: `${trip.title} — ${access.data.brochure.title}`,
    description: trip.summary || undefined,
    // A school's collection is not for the index, whatever its visibility.
    robots: { index: false, follow: false },
  };
}

export default async function BrochureTripPage({ params, searchParams }: Props) {
  const { access, trip } = await find(params.slug, params.id, searchParams);

  if (access.state === 'password') {
    return <PasswordGate title={access.title} wrong={Boolean(searchParams.pw)} />;
  }
  if (access.state !== 'ok' || !trip) notFound();

  const { brochure } = access.data;
  const school = schoolName(brochure);

  // Everything the teacher had narrowed to, carried back to the collection.
  const back = new URLSearchParams();
  for (const [k, v] of Object.entries(searchParams)) {
    if (typeof v === 'string' && v) back.set(k, v);
  }

  return (
    <TripDetail
      brochure={brochure}
      trip={trip}
      schoolName={school}
      backQuery={back.toString()}
      supportHref="/for-teachers"
      preparedFor={preparedFor(brochure)}
      contactHref={contactHref({
        to: brochure.design.contactEmail,
        schoolName: school,
        brochureTitle: brochure.title,
        trips: [trip.title],
      })}
    />
  );
}
