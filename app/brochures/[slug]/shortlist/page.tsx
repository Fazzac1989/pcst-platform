import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { loadBrochure } from '@/lib/brochure/data';
import { gatherTrips, orderByContinent } from '@/lib/brochure/spreads';
import { schoolName, toCollectionTrip } from '@/lib/brochure/collection';
import ShortlistView from '@/components/collection/ShortlistView';
import PasswordGate from '@/components/brochure/PasswordGate';
import '@/components/brochure/gate.css';
import '@/components/collection/collection.css';
import '@/components/collection/detail.css';

/**
 * The trips a school has saved.
 *
 * The shortlist itself is in the reader's browser, so this page ships the whole
 * collection and the client narrows it. Access is the brochure's own.
 */
export const dynamic = 'force-dynamic';

type Props = {
  params: { slug: string };
  searchParams: { pw?: string; via?: string };
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const access = await loadBrochure(params.slug, { password: searchParams.pw, invite: searchParams.via });
  if (access.state !== 'ok') return { title: 'Not found', robots: { index: false } };
  return {
    title: `Your shortlist — ${access.data.brochure.title}`,
    robots: { index: false, follow: false },
  };
}

export default async function ShortlistPage({ params, searchParams }: Props) {
  const access = await loadBrochure(params.slug, { password: searchParams.pw, invite: searchParams.via });

  if (access.state === 'password') {
    return <PasswordGate title={access.title} wrong={Boolean(searchParams.pw)} />;
  }
  if (access.state !== 'ok') notFound();

  const { brochure, pages, trips } = access.data;
  const visible = pages.filter((p) => !p.hidden);
  const spreads = orderByContinent(gatherTrips(visible, trips));

  return (
    <ShortlistView
      brochure={brochure}
      trips={spreads.map(toCollectionTrip)}
      schoolName={schoolName(brochure)}
      supportHref="/for-teachers"
    />
  );
}
