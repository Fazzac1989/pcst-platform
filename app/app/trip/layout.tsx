import Link from 'next/link';
import { redirect } from 'next/navigation';
import { appLogout } from '@/lib/app/actions';
import { getAppSession } from '@/lib/app/session';

const ROLE_LABEL = { teacher: 'Teacher', student: 'Student', parent: 'Parent' } as const;

export default async function TripLayout({ children }: { children: React.ReactNode }) {
  const session = await getAppSession();
  if (!session) redirect('/app');
  const { member, trip } = session;

  const tabs = [
    { href: '/app/trip', label: 'Itinerary', icon: '🗓️' },
    { href: '/app/trip/documents', label: 'Documents', icon: '📄' },
    { href: '/app/trip/photos', label: 'Photos', icon: '📸' },
    { href: '/app/trip/messages', label: 'Messages', icon: '💬' },
    ...(member.role === 'teacher' ? [{ href: '/app/trip/team', label: 'Team', icon: '🧑‍🏫' }] : []),
  ];

  return (
    <div className="papp-shell">
      <header className="papp-head">
        <div>
          <div className="papp-trip-title">{trip.title}</div>
          <div className="papp-trip-sub">
            {member.name} · {ROLE_LABEL[member.role]}
          </div>
        </div>
        <form action={appLogout}>
          <button className="papp-logout" title="Sign out">
            ⎋
          </button>
        </form>
      </header>
      <main className="papp-main">{children}</main>
      <nav className="papp-tabs">
        {tabs.map((t) => (
          <Link key={t.href} href={t.href}>
            <span className="papp-tab-icon">{t.icon}</span>
            {t.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
