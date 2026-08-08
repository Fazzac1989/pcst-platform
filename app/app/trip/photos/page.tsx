import { redirect } from 'next/navigation';
import { getTripPosts } from '@/lib/app/data';
import { getAppSession } from '@/lib/app/session';
import PostForm from './PostForm';

export const dynamic = 'force-dynamic';

export default async function PhotosPage() {
  const session = await getAppSession();
  if (!session) redirect('/app');

  const posts = await getTripPosts(session.member.tripId);

  return (
    <div>
      {session.member.role === 'student' && <PostForm />}
      {session.member.role === 'parent' && (
        <p className="papp-note">Photos posted by the group — updated live during the trip.</p>
      )}
      <div className="papp-feed">
        {posts.map((p) => (
          <article className="papp-post" key={p.id}>
            {p.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.imageUrl} alt={p.caption ?? ''} loading="lazy" />
            )}
            <div className="papp-post-meta">
              <strong>{p.memberName}</strong>
              <span>
                {new Date(p.createdAt).toLocaleString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
            {p.caption && <p className="papp-post-caption">{p.caption}</p>}
          </article>
        ))}
        {posts.length === 0 && (
          <section className="papp-card">
            <p className="papp-empty">No photos yet — the feed comes alive once the trip starts!</p>
          </section>
        )}
      </div>
    </div>
  );
}
