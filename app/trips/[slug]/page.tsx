import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import AppointmentForm from '@/components/AppointmentForm';
import SiteHeader from '@/components/SiteHeaderWithData';
import { SiteFooterSimple } from '@/components/SiteFooter';
import { getBookingTerms, getPublishedTrips, getTripBySlug } from '@/lib/data';

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

  const others = allTrips.filter((t) => t.slug !== trip.slug);

  return (
    <>
      <SiteHeader variant="trip" />

      <div className="thero">
        <div className="bg">
          {trip.heroImage && (
            <Image
              src={trip.heroImage}
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
        {trip.gallery.length > 0 && (
          <section className="tgallery-band">
            <div className="wrap">
              <div className={`tgallery n${Math.min(trip.gallery.length, 6)}`}>
                {trip.gallery.slice(0, 6).map((src, i) => (
                  <div className="tg-item" key={i}>
                    <Image
                      src={src}
                      alt={`${trip.title} — photo ${i + 1}`}
                      fill
                      sizes="(max-width: 720px) 78vw, (max-width: 1100px) 50vw, 33vw"
                      style={{ objectFit: 'cover' }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        <section>
          <div className="wrap">
            <div className="cols">
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

                <span className="eyebrow" style={{ display: 'block', marginTop: 44 }}>
                  Day by day
                </span>
                <h2 className="st serif">
                  The <i>itinerary</i>
                </h2>
                <div className="days">
                  {trip.itinerary.map((day, i) => (
                    <div className="day" key={i}>
                      <div className="dnum">{day.label}</div>
                      <div>
                        {day.title && <h3>{day.title}</h3>}
                        <p>{day.description}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: 44 }}>
                  <details className="terms">
                    <summary>Booking terms &amp; conditions</summary>
                    <ol>
                      {terms.map((t, i) => (
                        <li key={i}>{t}</li>
                      ))}
                    </ol>
                  </details>
                </div>
              </div>

              <div className="side">
                <div className="panel cta">
                  <h3>Book an appointment</h3>
                  <p>
                    Every itinerary can be tailored to your dates, group size, budget and
                    learning objectives. Speak to our Dubai team — we&apos;ll come back within
                    24 hours.
                  </p>
                  <AppointmentForm tripSlug={trip.slug} />
                  <div className="c">
                    <div>
                      <b>Call</b> +971 4 420 6965
                    </div>
                    <div>
                      <b>Email</b> info@premiumchoicetravel.com
                    </div>
                  </div>
                </div>
                <div className="panel">
                  <h4>What&apos;s included</h4>
                  <ul>
                    {trip.includes.map((item, i) => (
                      <li key={i}>
                        <span className="tick">✓</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
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
