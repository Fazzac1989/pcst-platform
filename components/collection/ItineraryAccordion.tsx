'use client';

import { useEffect, useId, useState } from 'react';
import { IconPin } from './icons';

type Day = {
  dayNumber: number;
  label: string;
  title: string;
  location: string | null;
  summary: string | null;
};

/**
 * The day-by-day, as an accordion.
 *
 * The first day is open when the page loads, so the itinerary starts by showing
 * what it is rather than a stack of closed bars. Expand all is there for the
 * coordinator who wants to read the whole thing, and for printing.
 */
export default function ItineraryAccordion({ days }: { days: Day[] }) {
  const base = useId();
  const [open, setOpen] = useState<number[]>(() => (days.length ? [days[0].dayNumber] : []));

  // A trip swapped underneath us should open its own first day, not keep the
  // day number of the last one.
  useEffect(() => {
    setOpen(days.length ? [days[0].dayNumber] : []);
  }, [days]);

  const toggle = (n: number) =>
    setOpen((prev) => (prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]));

  const allOpen = open.length === days.length && days.length > 0;

  if (!days.length) return null;

  return (
    <>
      <div className="sc-itin-head">
        <p className="sc-eyebrow">{days.length} days</p>
        <button
          type="button"
          className="sc-linkbtn"
          onClick={() => setOpen(allOpen ? [] : days.map((d) => d.dayNumber))}
        >
          {allOpen ? 'Collapse all' : 'Expand all'}
        </button>
      </div>

      <ul className="sc-days">
        {days.map((d) => {
          const isOpen = open.includes(d.dayNumber);
          const panelId = `${base}-p-${d.dayNumber}`;
          const btnId = `${base}-b-${d.dayNumber}`;
          return (
            <li className="sc-day" key={d.dayNumber}>
              <h3>
                <button
                  type="button"
                  id={btnId}
                  className="sc-day-btn"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => toggle(d.dayNumber)}
                >
                  <span className="sc-day-n">{d.label || `Day ${d.dayNumber}`}</span>
                  <span className="sc-day-t">{d.title}</span>
                  <span className="sc-day-chev" aria-hidden="true" />
                </button>
              </h3>
              <div id={panelId} role="region" aria-labelledby={btnId} hidden={!isOpen} className="sc-day-panel">
                {d.location && (
                  <p className="sc-day-where">
                    <IconPin size={14} />
                    {d.location}
                  </p>
                )}
                {d.summary && <p>{d.summary}</p>}
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
