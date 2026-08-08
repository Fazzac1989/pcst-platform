'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Message = {
  id: number;
  sender: 'teacher' | 'admin';
  author: string | null;
  body: string;
  createdAt: string;
};

export default function MessageThread({
  token,
  teacherName,
  initialMessages,
}: {
  token: string;
  teacherName: string | null;
  initialMessages: Message[];
}) {
  const router = useRouter();
  const [name, setName] = useState(teacherName ?? '');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/quotes/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, author: name, body }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? 'Could not send — please try again.');
      setBody('');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="qthread">
      <div className="qmsgs">
        {initialMessages.map((m) => (
          <div key={m.id} className={`qmsg ${m.sender}`}>
            <div className="qmsg-meta">
              {m.sender === 'admin' ? 'Premium Choice School Trips' : m.author || 'You'} ·{' '}
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
        {initialMessages.length === 0 && (
          <p className="qthread-empty">
            No messages yet. Ask a question or request a change — we reply within one working day.
          </p>
        )}
      </div>
      <form onSubmit={send} className="qform">
        <input
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <textarea
          rows={3}
          placeholder="Your message — questions, date changes, extra activities…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
        />
        {error && <p className="apt-error">{error}</p>}
        <button className="btn btn-brass" type="submit" disabled={busy}>
          {busy ? 'Sending…' : 'Send message'} {!busy && <span className="arrow">→</span>}
        </button>
      </form>
    </div>
  );
}
