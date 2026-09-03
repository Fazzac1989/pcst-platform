'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Brochure, PageContent } from '@/lib/brochure/schema';
import { hasWhyPage, TripGroup, TripSpread } from '@/lib/brochure/spreads';
import { sizedImage } from '@/lib/brochure/image-size';
import { introSummary } from '@/lib/brochure/spreads';
import type { EditorialSlide } from '@/lib/brochure/editorial';
import { EditorialBody } from '@/components/slides/Editorial';
import '@/components/slides/editorial.css';
import { STANDARD_COPY } from '@/lib/brochure/standard-copy';
import '@/components/slides/deck.css';
import '@/components/brochure/slides.css';

/**
 * The brochure, one page at a time.
 *
 * Every slide is rendered; only the current one is shown. That is what makes
 * the print stylesheet able to lay the whole deck out as A4 pages without a
 * second component tree to keep in step — the PDF is this document, not a copy
 * of it.
 */

type Props = {
  brochure: Brochure;
  cover: PageContent;
  spreads: TripSpread[];
  groups: TripGroup[];
  editorial: EditorialSlide[];
  closing: PageContent | undefined;
  brochureQrSvg: string | null;
  pdfHref: string;
  /** The day-by-day page after each trip. On unless the brochure turned it off. */
  showItinerary?: boolean;
};

