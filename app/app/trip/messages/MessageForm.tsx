'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { sendAppMessage } from '@/lib/app/actions';

export default function MessageForm() {
  const router = useRouter();
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    setError(null);
    const result = await sendAppMessage(body);
    if (!result.ok) setError(result.error ?? 'Could not send.');
    else {
      setBody('');
      router.refresh();
    }
    setBusy(false);
  }

  return (
    <form className="papp-msgform" onSubmit={onSubmit}>
      <textarea
        rows={2}
        placeholder="Write a message…"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={2000}
      />
      {error && <p className="papp-error">{error}</p>}
      <button className="btn btn-brass" disabled={busy || !body.trim()}>
        {busy ? 'Sending…' : 'Send'}
      </button>
    </form>
  );
}
