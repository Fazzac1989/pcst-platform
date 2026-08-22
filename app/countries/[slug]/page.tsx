import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import SiteHeader from '@/components/SiteHeaderWithData';
import { SiteFooterSimple } from '@/components/SiteFooter';
import {
  getCountries,
  getCountryContent,
  getCountryFacts,
  getCountryImages,
  getPublishedTrips,
} from '@/lib/data';
import { getDestinationNotes, plugSummary } from '@/lib/destination-notes';
import TripGallery, { type GalleryItem } from '@/app/trips/[slug]/TripGallery';

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
  const [countries, allTrips, content, images, countryFacts] = await Promise.all([
    getCountries(),
    getPublishedTrips(),
    getCountryContent(params.slug),
    getCountryImages(params.slug),
    getCountryFacts(params.slug),
  ]);
  const country = countries.find((c) => c.slug === params.slug);
  if (!country) notFound();

  // The at-a-glance panel, moved here from the trip pages. Mains electricity
  // comes from the hand-maintained destination notes rather than the database.
  const destNotes = getDestinationNotes(country.slug);
  const facts = (
    [
      ['Capital', countryFacts?.capital],
      ['Language', countryFacts?.languages],
      ['Currency', countryFacts?.currency],
      ['Time zone', countryFacts?.timezone],
      ['Population', countryFacts?.population],
      ['Average temp', countryFacts?.avgTempC === null || countryFacts?.avgTempC === undefined ? null : `${countryFacts.avgTempC}°C`],
      ['Best months', countryFacts?.bestTime],
      ['Plugs & voltage', destNotes ? plugSummary(destNotes) : null],
    ] as const
  )
    .filter(([, value]) => Boolean(value))
    .map(([label, value]) => ({ label, value: value as string }));

  const trips = allTrips.filter((t) => t.countrySlug === country.slug);
  const others = countries.filter((c) => c.slug !== country.slug);

  // The country's own hero, falling back to a trip's while pages are unbuilt.
  const ownHero = images.find((i) => i.role === 'hero') ?? null;
  const heroUrl = ownHero?.url ?? country.heroImage;
  const gallery: GalleryItem[] = images
    .filter((i) => i.role === 'gallery')
    .map((i) => ({
      url: i.url, alt: i.alt, caption: i.caption,
      photographer: i.photographer, licence: i.licence, sourceUrl: i.sourceUrl,
      focalX: i.focalX, focalY: i.focalY,
    }));

  return (
    <>
      <SiteHeader variant="trip" />

      <div className="thero thero--index">
        <div className="bg">
          {heroUrl && (
            <Image
              src={heroUrl}
              alt={ownHero?.alt ?? ''}
              fill
              priority
              quality={68}
              sizes="100vw"
              style={{
                objectFit: 'cover',
                objectPosition: ownHero ? `${ownHero.focalX * 100}% ${ownHero.focalY * 100}%` : 'center',
              }}
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
        {gallery.length > 0 && (
          <section className="tgallery-band">
            <div className="wrap">
              <TripGallery images={gallery} tripTitle={country.name} />
            </div>
          </section>
        )}

        {(content || facts.length > 0) && (
          <section className="cmaster">
            <div className="wrap">
              <div className="cmaster-lead">
                <div>
                  <span className="eyebrow">Why {country.name}</span>
                  {content?.intro && <p className="cmaster-intro">{content.intro}</p>}
                  {content?.educationNotes && <p className="ovp">{content.educationNotes}</p>}
                </div>
                {facts.length > 0 && (
                  <aside className="cfacts" aria-label={`${country.name} at a glance`}>
                    <h3>
                      {country.name} <span>at a glance</span>
                    </h3>
                    <dl>
                      {facts.map(({ label, value }) => (
                        <div key={label}>
                          <dt>{label}</dt>
                          <dd>{value}</dd>
                        </div>
                      ))}
                    </dl>
                  </aside>
                )}
              </div>

              {content && content.curriculumLinks.length > 0 && (
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

              {content && (content.climateSummary || content.seasons.length > 0) && (
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

              {content && content.usefulPhrases.length > 0 && (
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
