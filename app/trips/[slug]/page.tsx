import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import AppointmentModal from '@/components/AppointmentModal';
import ViewTracker from '@/components/ViewTracker';
import SiteHeader from '@/components/SiteHeaderWithData';
import { SiteFooterSimple } from '@/components/SiteFooter';
import {
  citySlug,
  getBookingTerms,
  getCountries,
  getItineraryDays,
  getPublishedTrips,
  getTripBySlug,
  getTripHighlights,
  isSingleCity,
} from '@/lib/data';
import { countrySlugsFor } from '@/lib/country-meta';
import { getDestinationNotes } from '@/lib/destination-notes';
import { packingList } from '@/lib/packing';
import ItineraryPanel from './ItineraryPanel';
import ItineraryTimeline from './ItineraryTimeline';
import TripGallery, { type GalleryItem } from './TripGallery';

type Props = { params: { slug: string } };

export async function generateStaticParams() {
  const trips = await getPublishedTrips();
  return trips.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const trip = await getTripBySlug(params.slug);
  if (!trip) return {};
  const description = trip.overview[0]?.slice(0, 160) ?? trip.title;
  return {
    title: trip.title,
    description,
    openGraph: {
      title: `${trip.title} — Premium Choice School Trips`,
      description,
      images: trip.heroImage ? [{ url: trip.heroImage }] : undefined,
    },
  };
}

