'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Brochure, PageContent } from '@/lib/brochure/schema';
import type { TripGroup, TripSpread } from '@/lib/brochure/spreads';
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
}: Props) {
  const [index, setIndex] = useState(0);
  const [turning, setTurning] = useState<'forward' | 'back' | null>(null);
  const previous = useRef(0);
  const liveRef = useRef<HTMLParagraphElement | null>(null);

  // cover + contents + (introduction, then itinerary) per trip + closing
  const hasContents = spreads.length > 0;
  const hasClosing = Boolean(closing || brochure.closingText);
  // A trip contributes an itinerary slide only when it actually has days.
  const slidesPerTrip = spreads.map((s) => ((s.trip?.days ?? []).length > 0 ? 2 : 1));
  const tripSlideTotal = slidesPerTrip.reduce((a, b) => a + b, 0);
  const total =
    1 + (hasContents ? 1 : 0) + editorial.length + tripSlideTotal + (hasClosing ? 1 : 0);
  const firstTripIndex = (hasContents ? 2 : 1) + editorial.length;

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

  const print = () => {
    try {
      if (window.self !== window.top) throw new Error('framed');
      window.print();
    } catch {
      window.location.href = pdfHref;
    }
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
    <article key="cover" className={`${pageClass(slides.length)} sl-cover`} hidden={!visible(0)}>
      <div className="sl-body">
        <p className="sl-eyebrow">{cover.eyebrow ?? 'Premium Choice School Trips'}</p>
        <h1>{brochure.title}</h1>
        {brochure.subtitle && <p className="sl-sub">{brochure.subtitle}</p>}
        {brochure.clientName && <p className="sl-prepared">Prepared for {brochure.clientName}</p>}
      </div>
      <div className="sl-mark">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/logo-white.png" alt="Premium Choice School Trips" />
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

  editorial.forEach((e, n) => {
    const i = slides.length;
    slides.push(
      <article key={`ed-${n}`} className={pageClass(i)} hidden={!visible(i)}>
        <EditorialBody slide={e} />
      </article>,
    );
  });

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
    if (days.length > 0) {
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
          </div>
        </article>,
      );
    }
  }

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
    <div className="sl-deck">
      <div className="sl-bar">
        <button type="button" onClick={() => go(index - 1)} disabled={index === 0}>
          ← Back
        </button>
        <span className="sl-count" aria-hidden="true">
          {index + 1} / {total}
        </span>
        <span style={{ display: 'flex', gap: 10 }}>
          <button type="button" onClick={print}>
            Print / save as PDF
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
