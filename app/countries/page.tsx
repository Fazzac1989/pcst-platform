import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeaderWithData';
import SiteFooter from '@/components/SiteFooterWithData';
import { getCountries, getCountryHeroes } from '@/lib/data';
import { CONTINENT_ORDER, metaFor } from '@/lib/country-meta';

export const metadata: Metadata = {
  alternates: { canonical: '/countries' },
  title: 'Destinations',
  description:
    'Every country Premium Choice School Trips travels to, by continent — curriculum-built itineraries designed, priced and supported from Dubai.',
};

/**
 * The destinations index: every country with a published trip, grouped by
 * continent the way the header menu groups them, each with its flag. A
 * country appears here, in the menu and in the footer at the same moment —
 * when its first trip is published — because all three read the same list.
 */
export default async function DestinationsPage() {
  const [countries, heroes] = await Promise.all([getCountries(), getCountryHeroes()]);

  const withMeta = countries.map((c) => ({ ...c, meta: metaFor(c.slug, c.name) }));
  const groups = [...CONTINENT_ORDER, 'More destinations']
    .map((continent) => ({
      continent,
      items: withMeta.filter((c) =>
        continent === 'More destinations' ? !c.meta : c.meta?.continent === continent
      ),
    }))
    .filter((g) => g.items.length > 0);

  const tripTotal = countries.reduce((n, c) => n + c.tripCount, 0);

  return (
    <>
      <SiteHeader variant="trip" />

      <div className="thero thero--index">
        <div className="bg">
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
          <span className="eyebrow">Destinations</span>
          <h1>
            Where we <i>travel</i>
          </h1>
          <div className="tmeta">
            <div>
              <b>Countries</b>
              {countries.length} destinations
            </div>
            <div>
              <b>Continents</b>
              {groups.filter((g) => g.continent !== 'More destinations').length}
            </div>
            <div>
              <b>Itineraries</b>
              {tripTotal} trips
            </div>
            <div>
              <b>Departs</b>
              Dubai
            </div>
          </div>
        </div>
      </div>

      <main className="trip-main">
        {groups.map((g) => (
          <section className="dest dest-group" key={g.continent}>
            <div className="wrap">
              <div className="head">
                <h2 className="st serif">{g.continent}</h2>
                <span className="dest-count">
                  {g.items.length} {g.items.length === 1 ? 'country' : 'countries'}
                </span>
              </div>
              <div className="dest-grid">
                {g.items.map((c) => {
                  const hero = heroes.get(c.slug)?.url ?? c.heroImage;
                  return (
                    <Link className="dest-card" href={`/countries/${c.slug}`} key={c.slug}>
                      {hero && (
                        <Image
                          className="ph"
                          src={hero}
                          alt=""
                          fill
                          sizes="(max-width: 720px) 100vw, (max-width: 1024px) 50vw, 25vw"
                          style={{ objectFit: 'cover' }}
                        />
                      )}
                      <div className="fade"></div>
                      <div className="meta">
                        {c.meta && (
                          <span className="flags" aria-hidden="true">
                            {c.meta.flags.map((code) => (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                key={code}
                                src={`https://flagcdn.com/w80/${code}.png`}
                                alt=""
                                width={30}
                                height={22}
                                loading="lazy"
                              />
                            ))}
                          </span>
                        )}
                        <h3>{c.name}</h3>
                        <span>
                          {c.tripCount} {c.tripCount === 1 ? 'itinerary' : 'itineraries'}
                          {c.subjects.length > 0 && ` · ${c.subjects.slice(0, 3).join(', ')}`}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>
        ))}

        <section className="dest-close">
          <div className="wrap">
            <p>
              Somewhere else in mind? We design school trips to any destination.{' '}
              <a href="/#contact">Tell us where →</a>
            </p>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
