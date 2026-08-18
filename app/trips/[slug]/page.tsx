import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import AppointmentModal from '@/components/AppointmentModal';
import ViewTracker from '@/components/ViewTracker';
import SiteHeader from '@/components/SiteHeaderWithData';
import { SiteFooterSimple } from '@/components/SiteFooter';
import { getBookingTerms, getCuratedImages, getPublishedTrips, getTripBySlug } from '@/lib/data';
import ItineraryPanel from './ItineraryPanel';
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

  // Curated photography wins where it exists; otherwise fall back to the
  // legacy gallery field so nothing regresses before the reset is finished.
  const curated = await getCuratedImages(trip.id);
  const curatedHero = curated.find((c) => c.role === 'hero') ?? null;
  const curatedGallery = curated.filter((c) => c.role === 'gallery');
  const heroUrl = curatedHero?.url ?? trip.heroImage;
  const heroAlt = curatedHero?.alt ?? trip.heroAlt;
  const galleryItems: GalleryItem[] = (
    curatedGallery.length > 0
      ? curatedGallery
      : trip.gallery.map((g) => ({ ...g, caption: null, photographer: null, licence: null, sourceUrl: null, focalX: 0.5, focalY: 0.5 }))
  ).map((g: any) => ({
    url: g.url,
    alt: g.alt,
    caption: g.caption ?? null,
    photographer: g.photographer ?? null,
    licence: g.licence ?? null,
    sourceUrl: g.sourceUrl ?? null,
    focalX: g.focalX ?? 0.5,
    focalY: g.focalY ?? 0.5,
  }));

  const others = allTrips.filter((t) => t.slug !== trip.slug);

  // Only the facts that are actually filled in — the panel is hidden when empty.
  const cf = trip.countryFacts;
  const facts = (
    [
      ['Capital', cf?.capital],
      ['Language', cf?.languages],
      ['Currency', cf?.currency],
      ['Time zone', cf?.timezone],
      ['Population', cf?.population],
      ['Average temp', cf?.avgTempC === null || cf?.avgTempC === undefined ? null : `${cf.avgTempC}°C`],
      ['Best months', cf?.bestTime],
    ] as const
  )
    .filter(([, value]) => Boolean(value))
    .map(([label, value]) => ({ label, value: value as string }));

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
              style={{
                objectFit: 'cover',
                objectPosition: curatedHero
                  ? `${curatedHero.focalX * 100}% ${curatedHero.focalY * 100}%`
                  : 'center',
              }}
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
              <b>Country</b>
              {trip.country}
            </div>
            {trip.city && (
              <div>
                <b>City</b>
                {trip.city}
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
              {facts.length > 0 && (
                <aside className="cfacts" aria-label={`${trip.country} at a glance`}>
                  <h3>
                    {trip.country} <span>at a glance</span>
                  </h3>
                  <dl>
                    {facts.map(({ label, value }) => (
                      <div key={label}>
                        <dt>{label}</dt>
                        <dd>{value}</dd>
                      </div>
                    ))}
                  </dl>
                  <Link className="cfacts-link" href={`/countries/${trip.countrySlug}`}>
                    All {trip.country} trips →
                  </Link>
                </aside>
              )}
            </div>
          </div>
        </section>

        <section className="trip-itinerary">
          <div className="wrap">
            <span className="eyebrow">Day by day</span>
            <h2 className="st serif">
              The <i>itinerary</i>
            </h2>
            <ItineraryPanel
              itinerary={trip.itinerary}
              fallbackImage={trip.heroImage ?? trip.gallery[0]?.url ?? null}
              fallbackAlt={trip.heroAlt || trip.gallery[0]?.alt || ''}
            >
              <AppointmentModal tripSlug={trip.slug} />
            </ItineraryPanel>
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

        <section className="others">
          <div className="wrap">
            <span className="eyebrow">Keep exploring</span>
            <h2 className="st serif">
              More trips your students <i>will remember</i>
            </h2>
            <div className="olinks">
              {others.map((t) => (
                <Link href={`/trips/${t.slug}`} key={t.slug}>
                  {t.title}
                </Link>
              ))}
              <Link href="/#trips">← All featured trips</Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooterSimple />
    </>
  );
}
