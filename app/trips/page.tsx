import type { Metadata } from 'next';
import Image from 'next/image';
import SiteHeader from '@/components/SiteHeaderWithData';
import SiteFooter from '@/components/SiteFooterWithData';
import { getPublishedTrips } from '@/lib/data';
import TripsExplorer, { type ExplorerTrip } from './TripsExplorer';

export const metadata: Metadata = {
  alternates: { canonical: '/trips' },
  title: 'All trips',
  description:
    'Every Premium Choice School Trips itinerary in one place — filter by subject, destination and length. Designed, priced and supported from Dubai.',
};

export default async function TripsIndexPage() {
  const trips = await getPublishedTrips();

  const explorerTrips: ExplorerTrip[] = trips.map((t) => ({
    slug: t.slug,
    title: t.title,
    subject: t.subject,
    country: t.country,
    city: t.city,
    durationDays: t.durationDays,
    durationNights: t.durationNights,
    heroImage: t.heroImage,
  }));

  const subjects = new Set(trips.map((t) => t.subject).filter(Boolean));
  const countries = new Set(trips.map((t) => t.country).filter(Boolean));

  return (
    <>
      <SiteHeader variant="trip" />

      <div className="thero thero--index">
        <div className="bg">
          {/* Eight of our own trip photographs, because no single destination
              can stand for the whole catalogue. */}
          <Image
            src="/images/hero-trips.jpg"
            alt=""
            fill
            priority
            quality={70}
            sizes="100vw"
            style={{ objectFit: 'cover' }}
          />
        </div>
        <div className="scrim"></div>
        <div className="wrap">
          <span className="eyebrow">All itineraries</span>
          <h1>
            Every journey, <i>in one place</i>
          </h1>
          <div className="tmeta">
            <div>
              <b>Trips</b>
              {trips.length} itineraries
            </div>
            <div>
              <b>Subjects</b>
              {subjects.size} curriculum areas
            </div>
            <div>
              <b>Destinations</b>
              {countries.size} countries
            </div>
            <div>
              <b>Departs</b>
              Dubai
            </div>
          </div>
        </div>
      </div>

      <main className="trip-main">
        <section>
          <div className="wrap">
            <TripsExplorer trips={explorerTrips} />
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
