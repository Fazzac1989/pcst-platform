'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { pushQuoteToApp } from '@/lib/admin/app-actions';

const inputCls =
  'border border-line rounded px-3 py-2 text-sm text-ink outline-none focus:border-teal bg-white w-full';
const labelCls = 'text-xs font-semibold uppercase tracking-widest text-teal-deep';

export default function PushToAppForm({
  quotes,
}: {
  quotes: { id: number; label: string; travelDates: string | null }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [quoteId, setQuoteId] = useState<number | ''>('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [codePrefix, setCodePrefix] = useState('');
  const [teachers, setTeachers] = useState('');
  const [students, setStudents] = useState('');
  const [createParents, setCreateParents] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!quoteId) return setError('Choose a confirmed quote.');
    setBusy(true);
    setError(null);
    const result = await pushQuoteToApp({
      quoteId: Number(quoteId),
      destination,
      startDate: startDate || null,
      endDate: endDate || null,
      codePrefix,
      teacherNames: teachers.split('\n'),
      studentNames: students.split('\n'),
      createParents,
    });
    setBusy(false);
    if (!result.ok) return setError(result.error);
    router.push(`/admin/app/${result.id}`);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="bg-teal text-ink font-semibold text-sm px-5 py-2.5 rounded-sm hover:bg-teal-hover transition-colors"
      >
        Push a confirmed quote to the app
      </button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="border border-line rounded p-6 grid gap-4 max-w-2xl">
      <div className="grid grid-cols-2 gap-4">
        <label className="grid gap-1.5 col-span-2">
          <span className={labelCls}>Confirmed quote</span>
          <select className={inputCls} value={quoteId} onChange={(e) => setQuoteId(e.target.value ? Number(e.target.value) : '')}>
            <option value="">— choose —</option>
            {quotes.map((q) => (
              <option key={q.id} value={q.id}>
                {q.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5">
          <span className={labelCls}>Destination (city, country)</span>
          <input className={inputCls} value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Reykjavik, Iceland" required />
        </label>
        <label className="grid gap-1.5">
          <span className={labelCls}>Code prefix</span>
          <input className={inputCls} value={codePrefix} onChange={(e) => setCodePrefix(e.target.value)} placeholder="ICE24" required />
        </label>
        <label className="grid gap-1.5">
          <span className={labelCls}>Start date</span>
          <input type="date" className={inputCls} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </label>
        <label className="grid gap-1.5">
          <span className={labelCls}>End date</span>
          <input type="date" className={inputCls} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <label className="grid gap-1.5">
          <span className={labelCls}>Teachers (one per line)</span>
          <textarea rows={3} className={inputCls} value={teachers} onChange={(e) => setTeachers(e.target.value)} placeholder={'Ms Jane Example'} />
        </label>
        <label className="grid gap-1.5">
          <span className={labelCls}>Students (one per line)</span>
          <textarea rows={6} className={inputCls} value={students} onChange={(e) => setStudents(e.target.value)} placeholder={'Aisha Khan\nOmar Said\n…'} />
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input type="checkbox" checked={createParents} onChange={(e) => setCreateParents(e.target.checked)} className="accent-[#19BAAB] w-4 h-4" />
        Also create one parent login per student
      </label>
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex gap-3">
        <button disabled={busy} className="bg-teal text-ink font-semibold text-sm px-6 py-2.5 rounded-sm hover:bg-teal-hover transition-colors disabled:opacity-60">
          {busy ? 'Creating…' : 'Create app trip + credentials'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-ink-soft hover:underline">
          Cancel
        </button>
      </div>
    </form>
  );
}
