import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import SiteHeader from '@/components/SiteHeaderWithData';
import SiteFooter from '@/components/SiteFooterWithData';
import {
  citySlug,
  getCities,
  getCityContent,
  getCityImages,
  getPublishedTrips,
  isSingleCity,
} from '@/lib/data';
import TripGallery, { type GalleryItem } from '@/app/trips/[slug]/TripGallery';

/**
 * City pages are derived entirely from the published catalogue: any city that
 * hosts at least one single-city trip gets a page listing every trip based
 * there. Nothing is authored per city, so a new destination appears the moment
 * its first trip is published.
 */

type Props = { params: { slug: string } };

export async function generateStaticParams() {
  const cities = await getCities();
  return cities.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const cities = await getCities();
  const city = cities.find((c) => c.slug === params.slug);
  if (!city) return {};
  return {
    title: `School trips to ${city.name}`,
    description: `${city.tripCount} curriculum-built ${city.tripCount === 1 ? 'itinerary' : 'itineraries'} based in ${city.name}, ${city.country} — designed, priced and supported from Dubai.`,
  };
}

export default async function CityPage({ params }: Props) {
  const [cities, allTrips, content, images] = await Promise.all([
    getCities(),
    getPublishedTrips(),
    getCityContent(params.slug),
    getCityImages(params.slug),
  ]);
  const city = cities.find((c) => c.slug === params.slug);
  if (!city) notFound();

  const trips = allTrips.filter((t) => isSingleCity(t.city) && citySlug(t.city) === city.slug);
  const others = cities.filter((c) => c.slug !== city.slug);
  const heroUrl = images.hero?.url ?? city.heroImage;
  const gallery: GalleryItem[] = images.gallery;

  return (
    <>
      <SiteHeader variant="trip" />

      <div className="thero thero--index">
        <div className="bg">
          {heroUrl && (
            <Image
              src={heroUrl}
              alt={images.hero?.alt ?? ''}
              fill
              priority
              quality={68}
              sizes="100vw"
              style={{ objectFit: 'cover' }}
            />
          )}
        </div>
        <div className="scrim"></div>
        <div className="wrap">
          <span className="eyebrow">City</span>
          <h1>{city.name}</h1>
          <div className="tmeta">
            <div>
              <b>Country</b>
              <Link href={`/countries/${city.countrySlug}`}>{city.country}</Link>
            </div>
            <div>
              <b>Itineraries</b>
              {city.tripCount} {city.tripCount === 1 ? 'itinerary' : 'itineraries'}
            </div>
            <div>
              <b>Subjects</b>
              {city.subjects.join(' · ')}
            </div>
            <div>
              <b>Departs</b>
              Dubai
            </div>
          </div>
        </div>
      </div>

      <main className="trip-main">
        {gallery.length > 0 && (
          <section className="tgallery-band">
            <div className="wrap">
              <TripGallery images={gallery} tripTitle={city.name} />
            </div>
          </section>
        )}

        {content && (
          <section className="cmaster">
            <div className="wrap">
              <div className="cmaster-lead">
                <div>
                  <span className="eyebrow">Why {city.name}</span>
                  {content.intro && <p className="cmaster-intro">{content.intro}</p>}
                  {content.educationNotes && <p className="ovp">{content.educationNotes}</p>}
                </div>
                {content.gettingAround && (
                  <aside className="cmaster-side">
                    <h3>Getting around</h3>
                    <dl>
                      <div>
                        <dt>{city.name} on foot and by transport</dt>
                        <dd>{content.gettingAround}</dd>
                      </div>
                    </dl>
                  </aside>
                )}
              </div>

              {content.curriculumLinks.length > 0 && (
                <div className="cmaster-block">
                  <h2 className="st serif">
                    Curriculum <i>links</i>
                  </h2>
                  <div className="cmaster-subjects">
                    {content.curriculumLinks.map((c) => (
                      <div key={c.subject}>
                        <h4>{c.subject}</h4>
                        <p>{c.note}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(content.climateSummary || content.seasons.length > 0) && (
                <div className="cmaster-block">
                  <h2 className="st serif">
                    When to <i>travel</i>
                  </h2>
                  {content.climateSummary && <p className="ovp">{content.climateSummary}</p>}
                  {content.seasons.length > 0 && (
                    <div className="cmaster-seasons">
                      {content.seasons.map((s) => (
                        <div key={s.season}>
                          <h4>{s.season}</h4>
                          <span>{s.months}</span>
                          <p>{s.note}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {content.usefulPhrases.length > 0 && (
                <div className="cmaster-block">
                  <h2 className="st serif">
                    A few <i>words</i>
                  </h2>
                  <div className="cmaster-phrases">
                    {content.usefulPhrases.map((p) => (
                      <div key={p.phrase}>
                        <strong>{p.phrase}</strong>
                        <span>{p.meaning}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        <section>
          <div className="wrap">
            <span className="eyebrow">Learning in {city.name}</span>
            <h2 className="st serif">
              Every {city.name} <i>trip</i>
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
              More <i>cities</i>
            </h2>
            <div className="olinks">
              {others.map((c) => (
                <Link href={`/cities/${c.slug}`} key={c.slug}>
                  {c.name}
                </Link>
              ))}
              <Link href={`/countries/${city.countrySlug}`}>← All of {city.country}</Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
