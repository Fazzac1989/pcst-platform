import Image from 'next/image';
import Link from 'next/link';
import AppointmentForm from '@/components/AppointmentForm';
import SiteHeader from '@/components/SiteHeaderWithData';
import { SiteFooterFull } from '@/components/SiteFooter';
import { getFeaturedTrips, getPublishedTripCount, getPublishedTrips, getSubjects } from '@/lib/data';
import { getSiteSettings } from '@/lib/settings';

// Country display names as used on the featured cards.
const COUNTRY_SHORT: Record<string, string> = { 'United Kingdom': 'UK' };

/** The less predictable destinations and themes lead the inspiration band. */
const DISTINCTIVE_COUNTRIES = ['Mongolia', 'New Zealand', 'Australia', 'Nepal', 'Vietnam', 'Iceland', 'Japan', 'South Africa'];
const DISTINCTIVE_SUBJECTS = ['Volunteering', 'Outdoor Education', 'Skiing', 'STEAM'];

export default async function HomePage() {
  const [featured, allPublished, tripCount, subjects, s] = await Promise.all([
    getFeaturedTrips(),
    getPublishedTrips(),
    getPublishedTripCount(),
    getSubjects(),
    getSiteSettings(),
  ]);

  // Journey inspiration: the trips marked featured in the admin, topped up with
  // the most distinctive journeys — one per country, unusual destinations first —
  // so the band never sits empty and never reads as six city breaks.
  const inspiration = [...featured];
  if (inspiration.length < 6) {
    const score = (t: (typeof allPublished)[number]) =>
      (DISTINCTIVE_COUNTRIES.indexOf(t.country) >= 0 ? 10 - DISTINCTIVE_COUNTRIES.indexOf(t.country) : 0) +
      (DISTINCTIVE_SUBJECTS.includes(t.subject) ? 6 : 0);
    const seenCountries = new Set(inspiration.map((t) => t.country));
    for (const t of [...allPublished].sort((a, b) => score(b) - score(a))) {
      if (inspiration.length >= 6) break;
      if (inspiration.some((x) => x.slug === t.slug) || seenCountries.has(t.country)) continue;
      inspiration.push(t);
      seenCountries.add(t.country);
    }
  }

  return (
    <>
      <SiteHeader variant="home" />

      {/* hero */}
      <div className="hero">
        <div className="bg">
          <Image
            src="/images/hero-home.jpg"
            alt=""
            fill
            priority
            quality={60}
            sizes="100vw"
            style={{ objectFit: 'cover' }}
          />
        </div>
        <div className="scrim"></div>
        <div className="wrap">
          <span className="eyebrow">{s.hero.eyebrow}</span>
          <h1>
            {s.hero.headline} <i>{s.hero.headlineAccent}</i>
          </h1>
          <p className="lede">{s.hero.lede}</p>
          <div className="ctas">
            <a className="btn btn-brass" href="#trips">
              {s.hero.ctaPrimary} <span className="arrow">→</span>
            </a>
            <a className="btn btn-ghost" href="#contact">
              {s.hero.ctaSecondary}
            </a>
          </div>
        </div>
      </div>

      <main className="site">
        {/* introduction */}
        <section className="manifesto">
          <div className="wrap">
            <span className="eyebrow">{s.intro.eyebrow}</span>
            <h2 className="section-title serif">
              {s.intro.headline} <i>{s.intro.headlineAccent}</i>
            </h2>
            <div className="intro-cols">
              {s.intro.paragraphs.map((p, i) => (
                <p className="section-sub full" key={i}>
                  {p}
                </p>
              ))}
            </div>
          </div>
        </section>

        {/* PCT — one journey, three perspectives */}
        <section className="audiences">
          <div className="wrap">
            <span className="eyebrow">Why we are called PCT</span>
            <h2 className="section-title serif">{s.pct.headline}</h2>
            <p className="section-sub">{s.pct.sub}</p>
            <div className="pct-brand">
              <Image
                src="/images/pct-logo.png"
                alt="PCT — Premium Choice Travel"
                width={269}
                height={70}
                style={{ width: 200, height: 'auto' }}
                unoptimized
              />
              <span>— it&apos;s in our name</span>
            </div>
            <div className="grid">
              <div className="aud-card">
                <div className="num">
                  <span className="pct">P</span> is for
                </div>
                <h3>Parents</h3>
                <p>{s.pct.parents}</p>
                <Link className="link" href="/safety">
                  How we keep them safe →
                </Link>
              </div>
              <div className="aud-card">
                <div className="num">
                  <span className="pct">C</span> is for
                </div>
                <h3>Children</h3>
                <p>{s.pct.children}</p>
                <a className="link" href="#trips">
                  See where they could go →
                </a>
              </div>
              <div className="aud-card">
                <div className="num">
                  <span className="pct">T</span> is for
                </div>
                <h3>Teachers</h3>
                <p>{s.pct.teachers}</p>
                <a className="link" href="#contact">
                  Arrange a consultation →
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* tailored journeys */}
        <section className="manifesto manifesto--tailored">
          <div className="wrap">
            <span className="eyebrow">Tailored journeys</span>
            <h2 className="section-title serif">
              {s.tailored.headline} <i>{s.tailored.headlineAccent}</i>
            </h2>
            <div className="intro-cols">
              {s.tailored.paragraphs.map((p, i) => (
                <p className="section-sub full" key={i}>
                  {p}
                </p>
              ))}
            </div>
            <p className="serif closing">
              <span>{s.tailored.closing}</span>
            </p>
          </div>
        </section>

        {/* journey inspiration */}
        <section className="trips-band" id="trips">
          <div className="wrap">
            <div className="head">
              <div>
                <span className="eyebrow">{s.inspiration.eyebrow}</span>
                <h2 className="section-title serif">
                  {s.inspiration.headline} <i>{s.inspiration.headlineAccent}</i>
                </h2>
              </div>
              <Link className="btn btn-ink" href="/trips">
                View all trips <span className="arrow">→</span>
              </Link>
            </div>
            <div className="trip-grid">
              {inspiration.slice(0, 6).map((trip) => (
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
                    <span className="tag">
                      {trip.subject} · {COUNTRY_SHORT[trip.country] ?? trip.country}
                    </span>
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

        {/* with you at every stage */}
        <section className="journey" id="journey">
          <div className="wrap">
            <span className="eyebrow">{s.stages.eyebrow}</span>
            <h2 className="section-title serif">
              {s.stages.headline} <i>{s.stages.headlineAccent}</i>
            </h2>
            <p className="section-sub">{s.stages.sub}</p>

            <div className="jline">
              {s.stages.steps.map((step, i) => (
                <div className="jstage" key={i}>
                  <div className="jnum">{String(i + 1).padStart(2, '0')}</div>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </div>
              ))}
            </div>

            {/* The app exists but is not being announced yet: the band stays in
                the codebase and returns the day the flag is switched on. */}
            {s.flags.appPromotion && (
              <div className="appband">
                <div className="appcopy">
                  <span className="eyebrow" style={{ color: 'var(--brass-light)' }}>
                    On-travel value adds
                  </span>
                  <h3 className="serif apphead">
                    The whole trip, in <i>everyone&apos;s pocket</i>
                  </h3>
                  <p>
                    Our mobile app connects students, teachers and parents to the journey — before,
                    during and after travel.
                  </p>
                  <div className="appfeatures">
                    <div>
                      <b>For teachers</b>Live itinerary, group documents, headcounts and instant
                      contact with our team.
                    </div>
                    <div>
                      <b>For parents</b>Real-time trip updates and photo moments, so home always
                      knows all is well.
                    </div>
                    <div>
                      <b>For students</b>Daily schedule, learning resources, and everything they
                      need without paper handouts.
                    </div>
                  </div>
                  <div className="storebtns">
                    <a className="storebtn" href="#">
                      &#63743; App Store
                    </a>
                    <a className="storebtn" href="#">
                      &#9654; Google Play
                    </a>
                  </div>
                </div>
                <div className="appvisual">
                  <Image
                    className="appshot"
                    src="/images/app-screenshot.png"
                    alt="The School Trips app home screen, showing a teacher's trip dashboard"
                    width={1179}
                    height={2556}
                    sizes="(max-width: 900px) 60vw, 320px"
                  />
                </div>
              </div>
            )}
          </div>
        </section>

        {/* subjects */}
        <section className="dest" id="subjects">
          <div className="wrap">
            <div className="head">
              <div>
                <span className="eyebrow">Subjects</span>
                <h2 className="section-title serif">
                  Your curriculum, <i>out in the world</i>
                </h2>
                <p className="section-sub">
                  Every itinerary is built around a subject — tectonics in Iceland, democracy in
                  Berlin, trade in Singapore. Pick yours and see where it takes your students.
                </p>
              </div>
              <Link className="btn btn-ink" href="/trips">
                View all trips <span className="arrow">→</span>
              </Link>
            </div>
            <div className="dest-grid">
              {subjects.map((sub) => (
                <Link className="dest-card" href={`/subjects/${sub.slug}`} key={sub.slug}>
                  {sub.heroImage && (
                    <Image
                      className="ph"
                      src={sub.heroImage}
                      alt=""
                      fill
                      sizes="(max-width: 1024px) 50vw, 25vw"
                      style={{ objectFit: 'cover' }}
                    />
                  )}
                  <div className="fade"></div>
                  <div className="meta">
                    <h3>{sub.name}</h3>
                    <span>{sub.countries.join(' · ')}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* trust / safety */}
        <section className="trust" id="safety">
          <div className="wrap">
            <div className="cols">
              <div>
                <span className="eyebrow">Health, Safety &amp; Security</span>
                <h2 className="section-title serif">
                  Safety isn&apos;t a page on our site.
                  <br />
                  It&apos;s <i>the itinerary itself.</i>
                </h2>
                <ul>
                  <li>
                    <span className="tick">✓</span>
                    <div>
                      <strong>Risk assessment and careful planning</strong>Every journey assessed
                      across transport, accommodation, activities and destination-specific risks,
                      with documentation for your school.
                    </div>
                  </li>
                  <li>
                    <span className="tick">✓</span>
                    <div>
                      <strong>Insurance and assistance</strong>Travel insurance with clear policy
                      documentation, and straightforward procedures for obtaining support.
                    </div>
                  </li>
                  <li>
                    <span className="tick">✓</span>
                    <div>
                      <strong>24-hour support while travelling</strong>Our Dubai team and
                      experienced local partners, for the entire duration of the journey.
                    </div>
                  </li>
                  <li>
                    <span className="tick">✓</span>
                    <div>
                      <strong>Trusted partners worldwide</strong>Accommodation, transport, guides
                      and activity providers selected and reviewed to school-group standards.
                    </div>
                  </li>
                </ul>
                <Link className="btn btn-ink" href="/safety" style={{ marginTop: 26 }}>
                  How we look after every student <span className="arrow">→</span>
                </Link>
              </div>
              <div className="stats">
                <div className="stat">
                  <div className="n">
                    30<i>+</i>
                  </div>
                  <div className="l">Countries on our itineraries</div>
                </div>
                <div className="stat">
                  <div className="n">{tripCount}</div>
                  <div className="l">Ready-to-run trip itineraries</div>
                </div>
                <div className="stat">
                  <div className="n">{subjects.length}</div>
                  <div className="l">Curriculum subject areas</div>
                </div>
                <div className="stat">
                  <div className="n">
                    24<i>/7</i>
                  </div>
                  <div className="l">In-trip support, every trip</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* start planning */}
        <section className="enquire" id="contact">
          <div className="wrap">
            <div className="cols">
              <div>
                <span className="eyebrow">Start planning your journey</span>
                <h2 className="section-title serif">
                  {s.planning.headline} <i>{s.planning.headlineAccent}</i>
                </h2>
                <div className="steps">
                  {s.planning.steps.map((step, i) => (
                    <div className="step" key={i}>
                      <span className="sn">{['i.', 'ii.', 'iii.'][i] ?? `${i + 1}.`}</span>
                      <div>
                        <h4>{step.title}</h4>
                        <p>{step.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="panel">
                <h3>{s.planning.panelTitle}</h3>
                <p>{s.planning.panelSub}</p>
                <AppointmentForm />
                <div className="contact">
                  <div>
                    <strong>Call</strong> {s.contact.phone}
                  </div>
                  <div>
                    <strong>Email</strong> {s.contact.email}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooterFull />
    </>
  );
}
