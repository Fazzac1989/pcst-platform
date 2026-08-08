import type { Metadata } from 'next';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeaderWithData';
import { SiteFooterSimple } from '@/components/SiteFooter';
import { getPublishedTrips, type Trip } from '@/lib/data';

export const metadata: Metadata = {
  title: 'All trips',
  description:
    'Every ready-to-run Premium Choice School Trips itinerary, grouped by curriculum subject — departing Dubai.',
};

const ROMANS = [
  'i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x',
  'xi', 'xii', 'xiii', 'xiv', 'xv', 'xvi', 'xvii', 'xviii', 'xix', 'xx',
];

export default async function TripsIndexPage() {
  const trips = await getPublishedTrips();

  const bySubject = new Map<string, Trip[]>();
  for (const trip of trips) {
    const group = bySubject.get(trip.subject) ?? [];
    group.push(trip);
    bySubject.set(trip.subject, group);
  }
  const subjects = [...bySubject.keys()].sort((a, b) => a.localeCompare(b));

  return (
    <>
      <SiteHeader variant="trip" />

      <div className="thero thero--index">
        <div className="scrim"></div>
        <div className="wrap">
          <span className="eyebrow">All itineraries</span>
          <h1>
            Every trip, <i>ready to run</i>
          </h1>
          <div className="tmeta">
            <div>
              <b>Trips</b>
              {trips.length} itineraries
            </div>
            <div>
              <b>Subjects</b>
              {subjects.length} curriculum areas
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
            {subjects.map((subject) => (
              <div className="subj-group" key={subject}>
                <span className="eyebrow">{subject}</span>
                {bySubject.get(subject)!.map((trip, i) => (
                  <Link className="subj-row" href={`/trips/${trip.slug}`} key={trip.slug}>
                    <span className="idx">{ROMANS[i]}.</span>
                    <h3>{trip.title}</h3>
                    <span className="dest">
                      {trip.country}
                      <span className="sep">·</span>
                      {trip.durationDays} days / {trip.durationNights} nights
                    </span>
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </section>
      </main>

      <SiteFooterSimple />
    </>
  );
}
