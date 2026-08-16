'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import type { ItineraryDay } from '@/lib/data';

type Props = {
  itinerary: ItineraryDay[];
  fallbackImage: string | null;
  fallbackAlt: string;
  children: React.ReactNode; // the sticky column's call-to-action
};

/**
 * Day-by-day itinerary with a sticky photo panel that follows the reader.
 * The panel updates as days scroll into view, and immediately on hover or
 * keyboard focus. On narrow screens the panel is hidden and each day shows
 * its own photo inline instead.
 */
export default function ItineraryPanel({ itinerary, fallbackImage, fallbackAlt, children }: Props) {
  const [active, setActive] = useState(0);
  const dayRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Scroll-linked: whichever day sits nearest the top of the reading area wins.
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (!visible) return;
        const index = dayRefs.current.indexOf(visible.target as HTMLDivElement);
        if (index >= 0) setActive(index);
      },
      { rootMargin: '-20% 0px -60% 0px', threshold: 0 }
    );
    dayRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [itinerary.length]);

  // Show the active day's photo, falling back to the trip hero.
  const activeDay = itinerary[active];
  const panelImage = activeDay?.imageUrl ?? fallbackImage;
  const panelAlt = activeDay?.imageUrl ? activeDay.imageAlt : fallbackAlt;

  return (
    <div className="cols itin-cols">
      <div className="itin-days">
        {itinerary.map((day, i) => (
          <div
            className={`day${i === active ? ' active' : ''}`}
            key={i}
            ref={(el) => {
              dayRefs.current[i] = el;
            }}
            onMouseEnter={() => setActive(i)}
            onFocus={() => setActive(i)}
            tabIndex={0}
          >
            <div className="dnum">{day.label}</div>
            <div>
              {day.title && <h3>{day.title}</h3>}
              <p>{day.description}</p>
              {/* Inline on mobile, where the sticky panel is hidden. */}
              {day.imageUrl && (
                <div className="day-inline-photo">
                  <Image
                    src={day.imageUrl}
                    alt={day.imageAlt}
                    fill
                    sizes="100vw"
                    style={{ objectFit: 'cover' }}
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="side">
        {panelImage && (
          <figure className="itin-panel">
            <Image
              key={panelImage}
              src={panelImage}
              alt={panelAlt}
              fill
              sizes="(max-width: 980px) 100vw, 40vw"
              style={{ objectFit: 'cover' }}
            />
            {activeDay?.imageUrl && (
              <figcaption>
                <span>{activeDay.label}</span>
                {activeDay.title}
              </figcaption>
            )}
          </figure>
        )}
        {children}
      </div>
    </div>
  );
}
