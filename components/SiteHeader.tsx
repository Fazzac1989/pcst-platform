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

export type MegaCountry = {
  name: string;
  slug: string;
  tripCount: number;
};

type MenuKey = 'subjects' | 'countries';

const NAV_LINKS = [
  { label: 'Subjects', anchor: 'subjects' },
  { label: 'Countries', anchor: 'countries' },
  { label: 'How it works', anchor: 'journey' },
  { label: 'Trips', anchor: 'trips' },
  { label: 'Health & Safety', anchor: 'safety' },
  { label: 'Contact', anchor: 'contact' },
];

// Trip pages order the menu as the reference trip template does.
const NAV_LINKS_TRIP = [
  { label: 'Subjects', anchor: 'subjects' },
  { label: 'Countries', anchor: 'countries' },
  { label: 'Trips', anchor: 'trips' },
  { label: 'How it works', anchor: 'journey' },
  { label: 'Health & Safety', anchor: 'safety' },
  { label: 'Contact', anchor: 'contact' },
];

export default function SiteHeader({
  variant = 'home',
  subjects = [],
  countries = [],
}: {
  variant?: 'home' | 'trip';
  subjects?: MegaSubject[];
  countries?: MegaCountry[];
}) {
  const ref = useRef<HTMLElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [openMenu, setOpenMenu] = useState<MenuKey | null>(null);

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
      if (e.key === 'Escape') setOpenMenu(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const openMega = (menu: MenuKey) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpenMenu(menu);
  };
  const closeMegaSoon = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpenMenu(null), 160);
  };

  const onTrip = variant === 'trip';
  const links = onTrip ? NAV_LINKS_TRIP : NAV_LINKS;
  const href = (anchor: string) => (onTrip ? `/#${anchor}` : `#${anchor}`);
  const menuFor = (anchor: string): MenuKey | null =>
    anchor === 'subjects' && subjects.length > 0
      ? 'subjects'
      : anchor === 'countries' && countries.length > 0
        ? 'countries'
        : null;

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
            {links.map((l) => {
              const menu = menuFor(l.anchor);
              return menu ? (
                <a
                  key={l.anchor}
                  href={menu === 'countries' ? '/trips' : href(l.anchor)}
                  aria-haspopup="true"
                  aria-expanded={openMenu === menu}
                  onMouseEnter={() => openMega(menu)}
                  onMouseLeave={closeMegaSoon}
                  onFocus={() => openMega(menu)}
                >
                  {l.label} <span className="mega-caret">▾</span>
                </a>
              ) : (
                <a key={l.anchor} href={href(l.anchor)}>
                  {l.label}
                </a>
              );
            })}
          </nav>
          {/* Staff sign-in lives on the Premium Choice Travel admin, not here. */}
        </div>
      </div>

      {subjects.length > 0 && (
        <div
          className={`mega${openMenu === 'subjects' ? ' open' : ''}`}
          onMouseEnter={() => openMega('subjects')}
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
                  onClick={() => setOpenMenu(null)}
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
              <Link href="/trips" onClick={() => setOpenMenu(null)}>
                View all trips →
              </Link>
            </div>
          </div>
        </div>
      )}

      {countries.length > 0 && (
        <div
          className={`mega${openMenu === 'countries' ? ' open' : ''}`}
          onMouseEnter={() => openMega('countries')}
          onMouseLeave={closeMegaSoon}
        >
          <div className="mega-inner">
            <div className="mega-head">
              <span className="eyebrow">Browse by country</span>
            </div>
            <div className="mega-grid mega-grid--countries">
              {countries.map((c) => (
                <Link
                  className="mega-item mega-item--country"
                  href={`/countries/${c.slug}`}
                  key={c.slug}
                  onClick={() => setOpenMenu(null)}
                >
                  <h4>{c.name}</h4>
                  <span>{c.tripCount}</span>
                </Link>
              ))}
            </div>
            <div className="mega-foot">
              <span>Somewhere else in mind? We design trips to any destination.</span>
              <Link href="/trips" onClick={() => setOpenMenu(null)}>
                View all trips →
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
