'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';
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
}: {
  days: ItineraryDayView[];
  tripHighlights: string[];
}) {
  const [open, setOpen] = useState<Set<number>>(new Set());
  const journey = useMemo(() => buildJourney(days), [days]);

  const toggle = (id: number) =>
    setOpen((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  const allOpen = open.size === days.length;

  return (
    <div className="itin">
      {(journey.length > 1 || tripHighlights.length > 0) && (
        <div className="itin-overview">
          {journey.length > 1 && (
            <nav className="journey" aria-label="Where this trip goes">
              <span className="itin-label">Your journey</span>
              <ol>
                {journey.map((leg) => (
                  <li key={`${leg.location}-${leg.fromDay}`}>
                    <span className="journey-place">{leg.location}</span>
                    <span className="journey-days">{legLabel(leg)}</span>
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
              <div className="itin-rail" aria-hidden="true">
                <span className="itin-daynum">{String(i + 1).padStart(2, '0')}</span>
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

                {day.imageUrl && (
                  <div className="itin-photo">
                    <Image
                      src={day.imageUrl}
                      alt={day.imageAlt}
                      fill
                      sizes="(max-width: 860px) 100vw, 620px"
                      style={{ objectFit: 'cover' }}
                    />
                  </div>
                )}

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
  );
}
