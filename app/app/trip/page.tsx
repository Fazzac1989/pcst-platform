/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAppSession } from '@/lib/app/session';
import { getDestinationWeather } from '@/lib/app/weather';
import { getHighlights } from '@/lib/app/data';
import Greeting from './Greeting';
import Icon from './icons';

export const dynamic = 'force-dynamic';

const ROLE_TAG = { teacher: 'Command Centre', student: 'Explorer', parent: 'Family View' } as const;

export default async function TripHomePage() {
  const session = await getAppSession();
  if (!session) redirect('/app');
  const { member, trip } = session;

  const today = new Date().toISOString().slice(0, 10);
  const [weather, highlights] = await Promise.all([
    getDestinationWeather(trip.destination),
    getHighlights(trip.id, today),
  ]);

  const cards =
    member.role === 'teacher'
      ? [
          { href: '/app/trip/register', label: 'Student Register', icon: 'register' },
          { href: '/app/trip/flights', label: 'Flights & E-Tickets', icon: 'plane' },
          { href: '/app/trip/accommodation', label: 'Accommodation', icon: 'bed' },
          { href: '/app/trip/vouchers', label: 'Vouchers', icon: 'ticket' },
          { href: '/app/trip/broadcast', label: 'Broadcast', icon: 'megaphone' },
          { href: '/app/trip/translate', label: 'Translate', icon: 'translate' },
        ]
      : [
          { href: '/app/trip/flights', label: 'Flights & E-Tickets', icon: 'plane' },
          { href: '/app/trip/accommodation', label: 'Accommodation', icon: 'bed' },
          { href: '/app/trip/vouchers', label: 'Vouchers', icon: 'ticket' },
          { href: '/app/trip/photos', label: 'Photos', icon: 'photos' },
          { href: '/app/trip/broadcast', label: 'Announcements', icon: 'megaphone' },
          { href: '/app/trip/translate', label: 'Translate', icon: 'translate' },
        ];

  const highlightDay =
    highlights.date === today
      ? 'today'
      : new Date(highlights.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });

  return (
    <div className="papp-home">
      <div className="papp-home-top">
        <Greeting name={member.name} />
        <span className="papp-role-chip">{ROLE_TAG[member.role]}</span>
      </div>
      <p className="papp-home-trip">
        {trip.title}
        {trip.startDate && trip.endDate && (
          <>
            {' · '}
            {new Date(trip.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} –{' '}
            {new Date(trip.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
          </>
        )}
      </p>

      <div className="papp-cardgrid">
        {cards.map((c) => (
          <Link key={c.href} href={c.href} className="papp-gridcard">
            <span className="papp-gridcard-icon">
              <Icon name={c.icon} size={30} />
            </span>
            {c.label}
          </Link>
        ))}
      </div>

      {weather && (
        <section className="papp-card">
          <h2>Weather in {weather.place}</h2>
          <div className="papp-wx-row">
            {weather.days.map((d) => (
              <div key={d.date} className={`papp-wx${d.date === today ? ' today' : ''}`}>
                <div className="papp-wx-day">
                  {d.date === today
                    ? 'Today'
                    : new Date(d.date).toLocaleDateString('en-GB', { weekday: 'short' })}
                </div>
                <div className="papp-wx-icon" title={d.label}>
                  {d.icon}
                </div>
                <div className="papp-wx-temp">
                  {d.maxC}° <span>{d.minC}°</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {highlights.items.length > 0 && (
        <section className="papp-happening">
          <h2>What&apos;s happening {highlightDay}</h2>
          <div className="papp-rail">
            {highlights.items.map((h) => (
              <figure className="papp-rail-card" key={h.id}>
                {h.imageUrl ? (
                  <img src={h.imageUrl} alt="" loading="lazy" />
                ) : (
                  <div className="papp-rail-blank">
                    <Icon name="pin" size={28} />
                  </div>
                )}
                <figcaption>{h.caption}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
