import Image from 'next/image';
import { redirect } from 'next/navigation';
import { getAppSession } from '@/lib/app/session';
import { getDestinationWeather } from '@/lib/app/weather';

export const dynamic = 'force-dynamic';

export default async function TripItineraryPage() {
  const session = await getAppSession();
  if (!session) redirect('/app');
  const { trip } = session;

  const weather = await getDestinationWeather(trip.destination);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div>
      {trip.heroImage && (
        <div className="papp-hero">
          <Image src={trip.heroImage} alt="" fill sizes="100vw" style={{ objectFit: 'cover' }} priority />
          <div className="papp-hero-fade" />
          <div className="papp-hero-meta">
            <div className="papp-dest">{trip.destination}</div>
            {trip.startDate && trip.endDate && (
              <div className="papp-dates">
                {new Date(trip.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} –{' '}
                {new Date(trip.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </div>
            )}
          </div>
        </div>
      )}

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

      <section className="papp-card">
        <h2>Day by day</h2>
        {trip.itinerary.map((day, i) => (
          <div className="papp-day" key={i}>
            <div className="papp-day-label">{day.label}</div>
            <div>
              {day.title && <h3>{day.title}</h3>}
              <p>{day.description}</p>
            </div>
          </div>
        ))}
        {trip.itinerary.length === 0 && <p className="papp-empty">Itinerary coming soon.</p>}
      </section>
    </div>
  );
}
