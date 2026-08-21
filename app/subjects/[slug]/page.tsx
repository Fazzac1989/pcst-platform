import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import SiteHeader from '@/components/SiteHeaderWithData';
import { SiteFooterSimple } from '@/components/SiteFooter';
import { getPublishedTrips, getSubjectDescription, getSubjects } from '@/lib/data';
import { getSiteSettings } from '@/lib/settings';
import SubjectWorldMap, { type MapCountry } from '@/components/SubjectWorldMap';

type Props = { params: { slug: string }; searchParams: { country?: string } };

const slugifyName = (s: string) =>
  s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export async function generateStaticParams() {
  const subjects = await getSubjects();
  return subjects.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const subjects = await getSubjects();
  const subject = subjects.find((s) => s.slug === params.slug);
  if (!subject) return {};
  return {
    title: `${subject.name} school trips`,
    description: `${subject.tripCount} curriculum-built ${subject.name} itineraries across ${subject.countries.join(', ')} — designed, priced and supported from Dubai.`,
  };
}

export default async function SubjectPage({ params, searchParams }: Props) {
  const [subjects, allTrips, description, settings] = await Promise.all([
    getSubjects(),
    getPublishedTrips(),
    getSubjectDescription(params.slug),
    getSiteSettings(),
  ]);
  const subject = subjects.find((s) => s.slug === params.slug);
  if (!subject) notFound();

  const trips = allTrips.filter((t) => t.subjectSlug === subject.slug);
  const others = subjects.filter((s) => s.slug !== subject.slug);

  // One map entry per country, carrying the trips it offers for this subject.
  const mapCountries: MapCountry[] = [];
  for (const t of trips) {
    if (!t.country) continue;
    const entry = mapCountries.find((c) => c.name === t.country);
    const item = { slug: t.slug, title: t.title, image: t.heroImage };
    if (entry) entry.trips.push(item);
    else mapCountries.push({ name: t.country, trips: [item] });
  }

  // ?country= narrows the grid to one destination without losing the subject
  // context — the Country → Subject → Trips journey works in both directions.
  const countryFilter = searchParams.country
    ? mapCountries.find((c) => slugifyName(c.name) === searchParams.country)?.name ?? null
    : null;
  const visibleTrips = countryFilter ? trips.filter((t) => t.country === countryFilter) : trips;

  return (
    <>
      <SiteHeader variant="trip" />

      <div className="thero thero--index">
        <div className="bg">
          {subject.heroImage && (
            <Image
              src={subject.heroImage}
              alt=""
              fill
              priority
              quality={60}
              sizes="100vw"
              style={{ objectFit: 'cover' }}
            />
          )}
        </div>
        <div className="scrim"></div>
        <div className="wrap">
          <span className="eyebrow">Curriculum subject</span>
          <h1>{subject.name}</h1>
          <div className="tmeta">
            <div>
              <b>Itineraries</b>
              {subject.tripCount} ready to run
            </div>
            <div>
              <b>Countries</b>
              <span className="tmeta-links">
                {subject.countries.map((c, i) => (
                  <span key={c}>
                    {i > 0 && ' · '}
                    <Link href={`/subjects/${subject.slug}?country=${slugifyName(c)}`}>{c}</Link>
                  </span>
                ))}
              </span>
            </div>
            <div>
              <b>Departures</b>
              Airports throughout the UAE
            </div>
          </div>
        </div>
      </div>

      <main className="trip-main">
        {description && (
          <section className="subject-intro">
            <div className="wrap">
              <span className="eyebrow">{subject.name} with us</span>
              <h2 className="st serif">
                Why travel for <i>{subject.name}</i>
              </h2>
              <p className="ovp">{description}</p>
            </div>
          </section>
        )}

        {/* The map is a navigation aid, kept compact and switchable from the
            admin; the clickable country links above do the same job in a line. */}
        {settings.flags.subjectMap && !countryFilter && mapCountries.length > 1 && (
          <section className="subject-map">
            <div className="wrap">
              <span className="eyebrow">Where we go</span>
              <h2 className="st serif">
                {subject.name} around <i>the world</i>
              </h2>
              <p className="ovp">Rest on a highlighted country to see the trip it offers.</p>
              <div className="smap-shell">
                <SubjectWorldMap countries={mapCountries} />
              </div>
            </div>
          </section>
        )}

        <section id="trips">
          <div className="wrap">
            <span className="eyebrow">Where {subject.name} comes alive</span>
            <h2 className="st serif">
              {countryFilter ? (
                <>
                  {subject.name} trips in <i>{countryFilter}</i>
                </>
              ) : (
                <>
                  Choose your <i>destination</i>
                </>
              )}
            </h2>
            {countryFilter && (
              <p className="ovp">
                Showing {visibleTrips.length} {subject.name} trip
                {visibleTrips.length === 1 ? '' : 's'} in {countryFilter}.{' '}
                <Link href={`/subjects/${subject.slug}`} className="filter-clear">
                  View every destination →
                </Link>
              </p>
            )}
            <div className="trip-grid">
              {visibleTrips.map((trip) => (
                <Link className="trip" href={`/trips/${trip.slug}`} key={trip.slug}>
                  {trip.heroImage && (
                    <Image
                      className="ph"
                      src={trip.heroImage}
                      alt=""
                      fill
                      sizes="(max-width: 720px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      style={{ objectFit: 'cover' }}
                    />
                  )}
                  <div className="fade"></div>
                  <div className="meta">
                    <span className="tag">{trip.country}</span>
                    <h3>{trip.title}</h3>
                    <div className="dur">
                      {trip.durationDays} days / {trip.durationNights} nights
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="others">
          <div className="wrap">
            <span className="eyebrow">Keep exploring</span>
            <h2 className="st serif">
              More <i>subjects</i>
            </h2>
            <div className="olinks">
              {others.map((s) => (
                <Link href={`/subjects/${s.slug}`} key={s.slug}>
                  {s.name}
                </Link>
              ))}
              <Link href="/trips">← All trips</Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooterSimple />
    </>
  );
}
