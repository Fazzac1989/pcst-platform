import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import SiteHeader from '@/components/SiteHeaderWithData';
import { SiteFooterSimple } from '@/components/SiteFooter';
import { getCountries, getPublishedTrips } from '@/lib/data';

type Props = { params: { slug: string } };

export async function generateStaticParams() {
  const countries = await getCountries();
  return countries.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const countries = await getCountries();
  const country = countries.find((c) => c.slug === params.slug);
  if (!country) return {};
  return {
    title: `School trips to ${country.name}`,
    description: `${country.tripCount} curriculum-built itineraries in ${country.name} across ${country.subjects.join(', ')} — designed, priced and supported from Dubai.`,
  };
}

export default async function CountryPage({ params }: Props) {
  const [countries, allTrips] = await Promise.all([getCountries(), getPublishedTrips()]);
  const country = countries.find((c) => c.slug === params.slug);
  if (!country) notFound();

  const trips = allTrips.filter((t) => t.countrySlug === country.slug);
  const others = countries.filter((c) => c.slug !== country.slug);

  return (
    <>
      <SiteHeader variant="trip" />

      <div className="thero thero--index">
        <div className="bg">
          {country.heroImage && (
            <Image
              src={country.heroImage}
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
          <span className="eyebrow">Destination</span>
          <h1>{country.name}</h1>
          <div className="tmeta">
            <div>
              <b>Itineraries</b>
              {country.tripCount} ready to run
            </div>
            <div>
              <b>Subjects</b>
              {country.subjects.join(' · ')}
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
            <span className="eyebrow">Learning in {country.name}</span>
            <h2 className="st serif">
              Choose your <i>trip</i>
            </h2>
            <div className="trip-grid">
              {trips.map((trip) => (
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
                    <span className="tag">{trip.subject}</span>
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
              More <i>countries</i>
            </h2>
            <div className="olinks">
              {others.map((c) => (
                <Link href={`/countries/${c.slug}`} key={c.slug}>
                  {c.name}
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
