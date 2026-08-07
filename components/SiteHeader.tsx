'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef } from 'react';

const NAV_LINKS = [
  { label: 'Destinations', anchor: 'destinations' },
  { label: 'How it works', anchor: 'journey' },
  { label: 'Trips', anchor: 'trips' },
  { label: 'Health & Safety', anchor: 'safety' },
  { label: 'Contact', anchor: 'contact' },
];

// Trip pages order the menu as the reference trip template does.
const NAV_LINKS_TRIP = [
  { label: 'Destinations', anchor: 'destinations' },
  { label: 'Trips', anchor: 'trips' },
  { label: 'How it works', anchor: 'journey' },
  { label: 'Health & Safety', anchor: 'safety' },
  { label: 'Contact', anchor: 'contact' },
];

export default function SiteHeader({ variant = 'home' }: { variant?: 'home' | 'trip' }) {
  const ref = useRef<HTMLElement>(null);

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

  const onTrip = variant === 'trip';
  const links = onTrip ? NAV_LINKS_TRIP : NAV_LINKS;
  const href = (anchor: string) => (onTrip ? `/#${anchor}` : `#${anchor}`);

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
            sizes="291px"
            style={{ height: 72, width: 'auto' }}
            priority
          />
          <Image
            className="logo-light"
            src="/images/logo-white.png"
            alt="Premium Choice School Trips"
            width={524}
            height={130}
            sizes="355px"
            style={{ height: 88, width: 'auto' }}
            priority
          />
        </Link>
        <nav className="menu">
          {links.map((l) => (
            <a key={l.anchor} href={href(l.anchor)}>
              {l.label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}
