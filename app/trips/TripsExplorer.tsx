'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';

export type ExplorerTrip = {
  slug: string;
  title: string;
  subject: string;
  country: string;
  city: string | null;
  durationDays: number;
  durationNights: number;
  heroImage: string | null;
};

/**
 * The whole catalogue on one page, narrowed in place.
 *
 * Sixty trips is small enough to filter in the browser, so every change is
 * instant and nothing reloads. The filters describe how a teacher actually
 * looks: the subject they teach, the place they fancy, and how long they can
 * be away.
 */

const LENGTHS = [
  { key: 'any', label: 'Any length', test: () => true },
  { key: 'short', label: '5 days or fewer', test: (d: number) => d <= 5 },
  { key: 'week', label: '6 – 8 days', test: (d: number) => d >= 6 && d <= 8 },
  { key: 'long', label: '9 days or more', test: (d: number) => d >= 9 },
];

export default function TripsExplorer({ trips }: { trips: ExplorerTrip[] }) {
  const [query, setQuery] = useState('');
  const [subject, setSubject] = useState('all');
  const [country, setCountry] = useState('all');
  const [length, setLength] = useState('any');

  const subjects = useMemo(
    () => [...new Set(trips.map((t) => t.subject).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [trips]
  );
  const countries = useMemo(
    () => [...new Set(trips.map((t) => t.country).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [trips]
  );

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const lengthTest = LENGTHS.find((l) => l.key === length)?.test ?? (() => true);
    return trips.filter((t) => {
      if (subject !== 'all' && t.subject !== subject) return false;
      if (country !== 'all' && t.country !== country) return false;
      if (!lengthTest(t.durationDays)) return false;
      if (!q) return true;
      return `${t.title} ${t.country} ${t.city ?? ''} ${t.subject}`.toLowerCase().includes(q);
    });
  }, [trips, query, subject, country, length]);

  const filtered = query.trim() !== '' || subject !== 'all' || country !== 'all' || length !== 'any';
  const clear = () => {
    setQuery('');
    setSubject('all');
    setCountry('all');
    setLength('any');
  };

  return (
    <>
      <div className="tfilter">
        <div className="tfilter-row">
          <label className="tfilter-search">
            <span className="sr-only">Search trips</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by trip, country or city…"
            />
          </label>

          <label>
            <span className="sr-only">Subject</span>
            <select value={subject} onChange={(e) => setSubject(e.target.value)}>
              <option value="all">All subjects</option>
              {subjects.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>

          <label>
            <span className="sr-only">Destination</span>
            <select value={country} onChange={(e) => setCountry(e.target.value)}>
              <option value="all">All destinations</option>
              {countries.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>

          <label>
            <span className="sr-only">Trip length</span>
            <select value={length} onChange={(e) => setLength(e.target.value)}>
              {LENGTHS.map((l) => (
                <option key={l.key} value={l.key}>{l.label}</option>
              ))}
            </select>
          </label>
        </div>

        <p className="tfilter-count" aria-live="polite">
          {shown.length === trips.length
            ? `Showing all ${trips.length} trips`
            : `${shown.length} of ${trips.length} trips`}
          {filtered && (
            <button type="button" onClick={clear}>
              Clear filters
            </button>
          )}
        </p>
      </div>

      {shown.length === 0 ? (
        <p className="tfilter-empty">
          Nothing matches that combination — but we design trips to order.{' '}
          <Link href="/#contact">Tell us what you had in mind →</Link>
        </p>
      ) : (
        <div className="trip-grid">
          {shown.map((trip) => (
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
                  {trip.subject} · {trip.country}
                </span>
                <h3>{trip.title}</h3>
                <div className="dur">
                  {trip.durationDays} days / {trip.durationNights} nights
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
