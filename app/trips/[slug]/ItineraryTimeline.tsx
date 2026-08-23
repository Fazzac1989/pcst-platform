'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, GraduationCap, Info, UtensilsCrossed } from 'lucide-react';
import { HighlightIcon } from '@/lib/itinerary/icons';
import { buildJourney, legLabel, type ItineraryDayView } from '@/lib/itinerary/schema';

/**
 * Two levels of information: a scannable card per day, and the full original
 * description one click away. The description is always in the DOM — collapsed
 * with hidden/height, never removed — so search engines still see it.
 */
export default function ItineraryTimeline({
  days,
  tripHighlights,
  children,
}: {
  days: ItineraryDayView[];
  tripHighlights: string[];
  /** The booking card, placed beside the timeline rather than above it. */
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState<Set<number>>(new Set());
  const journey = useMemo(() => buildJourney(days), [days]);

  // Day photographs page as one set, so the lightbox walks the trip in order
  // regardless of which thumbnail opened it.
  const photos = useMemo(
    () =>
      days
        .map((d, i) => ({ url: d.imageUrl, alt: d.imageAlt, dayNumber: i + 1, title: d.structured?.displayTitle || d.title }))
        .filter((p): p is { url: string; alt: string; dayNumber: number; title: string } => Boolean(p.url)),
    [days]
  );
  const [lightbox, setLightbox] = useState<number | null>(null);
  const step = useCallback(
    (delta: number) =>
      setLightbox((i) => (i === null ? null : (i + delta + photos.length) % photos.length)),
    [photos.length]
  );

  useEffect(() => {
    if (lightbox === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(null);
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [lightbox, step]);

  const toggle = (id: number) =>
    setOpen((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  const allOpen = open.size === days.length;
  const shown = lightbox === null ? null : photos[lightbox];

  return (
    <div className="itin">
      {(journey.length > 1 || tripHighlights.length > 0) && (
        <div className="itin-overview">
          {journey.length > 1 && (
            <nav className="itin-journey" aria-label="Where this trip goes">
              <span className="itin-label">Your journey</span>
              <ol>
                {journey.map((leg) => (
                  <li key={`${leg.location}-${leg.fromDay}`}>
                    <span className="itin-journey-place">{leg.location}</span>
                    <span className="itin-journey-days">{legLabel(leg)}</span>
                  </li>
                ))}
              </ol>
            </nav>
          )}
          {tripHighlights.length > 0 && (
            <div className="trip-highlights">
              <span className="itin-label">Trip highlights</span>
              <ul>
                {tripHighlights.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="itin-body">
        <div className="itin-main">
          <div className="itin-controls">
            <button
              type="button"
              onClick={() => setOpen(allOpen ? new Set() : new Set(days.map((d) => d.id)))}
            >
              {allOpen ? 'Collapse all days' : 'Expand all days'}
            </button>
          </div>

          <ol className="itin-list">
        {days.map((day, i) => {
          const s = day.structured;
          const isOpen = open.has(day.id);
          const panelId = `day-detail-${day.id}`;
          return (
            <li className="itin-day" key={day.id}>
              <div className="itin-rail">
                <span className="itin-daynum" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                {day.imageUrl && (
                  <button
                    type="button"
                    className="itin-thumb"
                    onClick={() => setLightbox(photos.findIndex((p) => p.dayNumber === i + 1))}
                    aria-label={`View the photograph for day ${i + 1}`}
                  >
                    <Image
                      src={day.imageUrl}
                      alt={day.imageAlt}
                      fill
                      sizes="72px"
                      style={{ objectFit: 'cover' }}
                    />
                    <span className="itin-thumb-zoom" aria-hidden="true">⤢</span>
                  </button>
                )}
              </div>

              <article className="itin-card">
                <header className="itin-card-head">
                  <p className="itin-meta">
                    <span>Day {i + 1} of {days.length}</span>
                    {s?.primaryLocation && <span className="itin-place">{s.primaryLocation}</span>}
                  </p>
                  <h3>{s?.displayTitle || day.title}</h3>
                  {s?.summary && <p className="itin-summary">{s.summary}</p>}
                </header>

                {s && s.highlights.length > 0 && (
                  <ul className="itin-highlights">
                    {s.highlights.map((h) => (
                      <li key={h.name}>
                        <span className="itin-hicon">
                          <HighlightIcon type={h.type} />
                        </span>
                        <span className="itin-hbody">
                          <b>{h.name}</b>
                          {h.summary && <span>{h.summary}</span>}
                          {h.conditional && h.conditionalText && (
                            <em className="itin-cond">{h.conditionalText}</em>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                {s && (s.learningFocus.length > 0 || s.meals.length > 0) && (
                  <div className="itin-foot">
                    {s.learningFocus.length > 0 && (
                      <p className="itin-learning">
                        <GraduationCap size={15} strokeWidth={1.7} aria-hidden="true" />
                        <span className="sr-only">Learning focus: </span>
                        {s.learningFocus.join(' · ')}
                      </p>
                    )}
                    {s.meals.length > 0 && (
                      <p className="itin-meals">
                        <UtensilsCrossed size={14} strokeWidth={1.7} aria-hidden="true" />
                        <span className="sr-only">Meals included: </span>
                        {s.meals.join(' · ')}
                      </p>
                    )}
                  </div>
                )}

                {s && s.notices.length > 0 && (
                  <ul className="itin-notices">
                    {s.notices.map((n) => (
                      <li key={n}>
                        <Info size={14} strokeWidth={1.7} aria-hidden="true" />
                        {n}
                      </li>
                    ))}
                  </ul>
                )}

                <button
                  type="button"
                  className="itin-toggle"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => toggle(day.id)}
                >
                  {isOpen ? 'Hide full day' : 'View full day'}
                  <ChevronDown size={16} strokeWidth={2} className={isOpen ? 'flip' : ''} aria-hidden="true" />
                </button>

                {/* Always rendered; collapsed with hidden so crawlers still read it. */}
                <div className="itin-detail" id={panelId} hidden={!isOpen}>
                  {day.title && s?.displayTitle && s.displayTitle !== day.title && (
                    <h4>{day.title}</h4>
                  )}
                  {day.description.split(/\n{2,}/).map((para, k) => (
                    <p key={k}>{para}</p>
                  ))}
                </div>
              </article>
            </li>
          );
        })}
          </ol>
        </div>
        {children && <div className="side">{children}</div>}
      </div>

      {shown && (
        <div
          className="lbox"
          role="dialog"
          aria-modal="true"
          aria-label="Itinerary photographs"
          onClick={(e) => e.target === e.currentTarget && setLightbox(null)}
        >
          <button className="lbox-close" onClick={() => setLightbox(null)} aria-label="Close">
            ✕
          </button>
          {photos.length > 1 && (
            <>
              <button className="lbox-nav prev" onClick={() => step(-1)} aria-label="Previous day">
                ‹
              </button>
              <button className="lbox-nav next" onClick={() => step(1)} aria-label="Next day">
                ›
              </button>
            </>
          )}
          <figure className="lbox-figure">
            <Image
              key={shown.url}
              src={shown.url}
              alt={shown.alt}
              width={1800}
              height={1200}
              sizes="90vw"
              style={{ width: 'auto', height: 'auto', maxWidth: '100%', maxHeight: '78vh', objectFit: 'contain' }}
              priority
            />
            <figcaption>
              <span className="lbox-count">Day {shown.dayNumber}</span>
              <p>{shown.title}</p>
            </figcaption>
          </figure>
        </div>
      )}
    </div>
  );
}
