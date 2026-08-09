import { redirect } from 'next/navigation';
import { getBroadcasts } from '@/lib/app/data';
import { getAppSession } from '@/lib/app/session';
import BroadcastForm from './BroadcastForm';

export const dynamic = 'force-dynamic';

export default async function BroadcastPage() {
  const session = await getAppSession();
  if (!session) redirect('/app');
  const { member, trip } = session;

  const broadcasts = await getBroadcasts(trip.id);

  return (
    <div>
      <h1 className="papp-page-title">{member.role === 'teacher' ? 'Broadcast' : 'Announcements'}</h1>
      {member.role === 'teacher' ? (
        <BroadcastForm />
      ) : (
        <p className="papp-note">Messages from your trip leaders appear here.</p>
      )}

      {broadcasts.map((b) => (
        <section className="papp-card papp-broadcast" key={b.id}>
          <div className="papp-broadcast-head">
            <strong>{b.senderName}</strong>
            <span>
              {new Date(b.createdAt).toLocaleString('en-GB', {
                weekday: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
          <p>{b.body}</p>
        </section>
      ))}
      {broadcasts.length === 0 && (
        <section className="papp-card">
          <p className="papp-empty">No announcements yet.</p>
        </section>
      )}
    </div>
  );
}