export default async function TripPage({ params }: Props) {
  const [trip, allTrips, terms] = await Promise.all([
    getTripBySlug(params.slug),
    getPublishedTrips(),
    getBookingTerms(),
  ]);
  if (!trip) notFound();

  // The structured timeline replaces the old day list only once a trip has been
  // through extraction; until then the previous presentation stands.
  const [itineraryDays, tripHighlights] = await Promise.all([
    getItineraryDays(trip.id),
    getTripHighlights(trip.id),
  ]);
  const hasStructured = itineraryDays.some((d) => d.structured);

  // The trip owns its photography: whatever is on the trip in the admin is
  // what the page shows, so removing an image there removes it here.
  const heroUrl = trip.heroImage;
  const heroAlt = trip.heroAlt;
  const galleryItems: GalleryItem[] = trip.gallery;

  // Two or three genuine alternatives in the same subject, not a wall of every
  // trip we sell. A teacher reading a History itinerary is weighing History
  // options, so that is what the page offers next.
  const alternatives = allTrips
    .filter((t) => t.subjectSlug === trip.subjectSlug && t.slug !== trip.slug)
    .slice(0, 3);

  // The country facts panel moved to the country pages; the trip carries the
  // things a traveller acts on — what to pack, and how to behave when there.
  const packing = packingList({
    subject: trip.subject,
    country: trip.country,
    countrySlug: trip.countrySlug,
    durationDays: trip.durationDays,
    avgTempC: trip.countryFacts?.avgTempC ?? null,
  });
  const culture = getDestinationNotes(trip.countrySlug)?.culture ?? [];

  // A multi-country tour is filed under one combined record but visits several
  // countries, and each of those has its own page to link to.
  const countries = await getCountries();
  const countryLinks = countrySlugsFor(trip.countrySlug)
    .map((slug) => ({ slug, name: countries.find((c) => c.slug === slug)?.name ?? trip.country }))
    .filter((c) => countries.some((x) => x.slug === c.slug));

  return (
    <>
      <SiteHeader variant="trip" />
      <ViewTracker tripId={trip.id} />

      <div className="thero">
        <div className="bg">
          {heroUrl && (
            <Image
              src={heroUrl}
              alt={heroAlt}
              fill
              priority
              quality={65}
              sizes="100vw"
              style={{ objectFit: 'cover' }}
            />
          )}
        </div>
        <div className="scrim"></div>
        <div className="wrap">
          <span className="eyebrow">
            {trip.subject} · {trip.country}
          </span>
          <h1>{trip.title}</h1>
          <div className="tmeta">
            <div>
              <b>{countryLinks.length > 1 ? 'Countries' : 'Country'}</b>
              <span>
                {countryLinks.map((c, i) => (
                  <span key={c.slug}>
                    {i > 0 && ' · '}
                    <Link href={`/countries/${c.slug}`}>{c.name}</Link>
                  </span>
                ))}
              </span>
            </div>
            {trip.city && (
              <div>
                <b>City</b>
                {isSingleCity(trip.city) ? (
                  <Link href={`/cities/${citySlug(trip.city)}`}>{trip.city}</Link>
                ) : (
                  trip.city
                )}
              </div>
            )}
            <div>
              <b>Duration</b>
              {trip.durationDays} days / {trip.durationNights} nights
            </div>
            <div>
              <b>Departs</b>
              {trip.departs}
            </div>
          </div>
        </div>
      </div>

      <main className="trip-main">
        {galleryItems.length > 0 && (
          <section className="tgallery-band">
            <div className="wrap">
              <TripGallery images={galleryItems} tripTitle={trip.title} />
            </div>
          </section>
        )}

        <section className="trip-overview">
          <div className="wrap">
            <div className="ov-cols">
              <div>
                <span className="eyebrow">Overview</span>
                <h2 className="st serif">
                  About this <i>trip</i>
                </h2>
                {trip.overview.map((para, i) => (
                  <p className="ovp" key={i}>
                    {para}
                  </p>
                ))}
              </div>
              <aside className="cfacts cfacts--pack" aria-label="What to pack">
                <h3>
                  What to pack <span>{trip.subject} · {trip.country}</span>
                </h3>
                {packing.map((group) => (
                  <div className="packgroup" key={group.title}>
                    <h4>{group.title}</h4>
                    <ul>
                      {group.items.map((item) => (
                        <li key={item}>
                          <span className="tick">✓</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
                {countryLinks[0] && (
                  <Link className="cfacts-link" href={`/countries/${countryLinks[0].slug}`}>
                    {countryLinks[0].name} at a glance →
                  </Link>
                )}
              </aside>
            </div>
          </div>
        </section>

        <section className="trip-itinerary">
          <div className="wrap">
            <span className="eyebrow">Day by day</span>
            <h2 className="st serif">
              The <i>itinerary</i>
            </h2>
            {hasStructured ? (
              <ItineraryTimeline days={itineraryDays} tripHighlights={tripHighlights}>
                <AppointmentModal tripSlug={trip.slug} />
              </ItineraryTimeline>
            ) : (
              <ItineraryPanel
                itinerary={trip.itinerary}
                fallbackImage={trip.heroImage ?? trip.gallery[0]?.url ?? null}
                fallbackAlt={trip.heroAlt || trip.gallery[0]?.alt || ''}
              >
                <AppointmentModal tripSlug={trip.slug} />
              </ItineraryPanel>
            )}
          </div>
        </section>

        <section className="inc-band">
          <div className="wrap">
            <span className="eyebrow">What&apos;s included</span>
            <h2 className="st serif">
              Everything in the <i>price</i>
            </h2>
            <ul className="inc-grid">
              {trip.includes.map((item, i) => (
                <li key={i}>
                  <span className="tick">✓</span>
                  {item}
                </li>
              ))}
            </ul>
            <details className="terms">
              <summary>Booking terms &amp; conditions</summary>
              <ol>
                {terms.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ol>
            </details>
          </div>
        </section>

        {culture.length > 0 && (
          <section className="culture-band">
            <div className="wrap">
              <span className="eyebrow">Cultural awareness</span>
              <h2 className="st serif">
                Customs &amp; norms in <i>{trip.country}</i>
              </h2>
              <p className="ovp">
                A little cultural fluency goes a long way — these are the habits your hosts will
                notice and appreciate.
              </p>
              <ul className="culture-grid">
                {culture.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {alternatives.length > 0 && (
          <section className="others">
            <div className="wrap">
              <span className="eyebrow">{trip.subject}</span>
              <h2 className="st serif">
                Also worth <i>considering</i>
              </h2>
              <div className="altgrid">
                {alternatives.map((t) => (
                  <Link href={`/trips/${t.slug}`} key={t.slug} className="altcard">
                    <span className="altcard-img">
                      {t.heroImage && (
                        <Image src={t.heroImage} alt="" fill sizes="(max-width: 700px) 100vw, 33vw" style={{ objectFit: 'cover' }} />
                      )}
                    </span>
                    <span className="altcard-body">
                      <strong>{t.title}</strong>
                      <span>
                        {t.country} · {t.durationDays} days
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      <SiteFooterSimple />
    </>
  );
}
