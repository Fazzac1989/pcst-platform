'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { saveBookingTerms } from '@/lib/admin/actions';

function move<T>(arr: T[], from: number, to: number): T[] {
  if (to < 0 || to >= arr.length) return arr;
  const next = [...arr];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

const smallBtn =
  'text-xs font-semibold px-2.5 py-1.5 rounded border border-line text-ink-soft hover:border-teal hover:text-teal-deep transition-colors';

export default function TermsEditor({ initial }: { initial: string[] }) {
  const router = useRouter();
  const [terms, setTerms] = useState(initial.length ? initial : ['']);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function onSave() {
    setBusy(true);
    setError(null);
    setSaved(false);
    const result = await saveBookingTerms(terms.map((t) => t.trim()).filter(Boolean));
    if (!result.ok) setError(result.error);
    else {
      setSaved(true);
      router.refresh();
    }
    setBusy(false);
  }

  return (
    <div className="max-w-2xl">
      <h1 className="font-serif text-3xl mb-2">Booking Terms</h1>
      <p className="text-sm text-ink-soft mb-8">
        Shown in the terms accordion on every trip page, in this order.
      </p>

      <div className="grid gap-3">
        {terms.map((term, i) => (
          <div key={i} className="flex gap-2 items-start">
            <span className="font-serif italic text-teal-deep pt-2 w-6 text-right shrink-0">
              {i + 1}.
            </span>
            <textarea
              rows={2}
              className="border border-line rounded px-3 py-2 text-sm text-ink outline-none focus:border-teal bg-white w-full"
              value={term}
              onChange={(e) => setTerms(terms.map((t, j) => (j === i ? e.target.value : t)))}
            />
            <div className="flex gap-1 pt-1">
              <button className={smallBtn} onClick={() => setTerms(move(terms, i, i - 1))} aria-label="Move up">↑</button>
              <button className={smallBtn} onClick={() => setTerms(move(terms, i, i + 1))} aria-label="Move down">↓</button>
              <button className={smallBtn} onClick={() => setTerms(terms.filter((_, j) => j !== i))} aria-label="Remove term">✕</button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3 mt-6 items-center">
        <button className={smallBtn} onClick={() => setTerms([...terms, ''])}>
          + Add term
        </button>
        <button
          onClick={onSave}
          disabled={busy}
          className="bg-teal text-ink font-semibold text-sm px-6 py-2.5 rounded-sm hover:bg-teal-hover transition-colors disabled:opacity-60"
        >
          {busy ? 'Saving…' : 'Save terms'}
        </button>
        {saved && <span className="text-sm text-teal-deep font-semibold">Saved ✓</span>}
        {error && <span className="text-sm text-danger">{error}</span>}
      </div>
    </div>
  );
}
