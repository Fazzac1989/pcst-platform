'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

export type MegaSubject = {
  name: string;
  slug: string;
  tripCount: number;
  countries: string[];
};

const NAV_LINKS = [
  { label: 'Subjects', anchor: 'subjects' },
  { label: 'How it works', anchor: 'journey' },
  { label: 'Trips', anchor: 'trips' },
  { label: 'Health & Safety', anchor: 'safety' },
  { label: 'Contact', anchor: 'contact' },
];

// Trip pages order the menu as the reference trip template does.
const NAV_LINKS_TRIP = [
  { label: 'Subjects', anchor: 'subjects' },
  { label: 'Trips', anchor: 'trips' },
  { label: 'How it works', anchor: 'journey' },
  { label: 'Health & Safety', anchor: 'safety' },
  { label: 'Contact', anchor: 'contact' },
];

export default function SiteHeader({
  variant = 'home',
  subjects = [],
}: {
  variant?: 'home' | 'trip';
  subjects?: MegaSubject[];
}) {
  const ref = useRef<HTMLElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [megaOpen, setMegaOpen] = useState(false);

  useEffect(() => {
    const nav = ref.current;
    if (!nav) return;
    const onScroll = () => {
      if (window.scrollY > 40) nav.classList.add('scrolled');
      else nav.classList.remove('scrolled');
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMegaOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const openMega = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setMegaOpen(true);
  };
  const closeMegaSoon = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setMegaOpen(false), 160);
  };

  const onTrip = variant === 'trip';
  const links = onTrip ? NAV_LINKS_TRIP : NAV_LINKS;
  const href = (anchor: string) => (onTrip ? `/#${anchor}` : `#${anchor}`);
  const hasMega = subjects.length > 0;

  return (
    <header ref={ref} className={`nav${onTrip ? ' nav--trip' : ''}`}>
      <div className="wrap">
        <Link className="logo" href="/" style={{ display: 'flex', alignItems: 'center' }}>
          <Image
            className="logo-solid"
            src="/images/logo-navy.png"
            alt="Premium Choice School Trips"
            width={524}
            height={130}
            sizes="323px"
            style={{ height: 80, width: 'auto' }}
            priority
          />
          <Image
            className="logo-light"
            src="/images/logo-white.png"
            alt="Premium Choice School Trips"
            width={524}
            height={130}
            sizes="403px"
            style={{ height: 100, width: 'auto' }}
            priority
          />
        </Link>
        <div className="nav-right">
          <nav className="menu">
            {links.map((l) =>
              l.anchor === 'subjects' && hasMega ? (
                <a
                  key={l.anchor}
                  href={href(l.anchor)}
                  aria-haspopup="true"
                  aria-expanded={megaOpen}
                  onMouseEnter={openMega}
                  onMouseLeave={closeMegaSoon}
                  onFocus={openMega}
                >
                  {l.label} <span className="mega-caret">▾</span>
                </a>
              ) : (
                <a key={l.anchor} href={href(l.anchor)}>
                  {l.label}
                </a>
              )
            )}
          </nav>
          <div className="nav-cta">
            <Link className="btn btn-admin" href="/admin">
              Login
            </Link>
          </div>
        </div>
      </div>

      {hasMega && (
        <div
          className={`mega${megaOpen ? ' open' : ''}`}
          onMouseEnter={openMega}
          onMouseLeave={closeMegaSoon}
        >
          <div className="mega-inner">
            <div className="mega-head">
              <span className="eyebrow">Browse by subject</span>
            </div>
            <div className="mega-grid">
              {subjects.map((s) => (
                <Link
                  className="mega-item"
                  href={`/subjects/${s.slug}`}
                  key={s.slug}
                  onClick={() => setMegaOpen(false)}
                >
                  <h4>{s.name}</h4>
                  <span>
                    {s.tripCount} {s.tripCount === 1 ? 'itinerary' : 'itineraries'} ·{' '}
                    {s.countries.join(' · ')}
                  </span>
                </Link>
              ))}
            </div>
            <div className="mega-foot">
              <span>Can&apos;t see your subject? We build itineraries to order.</span>
              <Link href="/trips" onClick={() => setMegaOpen(false)}>
                View all trips →
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
