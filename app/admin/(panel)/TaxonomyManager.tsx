'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { addCountry, addSubject, deleteCountry, deleteSubject } from '@/lib/admin/actions';

type Row = { id: number; name: string; slug: string; region?: string | null; tripCount: number };

export default function TaxonomyManager({
  kind,
  title,
  rows,
}: {
  kind: 'subject' | 'country';
  title: string;
  rows: Row[];
}) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [region, setRegion] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    const result =
      kind === 'subject' ? await addSubject(name) : await addCountry(name, region.trim() || null);
    if (!result.ok) setError(result.error);
    else {
      setName('');
      setRegion('');
      router.refresh();
    }
    setBusy(false);
  }

  async function onDelete(row: Row) {
    if (row.tripCount > 0) {
      setError(`"${row.name}" is used by ${row.tripCount} trip(s) — reassign them first.`);
      return;
    }
    if (!window.confirm(`Delete "${row.name}"?`)) return;
    setError(null);
    const result = kind === 'subject' ? await deleteSubject(row.id) : await deleteCountry(row.id);
    if (!result.ok) setError(result.error);
    else router.refresh();
  }

  const inputCls =
    'border border-line rounded px-3 py-2 text-sm text-ink outline-none focus:border-teal bg-white';

  return (
    <div className="max-w-2xl">
      <h1 className="font-serif text-3xl mb-8">{title}</h1>

      <form onSubmit={onAdd} className="flex gap-3 mb-6 flex-wrap">
        <input
          className={`${inputCls} w-64`}
          placeholder={`New ${kind} name…`}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        {kind === 'country' && (
          <select className={inputCls} value={region} onChange={(e) => setRegion(e.target.value)}>
            <option value="">Region…</option>
            {['Europe', 'Asia', 'Africa', 'Americas', 'Oceania', 'Middle East'].map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        )}
        <button
          disabled={busy}
          className="bg-teal text-ink font-semibold text-sm px-5 py-2 rounded-sm hover:bg-teal-hover transition-colors disabled:opacity-60"
        >
          Add
        </button>
      </form>
      {error && <p className="text-sm text-danger mb-4">{error}</p>}

      <div className="border border-line rounded">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-ink-soft border-b border-line bg-ink/[.03]">
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Slug</th>
              {kind === 'country' && <th className="px-4 py-3 font-semibold">Region</th>}
              <th className="px-4 py-3 font-semibold">Trips</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3 font-medium">{row.name}</td>
                <td className="px-4 py-3 text-ink-soft">{row.slug}</td>
                {kind === 'country' && <td className="px-4 py-3 text-ink-soft">{row.region ?? '—'}</td>}
                <td className="px-4 py-3">{row.tripCount}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => onDelete(row)}
                    className="text-xs text-ink-soft hover:text-danger font-semibold"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-ink-soft">
                  Nothing here yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
