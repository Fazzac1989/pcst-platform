import Image from 'next/image';
import Link from 'next/link';
import AppointmentForm from '@/components/AppointmentForm';
import ScrollReveal from '@/components/ScrollReveal';
import SiteHeader from '@/components/SiteHeaderWithData';
import SubjectIcon from '@/components/SubjectIcon';
import { SiteFooterFull } from '@/components/SiteFooter';
import { getFeaturedTrips, getPublishedTripCount, getPublishedTrips, getSubjects } from '@/lib/data';

// Country display names as used on the reference featured cards.
const COUNTRY_SHORT: Record<string, string> = { 'United Kingdom': 'UK' };

/** The less predictable destinations and themes lead the spotlight band. */
const DISTINCTIVE_COUNTRIES = ['Mongolia', 'New Zealand', 'Australia', 'Nepal', 'Vietnam', 'Iceland', 'Japan', 'South Africa'];
const DISTINCTIVE_SUBJECTS = ['Volunteering', 'Outdoor Education', 'Skiing', 'STEAM'];

export default async function HomePage() {
  const [featured, allPublished, tripCount, subjects] = await Promise.all([
    getFeaturedTrips(),
    getPublishedTrips(),
    getPublishedTripCount(),
    getSubjects(),
  ]);

  // The spotlight shows trips marked featured in the admin, topped up with the
  // most distinctive journeys — one per country — so it never sits empty and
  // never reads as six city breaks.
  const spotlight = [...featured];
  if (spotlight.length < 6) {
    const score = (t: (typeof allPublished)[number]) =>
      (DISTINCTIVE_COUNTRIES.indexOf(t.country) >= 0 ? 10 - DISTINCTIVE_COUNTRIES.indexOf(t.country) : 0) +
      (DISTINCTIVE_SUBJECTS.includes(t.subject) ? 6 : 0);
    const seenCountries = new Set(spotlight.map((t) => t.country));
    for (const t of [...allPublished].sort((a, b) => score(b) - score(a))) {
      if (spotlight.length >= 6) break;
      if (spotlight.some((x) => x.slug === t.slug) || seenCountries.has(t.country)) continue;
      spotlight.push(t);
      seenCountries.add(t.country);
    }
  }

  return (
    <>
      <SiteHeader variant="home" />
      <ScrollReveal />

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
          <span className="eyebrow">Premium Choice School Trips</span>
          <h1>
            Educational journeys, <i>expertly delivered</i>
          </h1>
          <p className="lede">
            Educational journeys created with experience, care and a genuine understanding of what
            schools, students and parents need.
          </p>
          <div className="ctas">
            <a className="btn btn-brass" href="#trips">
              Browse trips <span className="arrow">→</span>
            </a>
            <a className="btn btn-ghost" href="#contact">
              Book an appointment
            </a>
          </div>
        </div>
      </div>

      <main className="site">
        {/* introduction */}
        <section className="manifesto">
          <div className="wrap">
            <span className="eyebrow">Premium Choice School Trips</span>
            <h2 className="section-title serif">
              The future of school travel <i>starts here</i>
            </h2>
            <div className="intro-copy">
              <p className="section-sub full">
                Led by Paul Farrell, a travel professional with more than 20 years of experience in
                the Middle East, Premium Choice School Trips combines extensive destination
                knowledge, trusted international partnerships and a highly personal approach to
                school travel.
              </p>
              <p className="section-sub full">
                We work closely with our customers to understand their objectives and create a
                journey that is engaging, rewarding and appropriate for all students.
              </p>
              <p className="section-sub full">
                From the first conversation through to the group&apos;s safe return, every detail is
                carefully considered and professionally managed. Our aim is to make the planning
                process straightforward for teachers while creating meaningful experiences that help
                students discover new places, encounter different cultures and develop confidence,
                independence and a broader understanding of the world beyond the classroom.
              </p>
            </div>
          </div>
        </section>

        {/* audiences — in PCT order, each card leading with its letter */}
        <section className="audiences">
          <div className="wrap">
            <span className="eyebrow">Who we work with</span>
            <h2 className="section-title serif pct-title">
              <span className="pct">P</span>arents reassured. <span className="pct">C</span>hildren
              inspired. <span className="pct">T</span>eachers supported.
            </h2>
            <p className="section-sub">Every journey, everyone cared for.</p>
            <div className="pct-brand">
              <Image
                src="/images/pct-logo.png"
                alt="PCT — Premium Choice Travel"
                width={269}
                height={70}
                style={{ width: 200, height: 'auto' }}
                unoptimized
              />
              <span>— It&apos;s in our name</span>
            </div>
            <div className="grid">
              <div className="aud-card">
                <div className="num">For parents</div>
                <h3>
                  <span className="pct">P</span>arents
                </h3>
                <p>
                  Vetted accommodation, comprehensive insurance, 24/7 in-destination support and
                  clear communication before and during every trip.
                </p>
                <a className="link" href="#safety">
                  How we keep them safe →
                </a>
              </div>
              <div className="aud-card">
                <div className="num">For children</div>
                <h3>
                  <span className="pct">C</span>hildren
                </h3>
                <p>
                  Real fieldwork in Iceland, debates in Berlin, ancient history in Petra —
                  experiences that turn coursework into memory.
                </p>
                <a className="link" href="#trips">
                  See where they could go →
                </a>
              </div>
              <div className="aud-card">
                <div className="num">For teachers</div>
                <h3>
                  <span className="pct">T</span>eachers
                </h3>
                <p>
                  Curriculum-mapped itineraries, transparent pricing, full risk assessments and a
                  dedicated coordinator from first enquiry to landing home.
                </p>
                <a className="link" href="#contact">
                  Book an appointment →
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* tailored journeys — one condensed story rather than two competing boxes */}
        <section className="manifesto manifesto--tailored">
          <div className="wrap">
            <span className="eyebrow">What makes us different</span>
            <h2 className="section-title serif">
              Designed around your school — <i>never off the shelf</i>
            </h2>
            <div className="intro-copy">
              <p className="section-sub full">
                We create purposeful school journeys that take learning beyond the classroom and
                introduce students to new places, cultures, ideas and experiences. We engage
                directly with teachers and trip leaders, listening carefully to what they want to
                achieve and working with them to design a journey that is exactly right for their
                school and students — not simply selected from a standard itinerary.
              </p>
              <p className="section-sub full">
                By moving beyond repetitive sightseeing, each journey becomes an opportunity for
                discovery, personal growth and shared experience. Whether students are exploring
                history where it happened, competing on an international sports tour or developing
                confidence through adventure, they return with greater independence, broader
                perspectives and memories that remain with them long after they leave school.
              </p>
              <p className="section-sub full">
                Our growing portfolio includes journeys all over the world, covering the widest
                range of curriculum areas, educational themes and student interests.
              </p>
            </div>
            <p className="serif closing">
              Whatever your school&apos;s objectives, we design a programme that
              <i> brings them to life.</i>
              <br />
              <span>
                In some of the world&apos;s most exciting destinations — creating experiences
                students will remember, share and talk about for years to come.
              </span>
            </p>
          </div>
        </section>

        {/* featured trips */}
        <section className="trips-band" id="trips">
          <div className="wrap">
            <div className="head">
              <div>
                <span className="eyebrow">Featured itineraries</span>
                <h2 className="section-title serif">
                  A spotlight on some of our most <i>distinctive journeys</i>
                </h2>
              </div>
              <Link className="btn btn-ink" href="/trips">
                View all trips <span className="arrow">→</span>
              </Link>
            </div>
            <div className="trip-grid">
              {spotlight.slice(0, 6).map((trip) => (
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

        {/* booking journey */}
        <section className="journey" id="journey">
          <div className="wrap">
            <span className="eyebrow">The Premium Choice approach</span>
            <h2 className="section-title serif">
              From the first conversation to <i>their safe return</i>
            </h2>
            <p className="section-sub">
              Our experienced and dedicated team supports your school throughout the entire
              journey, keeping teachers, trip leaders and families informed from the earliest
              planning stage until every student returns home.
            </p>

            <div className="jline">
              <div className="jstage">
                <div className="jnum">i.</div>
                <h3>Listen and understand</h3>
                <p>
                  We engage directly with teachers, trip leaders and school leaders to understand
                  what they want from the journey, including their objectives, preferred
                  destinations, budget, student needs and expectations.
                </p>
              </div>
              <div className="jstage">
                <div className="jnum">ii.</div>
                <h3>Design and propose</h3>
                <p>
                  We create a programme specifically around your trip objectives, with a carefully
                  planned itinerary, transparent per-student pricing and the information required
                  by school leadership teams and parents.
                </p>
              </div>
              <div className="jstage">
                <div className="jnum">iii.</div>
                <h3>Plan and prepare</h3>
                <p>
                  Once approved, we coordinate the travel arrangements, accommodation, activities,
                  insurance and visa requirements. We also provide the supporting documentation and
                  information needed to help teachers prepare students and communicate confidently
                  with parents.
                </p>
              </div>
              <div className="jstage">
                <div className="jnum">iv.</div>
                <h3>Travel and return</h3>
                <p>
                  Throughout the journey, your group is supported by experienced local partners and
                  has access to 24-hour assistance. We remain closely involved until the group
                  returns home safely — then visit the trip coordinators for their feedback and to
                  discuss future plans.
                </p>
              </div>
            </div>

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
              </div>
              <div className="appvisual">
                <Image
                  className="appshot"
                  src="/images/app-screenshot.png"
                  alt="The School Trips app home screen, showing a teacher's trip dashboard with student register, flights, accommodation, vouchers, broadcast and translate, above the London weather forecast"
                  width={1179}
                  height={2556}
                  sizes="(max-width: 900px) 60vw, 320px"
                />
              </div>
            </div>
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
            {/* Compact icon tiles, four across: the card is the invitation,
                the subject page is the detail. */}
            <div className="subject-tiles">
              {subjects.map((s) => (
                <Link className="subject-tile" href={`/subjects/${s.slug}`} key={s.slug}>
                  <span className="subject-tile-icon">
                    <SubjectIcon subject={s.name} />
                  </span>
                  <h3>{s.name}</h3>
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
                <span className="eyebrow">Health &amp; safety</span>
                <h2 className="section-title serif">
                  Safety isn&apos;t a page on our site.
                  <br />
                  It&apos;s <i>the itinerary itself.</i>
                </h2>
                <ul>
                  <li>
                    <span className="tick">✓</span>
                    <div>
                      <strong>Full risk assessments for every trip</strong>Written documentation
                      supplied to your school before departure, covering transport, accommodation
                      and every activity.
                    </div>
                  </li>
                  <li>
                    <span className="tick">✓</span>
                    <div>
                      <strong>Comprehensive travel insurance</strong>Every traveller covered —
                      medical, cancellation and curtailment — with clear policy documents for
                      parents.
                    </div>
                  </li>
                  <li>
                    <span className="tick">✓</span>
                    <div>
                      <strong>24/7 support while travelling</strong>A dedicated contact in Dubai
                      and on the ground in-destination, for the entire duration of the trip.
                    </div>
                  </li>
                  <li>
                    <span className="tick">✓</span>
                    <div>
                      <strong>Vetted partners worldwide</strong>Accommodation, coaches and guides
                      selected and reviewed to school-group standards in every country we
                      operate.
                    </div>
                  </li>
                </ul>
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

        {/* enquire */}
        <section className="enquire" id="contact">
          <div className="wrap">
            <div className="cols">
              <div>
                <span className="eyebrow">Get started</span>
                <h2 className="section-title serif">
                  From staff-room idea to <i>boarding pass</i>
                </h2>
                <div className="steps">
                  <div className="step">
                    <span className="sn">i.</span>
                    <div>
                      <h4>Book an appointment</h4>
                      <p>
                        Tell us your subject, dates and budget — by phone, email or a meeting at
                        your school. No commitment.
                      </p>
                    </div>
                  </div>
                  <div className="step">
                    <span className="sn">ii.</span>
                    <div>
                      <h4>Receive a tailored proposal</h4>
                      <p>
                        Itinerary, pricing per student, and everything your leadership team and
                        parents will ask about.
                      </p>
                    </div>
                  </div>
                  <div className="step">
                    <span className="sn">iii.</span>
                    <div>
                      <h4>We handle the rest</h4>
                      <p>
                        Bookings, documentation, risk assessments and on-trip support — while you
                        focus on teaching.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="panel">
                <h3>Book an appointment</h3>
                <p>Speak to our Dubai team — we&apos;ll come back to you within 24 hours.</p>
                <AppointmentForm />
                <div className="contact">
                  <div>
                    <strong>Call</strong> +971 4 420 6965
                  </div>
                  <div>
                    <strong>Email</strong> info@premiumchoicetravel.com
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
