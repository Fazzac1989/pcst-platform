'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icon from './icons';

const TABS = [
  { href: '/app/trip', label: 'Home', icon: 'home' },
  { href: '/app/trip/itinerary', label: 'Itinerary', icon: 'calendar' },
  { href: '/app/trip/learning', label: 'Learning', icon: 'learning' },
  { href: '/app/trip/photos', label: 'Photos', icon: 'photos' },
  { href: '/app/trip/messages', label: 'Messages', icon: 'messages' },
  { href: '/app/trip/support', label: 'Support', icon: 'support' },
];

export default function TabBar() {
  const pathname = usePathname();
  return (
    <nav className="papp-tabs">
      {TABS.map((t) => {
        const active = t.href === '/app/trip' ? pathname === t.href : pathname.startsWith(t.href);
        return (
          <Link key={t.href} href={t.href} className={active ? 'active' : undefined}>
            <span className="papp-tab-icon">
              <Icon name={t.icon} size={22} />
            </span>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
