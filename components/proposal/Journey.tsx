'use client';

import { useCallback, useRef, useState } from 'react';
import type { ProposalDay, ProposalViewModel } from '@/lib/brochure/proposal-schema';

/**
 * The day-by-day journey: a route, a row of tabs and one panel per day.
 *
 * Interactive on screen and flattened in print — every panel is rendered, and
 * the print stylesheet reveals them all with their timetables open, so the PDF
 * is a document rather than a screenshot of whichever tab happened to be
 * showing.
 *
 * Keyboard support follows the tabs pattern: arrows move between days, Home and
 * End jump to the ends, and the route nodes are buttons doing the same thing.
 */
export default function Journey({
  days,
  images,
}: {
  days: ProposalDay[];
  images: ProposalViewModel['images'];
}) {
  const [active, setActive] = useState(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const go = useCallback(
    (next: number) => {
      const i = Math.max(0, Math.min(days.length - 1, next));
      setActive(i);
      tabRefs.current[i]?.focus();
    },
    [days.length],
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    const keys: Record<string, number> = {
      ArrowRight: active + 1,
      ArrowDown: active + 1,
      ArrowLeft: active - 1,
      ArrowUp: active - 1,
      Home: 0,
      End: days.length - 1,
    };
    if (!(e.key in keys)) return;
    e.preventDefault();
    go(keys[e.key]);
  };

  // The route is drawn from the day count so it fits any length of trip.
  const width = 1040;
  const left = 150;
  const step = days.length > 1 ? (width - left * 2) / (days.length - 1) : 0;

  return (
    <section className="journey on-dark" id="journey">
      <div className="wrap">
        <p className="eyebrow">The journey</p>
        <h2>
          Day by day, <em>start to finish</em>
        </h2>

        <div className="route" aria-hidden="true">
          <svg viewBox={`0 0 ${width} 190`} role="presentation">
            <line x1={left} y1="95" x2={width - left} y2="95" stroke="#fff" opacity=".6" strokeWidth="2" />
            <g>
              {days.map((day, i) => (
                <g key={day.dayNumber} className="node" transform={`translate(${left + step * i} 95)`}>
                  <circle className="dot" r="18" opacity={i === active ? 1 : 0.65} />
                  <text className="n" y="5">
                    {day.dayNumber}
                  </text>
                  {day.date && <text y="-28">{shortDate(day.date)}</text>}
                </g>
              ))}
            </g>
          </svg>
        </div>

        <div className="daytabs" role="tablist" aria-label="Days" onKeyDown={onKeyDown}>
          {days.map((day, i) => (
            <button
              key={day.dayNumber}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              role="tab"
              id={`day-tab-${day.dayNumber}`}
              aria-controls={`day-panel-${day.dayNumber}`}
              aria-selected={i === active}
              tabIndex={i === active ? 0 : -1}
              onClick={() => setActive(i)}
            >
              Day {day.dayNumber} · {day.title}
            </button>
          ))}
        </div>

        {days.map((day, i) => (
          <article
            key={day.dayNumber}
            className={`day${i === active ? ' active' : ''}`}
            role="tabpanel"
            id={`day-panel-${day.dayNumber}`}
            aria-labelledby={`day-tab-${day.dayNumber}`}
            hidden={i !== active}
          >
            <div className="photos">
              {day.imageIds.map((id) => {
                const img = images[id];
                if (!img) return null;
                // eslint-disable-next-line @next/next/no-img-element
                return <img key={id} src={img.url} alt={img.alt} loading="lazy" />;
              })}
            </div>
            <div>
              <p className="date">
                Day {day.dayNumber}
                {day.date ? ` · ${longDate(day.date)}` : ''}
              </p>
              <h3>{day.title}</h3>
              <p className="summary">{day.summary}</p>

              {day.items.length > 0 && (
                <details className="timetable">
                  <summary>
                    Full timetable <span className="chev" />
                  </summary>
                  <ol>
                    {day.items.map((item, n) => (
                      <li key={item.id ?? n}>
                        <time>{item.timeLabel}</time>
                        {/* Only <b> survives the seed's sanitiser, and the copy
                            comes from our own reference rather than a user. */}
                        <span dangerouslySetInnerHTML={{ __html: item.text }} />
                      </li>
                    ))}
                  </ol>
                </details>
              )}

              {day.overnight && (
                <div className="base">
                  <b>Overnight</b> {day.overnight}
                </div>
              )}

              <div className="daynav">
                <button type="button" onClick={() => go(active - 1)} disabled={active === 0}>
                  ← Previous day
                </button>
                <button type="button" onClick={() => go(active + 1)} disabled={active === days.length - 1}>
                  Next day →
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function longDate(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', {
    timeZone: 'UTC',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

function shortDate(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', {
    timeZone: 'UTC',
    weekday: 'short',
    day: 'numeric',
  });
}
