'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { sendBroadcast } from '@/lib/app/actions';

export default function BroadcastForm() {
  const router = useRouter();
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await sendBroadcast(body);
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? 'Could not send.');
      return;
    }
    setBody('');
    router.refresh();
  }

  return (
    <form className="papp-card papp-broadcast-form" onSubmit={submit}>
      <textarea
        rows={3}
        placeholder="Message to the whole group — e.g. Meet at the hotel lobby at 08:30 sharp."
        value={body}
        onChange={(e) => setBody(e.target.value)}
        disabled={busy}
      />
      <button className="btn btn-brass" disabled={busy || !body.trim()}>
        {busy ? 'Sending…' : '📣 Send to everyone'}
      </button>
      {error && <p className="papp-error">{error}</p>}
    </form>
  );
}
