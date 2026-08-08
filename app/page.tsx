import Image from 'next/image';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import { SiteFooterFull } from '@/components/SiteFooter';
import { getFeaturedTrips, getPublishedTripCount } from '@/lib/data';

// Country display names as used on the reference featured cards.
const COUNTRY_SHORT: Record<string, string> = { 'United Kingdom': 'UK' };

export default async function HomePage() {
  const [featured, tripCount] = await Promise.all([
    getFeaturedTrips(),
    getPublishedTripCount(),
  ]);

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
          <span className="eyebrow">Premium Choice School Trips</span>
          <h1>
            The future of school travel <i>starts here</i>
          </h1>
          <p className="lede">
            Founded by Paul Farrell of Premium Choice Travel, we bring decades of travel
            expertise, trusted relationships and destination knowledge into a new generation of
            school trips — safe, inspiring, professionally managed journeys that let students
            learn beyond the classroom.
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
        {/* audiences */}
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
                <div className="num">For schools</div>
                <h3>Teachers &amp; trip leaders</h3>
                <p>
                  Curriculum-mapped itineraries, transparent pricing, full risk assessments and a
                  dedicated coordinator from first enquiry to landing home.
                </p>
                <a className="link" href="#contact">
                  Book an appointment →
                </a>
              </div>
              <div className="aud-card">
                <div className="num">For parents</div>
                <h3>Families &amp; guardians</h3>
                <p>
                  Vetted accommodation, comprehensive insurance, 24/7 in-destination support and
                  clear communication before and during every trip.
                </p>
                <a className="link" href="#safety">
                  How we keep them safe →
                </a>
              </div>
              <div className="aud-card">
                <div className="num">For students</div>
                <h3>The travellers themselves</h3>
                <p>
                  Real fieldwork in Iceland, debates in Berlin, ancient history in Petra —
                  experiences that turn coursework into memory.
                </p>
                <a className="link" href="#trips">
                  See where you could go →
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* manifesto */}
        <section className="manifesto">
          <div className="wrap">
            <div className="mangrid">
              <div>
                <span className="eyebrow">More than a school trip</span>
                <h2 className="section-title serif">
                  Stories students remember <i>long after they leave school</i>
                </h2>
                <p className="section-sub full">
                  We design and deliver bespoke educational trips, curriculum-linked experiences,
                  cultural journeys, sports tours, adventure programmes and international school
                  travel — for schools looking for something more than a standard package.
                </p>
                <p className="section-sub full">
                  That means moving beyond generic itineraries and repetitive sightseeing. Every
                  trip is built with purpose, combining education, discovery, culture, adventure
                  and unforgettable experiences in a way that feels relevant to today&apos;s
                  students — whether they&apos;re exploring history where it happened, competing
                  on an international sports tour, or developing confidence through adventure.
                </p>
              </div>
              <div>
                <span className="eyebrow">What makes us different</span>
                <h2 className="section-title serif">
                  Designed around the school — <i>not taken from a shelf</i>
                </h2>
                <p className="section-sub full">
                  Traditional school travel can feel rigid: fixed programmes, limited
                  flexibility, the same itineraries year after year. We combine the experience
                  and buying power of an established travel company with the creativity,
                  flexibility and technology of a modern school travel specialist.
                </p>
                <p className="section-sub full">
                  We work closely with teachers and school leaders to understand learning
                  objectives, budget, destinations and student needs before creating a programme
                  specifically for them — and our network of trusted partners unlocks exclusive
                  access, specialist workshops and once-in-a-lifetime experiences, with safety,
                  communication and organisation at the heart of it all.
                </p>
              </div>
            </div>
            <p className="serif closing">
              Travel that educates. Experiences that <i>inspire.</i>
              <br />
              <span>
                This is not simply school travel. This is a new way for students to experience
                the world.
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
                  Trips our schools <i>keep rebooking</i>
                </h2>
              </div>
              <Link className="btn btn-ink" href="/trips">
                View all trips <span className="arrow">→</span>
              </Link>
            </div>
            <div className="trip-grid">
              {featured.map((trip) => (
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
            <span className="eyebrow">How it works</span>
            <h2 className="section-title serif">
              From first meeting to <i>touchdown home</i>
            </h2>
            <p className="section-sub">
              One dedicated team from the first conversation to the moment students return —
              with technology that keeps everyone informed at every step.
            </p>

            <div className="jline">
              <div className="jstage">
                <div className="jnum">i.</div>
                <h3>First meeting</h3>
                <p>
                  We sit down with your teachers and school leaders to understand learning
                  objectives, budget, destination preferences, student needs and ambitions —
                  before anything is designed.
                </p>
              </div>
              <div className="jstage">
                <div className="jnum">ii.</div>
                <h3>Design &amp; proposal</h3>
                <p>
                  A programme created specifically for your school — tailored itinerary,
                  transparent per-student pricing, and the documentation your leadership team and
                  parents will ask for.
                </p>
              </div>
              <div className="jstage">
                <div className="jnum">iii.</div>
                <h3>Planning &amp; preparation</h3>
                <p>
                  We handle bookings, flights, visas, full risk assessments and insurance — and
                  support parent information evenings so every family travels with confidence.
                </p>
              </div>
              <div className="jstage">
                <div className="jnum">iv.</div>
                <h3>Travel &amp; beyond</h3>
                <p>
                  Expert guides and 24/7 support in-destination, live communication home
                  throughout the trip, and a post-trip review to capture the learning and plan
                  what&apos;s next.
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
                  src="/images/app-screenshot.jpg"
                  alt="Premium Choice Trips app — home screen"
                  width={600}
                  height={720}
                />
              </div>
            </div>
          </div>
        </section>

        {/* destinations */}
        <section className="dest" id="destinations">
          <div className="wrap">
            <div className="head">
              <div>
                <span className="eyebrow">Destinations</span>
                <h2 className="section-title serif">
                  From the Gulf to <i>everywhere</i>
                </h2>
                <p className="section-sub">
                  Over 30 countries across Europe, Asia, Africa, the Americas and Oceania — all
                  within reach of your school calendar.
                </p>
              </div>
              <a className="btn btn-ink" href="#contact">
                View all destinations <span className="arrow">→</span>
              </a>
            </div>
            <div className="dest-grid">
              {[
                {
                  name: 'Japan',
                  meta: 'Art · STEAM · Culture',
                  img: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?q=80&w=900&auto=format&fit=crop',
                },
                {
                  name: 'USA',
                  meta: 'Geography · Business',
                  img: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?q=80&w=900&auto=format&fit=crop',
                },
                {
                  name: 'Switzerland',
                  meta: 'Skiing · Outdoor Ed',
                  img: 'https://images.unsplash.com/photo-1551524559-8af4e6624178?q=80&w=900&auto=format&fit=crop',
                },
                {
                  name: 'Iceland',
                  meta: 'Geography · Science',
                  img: 'https://images.unsplash.com/photo-1504893524553-b855bce32c67?q=80&w=900&auto=format&fit=crop',
                },
              ].map((d) => (
                <a className="dest-card" href="#" key={d.name}>
                  <Image
                    className="ph"
                    src={d.img}
                    alt=""
                    fill
                    sizes="(max-width: 1024px) 50vw, 25vw"
                    style={{ objectFit: 'cover' }}
                  />
                  <div className="fade"></div>
                  <div className="meta">
                    <h3>{d.name}</h3>
                    <span>{d.meta}</span>
                  </div>
                </a>
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
                  <div className="n">17</div>
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
                <p>Speak to our Dubai team — we&apos;ll come back to you within one working day.</p>
                <a
                  className="btn btn-brass"
                  href="mailto:info@premiumchoicetravel.com?subject=Appointment%20request%20—%20Premium%20Choice%20School%20Trips"
                >
                  Book an appointment <span className="arrow">→</span>
                </a>
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
