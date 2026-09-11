'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { Brochure } from '@/lib/brochure/schema';
import {
  groupInclusions,
  travelConflict,
  type CollectionTrip,
} from '@/lib/brochure/collection';
import { sizedImage } from '@/lib/brochure/image-size';
import BrochureHeader from './BrochureHeader';
import ItineraryAccordion from './ItineraryAccordion';
import { useShortlist } from './useShortlist';
import { IconArrowLeft, IconBookmark } from './icons';

type Props = {
  brochure: Brochure;
  trip: CollectionTrip;
  schoolName: string;
  /** Carries the teacher's filters back to the collection, unchanged. */
  backQuery: string;
  supportHref: string;
  contactHref: string;
  preparedFor: string | null;
};

const SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'outcomes', label: 'Learning outcomes' },
  { id: 'itinerary', label: 'Itinerary' },
  { id: 'included', label: "What's included" },
  { id: 'practical', label: 'Practical details' },
];

export default function TripDetail({
  brochure,
  trip,
  schoolName,
  backQuery,
  supportHref,
  contactHref,
  preparedFor,
}: Props) {
  const shortlist = useShortlist(brochure.slug);
  const saved = shortlist.has(trip.tripId);
  const [active, setActive] = useState('overview');

  const backHref = `/brochures/${encodeURIComponent(brochure.slug)}${backQuery ? `?${backQuery}` : ''}`;
  const groups = groupInclusions(trip.inclusions);
  const conflict = travelConflict(trip);

  // Light up the section the reader is in. Rootmargin pulls the trigger line
  // to just under the sticky bar rather than the top of the window.
  useEffect(() => {
    const els = SECTIONS.map((s) => document.getElementById(s.id)).filter(Boolean) as HTMLElement[];
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        const seen = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (seen[0]?.target.id) setActive(seen[0].target.id);
      },
      { rootMargin: '-64px 0px -60% 0px', threshold: 0 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [trip.tripId]);

  const hasOutcomes = trip.educationalValues.length > 0;
  const hasWhy = Boolean(trip.whyCountry || trip.pctView);

  return (
    <div className="sc">
      <BrochureHeader
        slug={brochure.slug}
        schoolName={schoolName}
        clientLogo={brochure.clientLogo}
        current="collection"
        supportHref={supportHref}
      />

      <main className="sc-main sc-detail sc-wrap">
        <Link href={backHref} className="sc-back">
          <IconArrowLeft size={17} />
          Your collection
        </Link>

        <div className="sc-detail-top">
          <div>
            {trip.subject && <p className="sc-eyebrow">{trip.subject}</p>}
            <h1>{trip.title}</h1>
            {trip.summary && <p className="sc-detail-sum">{trip.summary}</p>}

            <dl className="sc-keyfacts">
              {trip.place && (
                <div className="sc-keyfact">
                  <dt>Destination</dt>
                  <dd>{trip.place}</dd>
                </div>
              )}
              {trip.days > 0 && (
                <div className="sc-keyfact">
                  <dt>Duration</dt>
                  <dd>
                    {trip.days} days{trip.nights > 0 ? ` / ${trip.nights} nights` : ''}
                  </dd>
                </div>
              )}
              <div className="sc-keyfact">
                <dt>Suited to</dt>
                <dd className={trip.ageGroup ? undefined : 'sc-unknown'}>
                  {trip.ageGroup ?? 'Not specified'}
                </dd>
              </div>
            </dl>

            <div className="sc-detail-actions">
              <button
                type="button"
                className={`sc-btn ${saved ? 'sc-btn--on' : ''}`}
                aria-pressed={saved}
                onClick={() => shortlist.toggle(trip.tripId)}
              >
                <IconBookmark size={18} filled={saved} />
                {saved ? 'In your shortlist' : 'Add to shortlist'}
              </button>
              <a className="sc-btn sc-btn--ghost" href={contactHref}>
                Discuss this trip
              </a>
            </div>
          </div>

          <div className="sc-detail-figure">
            {trip.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={sizedImage(trip.image, 'cover') ?? trip.image} alt={`${trip.place || trip.title}`} />
            )}
          </div>
        </div>

        <nav className="sc-sectionnav" aria-label="On this page">
          <ul>
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} aria-current={active === s.id ? 'true' : undefined}>
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="sc-cols">
          <div className="sc-body">
            <section id="overview" aria-labelledby="h-overview">
              <h2 id="h-overview">Overview</h2>
              {trip.summary && <p className="sc-lead">{trip.summary}</p>}
              {trip.highlights.length > 0 && (
                <ul className="sc-outcomes" style={{ marginTop: 24 }}>
                  {trip.highlights.slice(0, 8).map((h, i) => (
                    <li key={i}>
                      <span className="n">{String(i + 1).padStart(2, '0')}</span>
                      <div>
                        <h3>{h.name}</h3>
                        {h.note && <p>{h.note}</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section id="outcomes" aria-labelledby="h-outcomes">
              <h2 id="h-outcomes">Learning outcomes</h2>
              {hasOutcomes ? (
                <ul className="sc-outcomes">
                  {trip.educationalValues.map((v, i) => (
                    <li key={i}>
                      <span className="n">{String(i + 1).padStart(2, '0')}</span>
                      <div>
                        <h3>{v.title}</h3>
                        {v.detail && <p>{v.detail}</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="sc-lead sc-unknown">
                  Learning outcomes have not been written for this trip yet.
                </p>
              )}

              {hasWhy && (
                <>
                  {trip.whyCountry && (
                    <>
                      <h3 style={{ marginTop: 32, fontSize: 21 }}>
                        Why {trip.country ?? 'this destination'}
                      </h3>
                      <p className="sc-lead">{trip.whyCountry}</p>
                    </>
                  )}
                  {trip.pctView && (
                    <div className="sc-quote">
                      <p className="sc-eyebrow">PCT view</p>
                      <p>{trip.pctView}</p>
                    </div>
                  )}
                </>
              )}
            </section>

            <section id="itinerary" aria-labelledby="h-itinerary">
              <h2 id="h-itinerary">Itinerary</h2>
              {trip.days_.length > 0 ? (
                <ItineraryAccordion days={trip.days_} />
              ) : (
                <p className="sc-lead sc-unknown">A day-by-day is not recorded for this trip.</p>
              )}
            </section>

            <section id="included" aria-labelledby="h-included">
              <h2 id="h-included">What&rsquo;s included</h2>
              {groups.length > 0 ? (
                <div className="sc-incl-groups">
                  {groups.map((g) => (
                    <div key={g.label}>
                      <h3>{g.label}</h3>
                      <ul>
                        {g.items.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="sc-lead sc-unknown">Inclusions are not recorded for this trip.</p>
              )}

              {trip.exclusions.length > 0 && (
                <div className="sc-incl-groups" style={{ marginTop: 28 }}>
                  <div className="sc-excl">
                    <h3>Items to budget for</h3>
                    <ul>
                      {trip.exclusions.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {trip.conditions.length > 0 && (
                <div className="sc-incl-groups" style={{ marginTop: 28 }}>
                  <div className="sc-excl">
                    <h3>Conditions</h3>
                    <ul>
                      {trip.conditions.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </section>

            <section id="practical" aria-labelledby="h-practical">
              <h2 id="h-practical">Practical details</h2>
              <dl className="sc-keyfacts" style={{ borderTop: 0, paddingTop: 0, marginTop: 20 }}>
                <div className="sc-keyfact">
                  <dt>Departing from</dt>
                  <dd className={trip.departs ? undefined : 'sc-unknown'}>
                    {trip.departs ?? 'Not specified'}
                  </dd>
                </div>
                <div className="sc-keyfact">
                  <dt>Travel arrangements</dt>
                  <dd className={conflict || !trip.gettingThere ? 'sc-unknown' : undefined}>
                    {conflict || !trip.gettingThere ? 'To be confirmed' : trip.gettingThere}
                  </dd>
                </div>
              </dl>

              {conflict && trip.gettingThere && (
                <div className="sc-flag">
                  <p>
                    <b>About {trip.country}, not this trip.</b> The travel note held against{' '}
                    {trip.country} describes a different arrival point from the one this trip
                    uses, so it is shown here rather than as this trip&rsquo;s arrangements:
                    &ldquo;{trip.gettingThere}&rdquo;
                  </p>
                </div>
              )}
            </section>
          </div>

          <aside className="sc-panel sc-panel-sticky" aria-labelledby="h-panel">
            <h2 id="h-panel">Shape this trip for your school</h2>
            <dl>
              <div>
                <dt>School</dt>
                <dd>{schoolName}</dd>
              </div>
              {preparedFor && (
                <div>
                  <dt>Prepared for</dt>
                  <dd>{preparedFor}</dd>
                </div>
              )}
              <div>
                <dt>Trip</dt>
                <dd>{trip.title}</dd>
              </div>
              <div>
                <dt>Dates</dt>
                <dd className="sc-unknown">Discuss your preferred dates</dd>
              </div>
              <div>
                <dt>Group size</dt>
                <dd className="sc-unknown">Discuss your group size</dd>
              </div>
            </dl>
            <a className="sc-btn" href={contactHref}>
              Discuss this trip
            </a>
            <button
              type="button"
              className={`sc-btn sc-btn--ghost ${saved ? 'sc-btn--on' : ''}`}
              aria-pressed={saved}
              onClick={() => shortlist.toggle(trip.tripId)}
            >
              <IconBookmark size={18} filled={saved} />
              {saved ? 'In your shortlist' : 'Add to shortlist'}
            </button>
          </aside>
        </div>
      </main>
    </div>
  );
}
