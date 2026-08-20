'use client';

/* eslint-disable @next/next/no-img-element -- popup thumbnails are tiny and transient */
import Link from 'next/link';
import { useRef, useState } from 'react';
import worldMap from '@svg-maps/world';

type MapLocation = { id: string; name: string; path: string };
const world = worldMap as unknown as { viewBox: string; locations: MapLocation[] };

/**
 * Where a subject travels, drawn on a world map.
 *
 * Countries carrying trips for this subject are tinted; resting on one raises a
 * small card beside it with the trip's photograph, its name and an Explore
 * button. On touch screens the first tap raises the card and the button does
 * the navigating, since hover does not exist there.
 *
 * Map outlines: @svg-maps/world (CC BY 4.0).
 */

export type MapTrip = { slug: string; title: string; image: string | null };
export type MapCountry = { name: string; trips: MapTrip[] };

/** DB country names that differ from the map's own labels. */
const ALIASES: Record<string, string> = {
  usa: 'united states',
  uk: 'united kingdom',
  uae: 'united arab emirates',
  'south korea': 'south korea',
  vietnam: 'vietnam',
  'czech republic': 'czech republic',
  czechia: 'czech republic',
  holland: 'netherlands',
  turkey: 'turkey',
  türkiye: 'turkey',
};

const norm = (s: string) => s.trim().toLowerCase();

export default function SubjectWorldMap({ countries }: { countries: MapCountry[] }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<{ country: MapCountry; x: number; y: number } | null>(null);

  // Match DB countries to map locations by normalised name.
  const byMapName = new Map<string, MapCountry>();
  for (const c of countries) {
    const key = ALIASES[norm(c.name)] ?? norm(c.name);
    byMapName.set(key, c);
  }

  const countryFor = (locationName: string) => byMapName.get(norm(locationName)) ?? null;

  function raise(country: MapCountry, e: React.MouseEvent) {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    // Anchor beside the pointer, clamped so the card never leaves the map.
    const x = Math.min(Math.max(e.clientX - rect.left, 20), rect.width - 240);
    const y = Math.min(Math.max(e.clientY - rect.top - 10, 10), rect.height - 150);
    setActive({ country, x, y });
  }

  return (
    <div className="smap" ref={wrapRef} onMouseLeave={() => setActive(null)}>
      <svg
        viewBox={world.viewBox}
        role="img"
        aria-label="Countries where this subject travels"
        className="smap-svg"
      >
        {world.locations.map((loc) => {
          const match = countryFor(loc.name);
          return (
            <path
              key={loc.id}
              d={loc.path}
              className={match ? 'smap-on' : 'smap-off'}
              tabIndex={match ? 0 : undefined}
              aria-label={match ? `${loc.name} — ${match.trips.length} trip${match.trips.length === 1 ? '' : 's'}` : undefined}
              onMouseEnter={match ? (e) => raise(match, e) : undefined}
              onMouseMove={match && !active ? (e) => raise(match, e) : undefined}
              onClick={match ? (e) => raise(match, e) : undefined}
              onFocus={
                match
                  ? (e) => {
                      const rect = wrapRef.current?.getBoundingClientRect();
                      const box = (e.target as SVGPathElement).getBBox();
                      const svg = (e.target as SVGPathElement).ownerSVGElement;
                      if (!rect || !svg) return;
                      // Keyboard focus has no pointer: anchor at the country itself.
                      const scaleX = rect.width / 1010;
                      const scaleY = rect.height / 666;
                      setActive({
                        country: match,
                        x: Math.min(Math.max((box.x + box.width / 2) * scaleX, 20), rect.width - 240),
                        y: Math.min(Math.max(box.y * scaleY, 10), rect.height - 150),
                      });
                    }
                  : undefined
              }
            />
          );
        })}
      </svg>

      {active && (
        <div className="smap-pop" style={{ left: active.x, top: active.y }} role="dialog" aria-label={active.country.name}>
          {active.country.trips[0]?.image && (
            <img src={active.country.trips[0].image} alt="" loading="lazy" />
          )}
          <div className="smap-pop-body">
            <span className="smap-pop-country">{active.country.name}</span>
            <strong>{active.country.trips[0]?.title}</strong>
            {active.country.trips.length > 1 && (
              <em>+ {active.country.trips.length - 1} more trip{active.country.trips.length > 2 ? 's' : ''}</em>
            )}
            <Link href={`/trips/${active.country.trips[0]?.slug}`} className="smap-explore">
              Explore
            </Link>
          </div>
        </div>
      )}

      <p className="smap-credit">Map outlines: svg-maps (CC BY 4.0)</p>
    </div>
  );
}
