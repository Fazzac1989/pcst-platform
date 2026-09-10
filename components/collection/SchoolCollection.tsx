'use client';

import { useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Brochure } from '@/lib/brochure/schema';
import {
  DURATION_BUCKETS,
  YEAR_BANDS,
  suitsBand,
  type CollectionTrip,
} from '@/lib/brochure/collection';
import BrochureHeader from './BrochureHeader';
import SchoolCollectionHero from './SchoolCollectionHero';
import TripCard from './TripCard';
import { useShortlist } from './useShortlist';
import { IconSearch } from './icons';

type Props = {
  brochure: Brochure;
  trips: CollectionTrip[];
  schoolName: string;
  edition: string;
  heroImage: string | null;
  pdfHref: string;
  supportHref: string;
};

const GRID_ID = 'your-trips';

/**
 * The collection: search, four filters and a card per trip.
 *
 * The whole collection is in the browser already — thirty-odd trips is nothing
 * to filter client-side — so every keystroke is instant. What the teacher has
 * narrowed to is kept in the URL, which is what makes opening a trip and coming
 * back leave their work where it was.
 */
export default function SchoolCollection({
  brochure,
  trips,
  schoolName,
  edition,
  heroImage,
  pdfHref,
  supportHref,
}: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const shortlist = useShortlist(brochure.slug);

  const q = params.get('q') ?? '';
  const subject = params.get('subject') ?? '';
  const destination = params.get('to') ?? '';
  const year = params.get('year') ?? '';
  const duration = params.get('days') ?? '';
  const includeUnknown = params.get('unknown') === '1';

  const setParam = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params.toString());
      if (value) next.set(key, value);
      else next.delete(key);
      // Choosing a different year band should not silently keep the old opt-in.
      if (key === 'year' && !value) next.delete('unknown');
      const qs = next.toString();
      router.replace(qs ? `?${qs}` : '?', { scroll: false });
    },
    [params, router],
  );

  const clearAll = useCallback(() => router.replace('?', { scroll: false }), [router]);

  // Options come from what is actually in this collection, not a fixed list.
  const subjects = useMemo(
    () => [...new Set(trips.map((t) => t.subject).filter((s): s is string => Boolean(s)))].sort((a, b) => a.localeCompare(b)),
    [trips],
  );
  const destinations = useMemo(
    () => [...new Set(trips.map((t) => t.country).filter((s): s is string => Boolean(s)))].sort((a, b) => a.localeCompare(b)),
    [trips],
  );

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const band = YEAR_BANDS.find((b) => b.key === year);
    const bucket = DURATION_BUCKETS.find((d) => d.key === duration);
    return trips.filter((t) => {
      if (subject && t.subject !== subject) return false;
      if (destination && t.country !== destination) return false;
      if (bucket && !bucket.test(t.days)) return false;
      if (band) {
        // A trip with no recorded year group is unknown, not universal: it is
        // excluded unless the teacher asks to see unknowns too.
        if (!t.years) {
          if (!includeUnknown) return false;
        } else if (!suitsBand(t, band)) return false;
      }
      if (!needle) return true;
      return `${t.title} ${t.city ?? ''} ${t.country ?? ''} ${t.subject ?? ''}`
        .toLowerCase()
        .includes(needle);
    });
  }, [trips, q, subject, destination, year, duration, includeUnknown]);

  const chips = [
    subject && { key: 'subject', label: subject },
    destination && { key: 'to', label: destination },
    year && { key: 'year', label: YEAR_BANDS.find((b) => b.key === year)?.label ?? year },
    duration && { key: 'days', label: DURATION_BUCKETS.find((d) => d.key === duration)?.label ?? duration },
    q.trim() && { key: 'q', label: `“${q.trim()}”` },
  ].filter(Boolean) as { key: string; label: string }[];

  const filtering = chips.length > 0;
  const unknownCount = useMemo(() => trips.filter((t) => !t.years).length, [trips]);
  const tripHref = (t: CollectionTrip) => {
    const qs = params.toString();
    return `/brochures/${encodeURIComponent(brochure.slug)}/trips/${t.tripId}${qs ? `?${qs}` : ''}`;
  };

  return (
    <div className="sc">
      <BrochureHeader
        slug={brochure.slug}
        schoolName={schoolName}
        clientLogo={brochure.clientLogo}
        current="collection"
        supportHref={supportHref}
      />

      <SchoolCollectionHero
        edition={edition}
        schoolName={schoolName}
        image={heroImage}
        pdfHref={pdfHref}
        targetId={GRID_ID}
      />

      <main className="sc-main sc-wrap" id={GRID_ID}>
        <div className="sc-headrow">
          <h2>Explore your collection</h2>
          <span className="sc-headrow-rule" aria-hidden="true" />
          <p>Browse by what matters to your school</p>
        </div>

        <div className="sc-filters">
          <div className="sc-field sc-search sc-hide-label">
            <label htmlFor="sc-q">Search trips or destinations</label>
            <IconSearch size={18} />
            <input
              id="sc-q"
              className="sc-input"
              type="search"
              placeholder="Search trips or destinations"
              value={q}
              onChange={(e) => setParam('q', e.target.value)}
            />
          </div>

          <div className="sc-field sc-hide-label">
            <label htmlFor="sc-subject">Subject</label>
            <select id="sc-subject" className="sc-select" value={subject} onChange={(e) => setParam('subject', e.target.value)}>
              <option value="">Subject</option>
              {subjects.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="sc-field sc-hide-label">
            <label htmlFor="sc-to">Destination</label>
            <select id="sc-to" className="sc-select" value={destination} onChange={(e) => setParam('to', e.target.value)}>
              <option value="">Destination</option>
              {destinations.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="sc-field sc-hide-label">
            <label htmlFor="sc-year">Year group</label>
            <select id="sc-year" className="sc-select" value={year} onChange={(e) => setParam('year', e.target.value)}>
              <option value="">Year group</option>
              {YEAR_BANDS.map((b) => (
                <option key={b.key} value={b.key}>{b.label}</option>
              ))}
            </select>
          </div>

          <div className="sc-field sc-hide-label">
            <label htmlFor="sc-days">Duration</label>
            <select id="sc-days" className="sc-select" value={duration} onChange={(e) => setParam('days', e.target.value)}>
              <option value="">Duration</option>
              {DURATION_BUCKETS.map((d) => (
                <option key={d.key} value={d.key}>{d.label}</option>
              ))}
            </select>
          </div>
        </div>

        {(filtering || (year && unknownCount > 0)) && (
          <div className="sc-active">
            {chips.map((c) => (
              <span className="sc-chip" key={c.key}>
                {c.label}
                <button type="button" onClick={() => setParam(c.key, '')} aria-label={`Remove filter ${c.label}`}>
                  ×
                </button>
              </span>
            ))}
            {year && unknownCount > 0 && (
              <label className="sc-chip" style={{ background: 'transparent', color: 'var(--text-2)' }}>
                <input
                  type="checkbox"
                  checked={includeUnknown}
                  onChange={(e) => setParam('unknown', e.target.checked ? '1' : '')}
                />
                Include {unknownCount} trip{unknownCount === 1 ? '' : 's'} with no year group recorded
              </label>
            )}
            {filtering && (
              <button type="button" className="sc-clear" onClick={clearAll}>
                Clear filters
              </button>
            )}
            <p className="sc-resultcount" role="status">
              {results.length} of {trips.length} trips
            </p>
          </div>
        )}

        <ul className="sc-grid">
          {results.map((t, i) => (
            <TripCard
              key={t.tripId}
              trip={t}
              href={tripHref(t)}
              saved={shortlist.has(t.tripId)}
              onToggle={shortlist.toggle}
              priority={i < 3}
            />
          ))}

          {results.length === 0 && (
            <li className="sc-empty">
              <h3>No trips match those filters</h3>
              <p>
                Your collection still has {trips.length} trips in it. Widen the search, or start
                again.
              </p>
              <button type="button" className="sc-cta" onClick={clearAll}>
                Clear filters
              </button>
            </li>
          )}
        </ul>

        <div className="sc-closing">
          <hr />
          <p>Build a shortlist. Compare your options. Let’s shape the right journey.</p>
          <hr />
        </div>

        <footer className="sc-footer">
          <span>Premium Choice School Trips, powered by Premium Choice Travel.</span>
          <a href={pdfHref}>Download the full brochure</a>
          <a href={supportHref}>School support</a>
        </footer>
      </main>
    </div>
  );
}
