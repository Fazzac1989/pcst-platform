'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Brochure, PageContent } from '@/lib/brochure/schema';
import type { TripGroup, TripSpread } from '@/lib/brochure/spreads';
import { sizedImage } from '@/lib/brochure/image-size';
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
  closing: PageContent | undefined;
  brochureQrSvg: string | null;
  pdfHref: string;
};

export default function BrochureSlides({
  brochure,
  cover,
  spreads,
  groups,
  closing,
  brochureQrSvg,
  pdfHref,
}: Props) {
  const [index, setIndex] = useState(0);
  const [turning, setTurning] = useState<'forward' | 'back' | null>(null);
  const previous = useRef(0);
  const liveRef = useRef<HTMLParagraphElement | null>(null);

  // cover + contents + one per trip + closing
  const hasContents = spreads.length > 0;
  const hasClosing = Boolean(closing || brochure.closingText);
  const total = 1 + (hasContents ? 1 : 0) + spreads.length + (hasClosing ? 1 : 0);
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

  const print = () => {
    try {
      if (window.self !== window.top) throw new Error('framed');
      window.print();
    } catch {
      window.location.href = pdfHref;
    }
  };

  /** Which slide a page is, so the contents can jump straight to it. */
  const slideOf = (tripId: number) =>
    firstTripIndex + spreads.findIndex((s) => s.tripId === tripId);

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
          <p className="sl-eyebrow">What is inside</p>
          <h2>The trips in this collection</h2>

          <div style={{ marginTop: 22 }}>
            {groups.map((g) => (
              <section className="sl-group" key={g.label || 'all'}>
                {g.label && <p className="sl-group-label">{g.label}</p>}
                <ul className="sl-toc">
                  {g.spreads.map((s) => {
                    const target = slideOf(s.tripId);
                    return (
                      <li key={s.tripId}>
                        <button type="button" onClick={() => go(target)}>
                          <span className="sl-n">
                            {String(target - firstTripIndex + 1).padStart(2, '0')}
                          </span>
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
          <TripBody spread={s} />
        </div>
      </article>,
    );
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

function TripBody({ spread }: { spread: TripSpread }) {
  const { trip, content: c } = spread;
  const title = trip?.title ?? c.headline ?? 'Trip';
  const hero = trip?.heroImage ?? spread.images[0] ?? null;

  return (
    <>
      <div className="sl-head">
        <div>
          <p className="sl-eyebrow">{c.eyebrow ?? trip?.subject ?? 'Trip'}</p>
          <h2>{title}</h2>
          {c.proposition && <p className="sl-lede">{c.proposition}</p>}
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
        </div>
        {hero && (
          <figure>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={sizedImage(hero, 'hero') ?? hero} alt={title} loading="lazy" />
          </figure>
        )}
      </div>

      <div className="sl-cols">
        <div>
          {c.intro && <p className="sl-lede">{c.intro}</p>}
          {(c.body ?? []).map((para, i) => (
            <p className="sl-lede" key={i}>
              {para}
            </p>
          ))}

          {(c.highlights ?? []).length > 0 && (
            <>
              <p className="sl-eyebrow" style={{ marginTop: 18 }}>
                Highlights
              </p>
              <ul className="sl-hl">
                {(c.highlights ?? []).map((h, i) => (
                  <li key={i}>
                    <strong>{h.name}</strong>
                    {h.note && <span>{h.note}</span>}
                    {/* Kept, not tidied away: "subject to availability" is the
                        difference between a promise and an intention. */}
                    {h.conditional && <em>{h.conditional}</em>}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <aside>
          {(trip?.journey ?? []).length > 0 && (
            <div className="sl-box">
              <p className="sl-label">Where the group goes</p>
              <div className="sl-chips">
                {(trip?.journey ?? []).map((stop, i) => (
                  <span key={i}>{stop.location}</span>
                ))}
              </div>
            </div>
          )}

          {(c.learningFocus ?? []).length > 0 && (
            <div className="sl-box">
              <p className="sl-label">Learning focus</p>
              <p>{(c.learningFocus ?? []).join(' · ')}</p>
            </div>
          )}

          {(c.inclusions ?? []).length > 0 && (
            <div className="sl-box">
              <p className="sl-label">Included</p>
              <p>{(c.inclusions ?? []).join(' · ')}</p>
            </div>
          )}

          {trip?.qrSvg && (
            <div className="sl-box">
              <p className="sl-label">Full itinerary</p>
              <p>Scan for the day-by-day plan.</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="sl-qr" src={trip.qrSvg} alt="" width={68} height={68} />
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