export default function BrochureSlides({
  brochure,
  cover,
  spreads,
  groups,
  editorial,
  closing,
  brochureQrSvg,
  pdfHref,
  showItinerary = true,
}: Props) {
  const [index, setIndex] = useState(0);
  const [turning, setTurning] = useState<'forward' | 'back' | null>(null);
  const previous = useRef(0);
  const liveRef = useRef<HTMLParagraphElement | null>(null);

  // cover + contents + (introduction, then itinerary) per trip + the pages
  // about us + closing. The trips come first: they are what the reader opened
  // the brochure for, and the standard pages read as an appendix.
  const hasContents = spreads.length > 0;
  // The school's mark: on the cover as a card, and at the foot of every other page.
  // Uploading a logo is the decision to show it; no separate switch to forget.
  const clientLogo = brochure.clientLogo;
  const hasClosing = Boolean(closing || brochure.closingText);
  // A trip contributes an itinerary slide only when it has days and the
  // brochure asked for them.
  // Introduction, the day-by-day when asked for, and "Why <country>" when written.
  const slidesPerTrip = spreads.map(
    (s) => 1 + (showItinerary && (s.trip?.days ?? []).length > 0 ? 1 : 0) + (hasWhyPage(s.content) ? 1 : 0),
  );
  const tripSlideTotal = slidesPerTrip.reduce((a, b) => a + b, 0);
  const total =
    1 + (hasContents ? 1 : 0) + tripSlideTotal + editorial.length + (hasClosing ? 1 : 0);
  const firstTripIndex = hasContents ? 2 : 1;

  const go = useCallback(
    (next: number) => {
      const i = Math.max(0, Math.min(total - 1, next));
      if (i === index) return;
      previous.current = index;
      setTurning(i > index ? 'forward' : 'back');
      setIndex(i);
    },
    [index, total],
  );

  // The turn is decoration; the page is switched immediately either way.
  useEffect(() => {
    if (!turning) return;
    const t = setTimeout(() => setTurning(null), 440);
    return () => clearTimeout(t);
  }, [turning, index]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); go(index + 1); }
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); go(index - 1); }
      else if (e.key === 'Home') { e.preventDefault(); go(0); }
      else if (e.key === 'End') { e.preventDefault(); go(total - 1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, index, total]);

  /**
   * Our own PDF, not the browser's print dialogue.
   *
   * Ctrl+P produces whatever the reader's settings say: its own header and
   * footer, its own margins, and "Background graphics" off by default. The
   * route renders the same document the same way every time.
   */
  const download = () => {
    window.location.href = pdfHref;
  };

  /** Where a trip's introduction sits, so the contents can jump straight to it. */
  const slideOf = (tripId: number) => {
    const n = spreads.findIndex((s) => s.tripId === tripId);
    if (n < 0) return firstTripIndex;
    return firstTripIndex + slidesPerTrip.slice(0, n).reduce((a, b) => a + b, 0);
  };

  const pageClass = (i: number) => {
    if (i === index && turning) return turning === 'forward' ? 'sl-page sl-entering' : 'sl-page';
    if (i === previous.current && turning) return turning === 'forward' ? 'sl-page sl-leaving' : 'sl-page sl-leaving';
    return 'sl-page';
  };

  // While turning, the outgoing page has to stay on screen to be seen leaving.
  const visible = (i: number) => i === index || (turning !== null && i === previous.current);

  const slides: React.ReactNode[] = [];

  slides.push(
    <article
      key="cover"
      className={`${pageClass(slides.length)} sl-cover${brochure.design.coverTheme === 'light' ? ' sl-cover--light' : ''}`}
      hidden={!visible(0)}
    >
      <div className="sl-body">
        <p className="sl-eyebrow">{cover.eyebrow ?? 'Premium Choice School Trips'}</p>
        <h1>{brochure.title}</h1>
        {brochure.subtitle && <p className="sl-sub">{brochure.subtitle}</p>}
        {clientLogo && (
          <div className="sl-school-logo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={clientLogo} alt={brochure.clientName ? `${brochure.clientName} logo` : 'School logo'} />
          </div>
        )}
        {brochure.clientName && <p className="sl-prepared">Prepared for {brochure.clientName}</p>}
      </div>
      <div className="sl-mark">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={brochure.design.coverTheme === 'light' ? '/images/logo-navy.png' : '/images/logo-white.png'}
          alt="Premium Choice School Trips"
        />
        {brochure.publishedAt && (
          <span className="sl-edition">{new Date(brochure.publishedAt).getFullYear()} edition</span>
        )}
      </div>
    </article>,
  );

  if (hasContents) {
    const i = slides.length;
    slides.push(
      <article key="contents" className={pageClass(i)} hidden={!visible(i)}>
        <div className="sl-body">
          <div className="sl-masthead">
            <p className="sl-eyebrow">What is inside</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/logo-navy.png" alt="Premium Choice School Trips" />
          </div>
          <h2>The trips in this collection</h2>

          <div className="sl-toc-cols">
            {groups.map((g) => (
              <section className="sl-group" key={g.label || 'all'}>
                {g.label && <p className="sl-group-label">{g.label}</p>}
                <ul className="sl-toc">
                  {g.spreads.map((s) => {
                    const target = slideOf(s.tripId);
                    return (
                      <li key={s.tripId}>
                        <button type="button" onClick={() => go(target)}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            className="sl-thumb"
                            src={
                              sizedImage(s.trip?.heroImage ?? s.images[0] ?? null, 'micro') ??
                              undefined
                            }
                            alt=""
                          />
                          <span className="sl-t">
                            {s.trip?.title ?? s.content.headline ?? 'Trip'}
                          </span>
                          <span className="sl-m">
                            {[s.trip?.subject, s.trip?.durationDays ? `${s.trip.durationDays} days` : null]
                              .filter(Boolean)
                              .join(' · ')}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        </div>
      </article>,
    );
  }

  for (const s of spreads) {
    const i = slides.length;
    slides.push(
      <article key={`trip-${s.tripId}`} className={pageClass(i)} hidden={!visible(i)}>
        <div className="sl-body">
          <TripIntro spread={s} />
        </div>
      </article>,
    );

    const days = s.trip?.days ?? [];
    if (showItinerary && days.length > 0) {
      const j = slides.length;
      slides.push(
        <article key={`days-${s.tripId}`} className={pageClass(j)} hidden={!visible(j)}>
          <div className="sl-body">
            <div className="sl-masthead">
              <p className="sl-eyebrow">
                {s.trip?.title ?? s.content.headline ?? 'Trip'} · Day by day
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/logo-navy.png" alt="Premium Choice School Trips" />
            </div>
            <div className={`sl-days${days.length > 8 ? ' sl-days-dense' : ''}`}>
              {days.map((d) => (
                <div className="sl-day" key={d.dayNumber}>
                  <p className="sl-day-n">{d.label || `Day ${d.dayNumber}`}</p>
                  <h4>{d.title}</h4>
                  {d.summary && <p>{d.summary}</p>}
                  {d.location && <span className="sl-where">{d.location}</span>}
                </div>
              ))}
            </div>
            <Inclusions
              included={s.content.inclusions?.length ? s.content.inclusions : (s.trip?.includes ?? [])}
              excluded={s.content.exclusions ?? []}
            />
          </div>
        </article>,
      );
    }

    if (hasWhyPage(s.content)) {
      const k = slides.length;
      slides.push(
        <article key={`why-${s.tripId}`} className={pageClass(k)} hidden={!visible(k)}>
          <div className="sl-body">
            <TripWhy spread={s} />
          </div>
        </article>,
      );
    }
  }

  editorial.forEach((e, n) => {
    const i = slides.length;
    slides.push(
      <article key={`ed-${n}`} className={pageClass(i)} hidden={!visible(i)}>
        <EditorialBody slide={e} />
      </article>,
    );
  });

  if (hasClosing) {
    const i = slides.length;
    slides.push(
      <article key="closing" className={`${pageClass(i)} sl-closing`} hidden={!visible(i)}>
        <div className="sl-body">
          <p className="sl-eyebrow">{closing?.eyebrow ?? 'Next steps'}</p>
          <h2>{closing?.headline ?? 'Talk to us about any of these'}</h2>
          {brochure.closingText && <p className="sl-lede">{brochure.closingText}</p>}
          {(closing?.body ?? []).map((para, n) => (
            <p className="sl-lede" key={n}>
              {para}
            </p>
          ))}
          <div className="sl-contact">
            <a href="tel:+97144206965">+971 4 420 6965</a>
            <a href="mailto:info@premiumchoicetravel.com">info@premiumchoicetravel.com</a>
            {brochureQrSvg && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img className="sl-qr" src={brochureQrSvg} alt="" width={68} height={68} />
            )}
          </div>
        </div>
      </article>,
    );
  }

  return (
    <div
      className={`sl-deck${clientLogo ? ' sl-deck--client' : ''}`}
      style={clientLogo ? ({ '--client-logo': `url("${clientLogo}")` } as React.CSSProperties) : undefined}
    >
      <div className="sl-bar">
        <button type="button" onClick={() => go(index - 1)} disabled={index === 0}>
          ← Back
        </button>
        <span className="sl-count" aria-hidden="true">
          {index + 1} / {total}
        </span>
        <span style={{ display: 'flex', gap: 10 }}>
          <button type="button" onClick={download}>
            Download as PDF
          </button>
          <button type="button" onClick={() => go(index + 1)} disabled={index === total - 1}>
            Next →
          </button>
        </span>
      </div>

      <div className="sl-stage">{slides}</div>

      {/* Screen readers are told where they are; the count above is decorative. */}
      <p ref={liveRef} aria-live="polite" className="sr-only" style={SR_ONLY}>
        Page {index + 1} of {total}
      </p>
    </div>
  );
}

const SR_ONLY: React.CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
};

/**
 * A trip's introduction: what it is, and what it looks like.
 *
 * The pictures earn half the slide here because this is the page that has to
 * make someone want the trip; the itinerary that follows is where the detail
 * lives.
 */
function TripIntro({ spread }: { spread: TripSpread }) {
  const { trip, content: c } = spread;
  const title = trip?.title ?? c.headline ?? 'Trip';
  const hero = trip?.heroImage ?? spread.images[0] ?? null;
  // Two more beneath the hero, and never the hero again.
  const rest = spread.images.filter((u) => u !== hero).slice(0, 2);
  const highlights = (c.highlights ?? []).length
    ? (c.highlights ?? [])
    : (trip?.highlights ?? []).map((h) => ({ name: h.name, note: h.note, conditional: '' }));

  return (
    <>
      <div className="sl-masthead">
        <p className="sl-eyebrow">{c.eyebrow ?? trip?.subject ?? 'Trip'}</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/logo-navy.png" alt="Premium Choice School Trips" />
      </div>

      <div className="sl-intro">
        <div>
          <h2>{title}</h2>
          <p className="sl-meta">
            {trip?.country && (
              <span>
                <b>{trip.country}</b>
              </span>
            )}
            {trip?.city && <span>{trip.city}</span>}
            {trip?.durationDays ? (
              <span>
                {trip.durationDays} days / {trip.durationNights} nights
              </span>
            ) : null}
          </p>

          {/* Composed copy first; the trip's own overview when there is none.
              A brochure that has not been through the studio was showing a
              trip with no introduction at all. */}
          {c.proposition && <p className="sl-lede">{c.proposition}</p>}
          {c.intro ? (
            <p className="sl-lede">{c.intro}</p>
          ) : (
            <p className="sl-lede">{introSummary(trip?.overview ?? [])}</p>
          )}

          {/* Three, measured: a fourth overflows the slide at any size worth
              reading. An introduction is a summary — the day-by-day page that
              follows carries the trip in full. */}
          {highlights.length > 0 && (
            <ul className="sl-hl">
              {highlights.slice(0, 3).map((h, i) => (
                <li key={i}>
                  <strong>{h.name}</strong>
                  {h.note && <span>{h.note}</span>}
                  {/* Kept, not tidied away: "subject to availability" is the
                      difference between a promise and an intention. */}
                  {h.conditional && <em>{h.conditional}</em>}
                </li>
              ))}
            </ul>
          )}

        </div>

        <div className="sl-shots">
          {hero && (
            <figure>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={sizedImage(hero, 'hero') ?? hero} alt={title} loading="lazy" />
            </figure>
          )}
          {rest.map((url, i) => (
            <figure key={i}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={sizedImage(url, 'thumb') ?? url} alt="" loading="lazy" />
            </figure>
          ))}

          {/* Getting there sits with the pictures: the left column already
              carries the introduction and the highlights. */}
          {trip?.gettingThere && (
            <div className="sl-flight">
              <p className="sl-flight-route">
                <span>{trip.departs ?? 'Dubai'}</span>
                <span className="sl-flight-line" aria-hidden="true" />
                <span>{trip.capital ?? trip.country}</span>
              </p>
              <p>{trip.gettingThere}</p>
              {trip.timezone && <p className="sl-flight-tz">Local time: {trip.timezone}</p>}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/** The page that closes a trip: why the country, our view, who it suits, what it costs, what it teaches. */
function TripWhy({ spread }: { spread: TripSpread }) {
  const { trip, content: c } = spread;
  const country = trip?.country ?? c.headline ?? 'this destination';
  const values = (c.educationalValues ?? []).slice(0, 5);
  return (
    <>
      <div className="sl-masthead">
        <p className="sl-eyebrow">
          {trip?.title ?? c.headline ?? 'Trip'} · Why {country}
        </p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/logo-navy.png" alt="Premium Choice School Trips" />
      </div>

      <div className="sl-why">
        <div>
          <h2>Why {country}</h2>
          {c.whyCountry && <p className="sl-lede">{c.whyCountry}</p>}
          {c.pctView && (
            <div className="sl-why-view">
              <p className="sl-why-label">Our view</p>
              <p>{c.pctView}</p>
            </div>
          )}
        </div>
        <div className="sl-why-side">
          {c.ageGroup && (
            <div className="sl-why-fact">
              <span>Suited to</span>
              <b>{c.ageGroup}</b>
            </div>
          )}
          {((c.priceBands ?? []).length > 0 || c.priceRange) && (
            <div className="sl-why-fact">
              <span>Price</span>
              {(c.priceBands ?? []).length > 0 && (
                <dl className="sl-why-bands">
                  {(c.priceBands ?? []).map((band, i) => (
                    <div key={i}>
                      <dt>{band.dates}</dt>
                      <dd>{band.price}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {c.priceRange && <small>{c.priceRange}</small>}
            </div>
          )}
        </div>
      </div>

      {values.length > 0 && (
        <div className="sl-why-values">
          <p className="sl-why-label">Educational value</p>
          <ol>
            {values.map((v, i) => (
              <li key={i}>
                <b>{v.title}</b>
                <span>{v.detail}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </>
  );
}

/**
 * What the price covers and what it does not, beneath the days. One line of
 * type each, run together, so a nine-day trip still fits its page.
 */
function Inclusions({ included, excluded }: { included: string[]; excluded: string[] }) {
  if (!included.length && !excluded.length) return null;
  const line = (items: string[]) => items.map((i) => i.trim().replace(/\.$/, '')).filter(Boolean).join(' · ');
  return (
    <div className="sl-incl">
      {included.length > 0 && (
        <p>
          <b>Included</b>
          {line(included)}
        </p>
      )}
      {excluded.length > 0 && (
        <p>
          <b>Not included</b>
          {line(excluded)}
        </p>
      )}
    </div>
  );
}
