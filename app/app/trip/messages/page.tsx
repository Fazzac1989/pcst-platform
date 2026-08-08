import { redirect } from 'next/navigation';
import { getMemberMessages } from '@/lib/app/data';
import { getAppSession } from '@/lib/app/session';
import MessageForm from './MessageForm';

export const dynamic = 'force-dynamic';

export default async function MessagesPage() {
  const session = await getAppSession();
  if (!session) redirect('/app');
  const { member } = session;

  const messages = await getMemberMessages(member);
  const heading =
    member.role === 'teacher'
      ? 'Your line to the PCT team'
      : member.role === 'student'
        ? 'Messages with home'
        : 'Messages with your child';

  return (
    <div>
      <section className="papp-card">
        <h2>{heading}</h2>
        <div className="papp-msgs">
          {messages.map((m) => (
            <div key={m.id} className={`papp-msg${m.fromSelf ? ' self' : ''}`}>
              <div className="papp-msg-meta">
                {m.fromSelf ? 'You' : m.senderName} ·{' '}
                {new Date(m.createdAt).toLocaleString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
              {m.body}
            </div>
          ))}
          {messages.length === 0 && (
            <p className="papp-empty">
              {member.role === 'teacher'
                ? 'Message the PCT team any time — we answer around the clock while you travel.'
                : 'No messages yet — say hello!'}
            </p>
          )}
        </div>
        <MessageForm />
      </section>
    </div>
  );
}
