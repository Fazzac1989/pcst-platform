import { redirect } from 'next/navigation';
import { getSchedule } from '@/lib/app/data';
import { getAppSession } from '@/lib/app/session';

export const dynamic = 'force-dynamic';

export default async function LearningPage() {
  const session = await getAppSession();
  if (!session) redirect('/app');

  const schedule = await getSchedule(session.trip.id);
  const lessons = schedule.filter((s) => s.educationalContent);
  const dates = Array.from(new Set(lessons.map((l) => l.date)));

  return (
    <div>
      <h1 className="papp-page-title">Learning</h1>
      <p className="papp-note">
        The story behind each stop — read it on the coach, use it on the tour.
      </p>
      {dates.map((date, i) => (
        <section className="papp-card" key={date}>
          <h2>
            Day {i + 1} ·{' '}
            {new Date(date + 'T00:00').toLocaleDateString('en-GB', {
              weekday: 'long',
              day: 'numeric',
              month: 'short',
            })}
          </h2>
          {lessons
            .filter((l) => l.date === date)
            .map((l) => (
              <div className="papp-lesson" key={l.id}>
                <h3>{l.title}</h3>
                <p>{l.educationalContent}</p>
              </div>
            ))}
        </section>
      ))}
      {lessons.length === 0 && (
        <section className="papp-card">
          <p className="papp-empty">
            Learning notes for each visit will appear here once the itinerary is published.
          </p>
        </section>
      )}
    </div>
  );
}
