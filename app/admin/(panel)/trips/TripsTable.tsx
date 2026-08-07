'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import { setTripFeatured } from '@/lib/admin/actions';

export type AdminTripRow = {
  id: number;
  slug: string;
  title: string;
  subject: string;
  country: string;
  duration: string;
  status: 'draft' | 'published' | 'archived';
  featured: boolean;
  updatedAt: string;
};

const STATUS_STYLES: Record<AdminTripRow['status'], string> = {
  published: 'bg-teal/15 text-teal-deep',
  draft: 'bg-ink/10 text-ink-soft',
  archived: 'bg-danger/10 text-danger',
};

export default function TripsTable({ rows, subjects }: { rows: AdminTripRow[]; subjects: string[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState('');
  const [subject, setSubject] = useState('all');
  const [status, setStatus] = useState('all');

  const filtered = useMemo(
    () =>
      rows.filter(
        (r) =>
          (subject === 'all' || r.subject === subject) &&
          (status === 'all' || r.status === status) &&
          (search === '' || r.title.toLowerCase().includes(search.toLowerCase()))
      ),
    [rows, search, subject, status]
  );

  function toggleFeatured(row: AdminTripRow) {
    startTransition(async () => {
      await setTripFeatured(row.id, !row.featured);
      router.refresh();
    });
  }

  const inputCls =
    'border border-line rounded px-3 py-2 text-sm text-ink outline-none focus:border-teal bg-white';

  return (
    <div>
      <div className="flex gap-3 mb-5 flex-wrap">
        <input
          placeholder="Search trips…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={`${inputCls} w-64`}
        />
        <select value={subject} onChange={(e) => setSubject(e.target.value)} className={inputCls}>
          <option value="all">All subjects</option>
          {subjects.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
          <option value="all">All statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      <div className="border border-line rounded overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-ink-soft border-b border-line bg-ink/[.03]">
              <th className="px-4 py-3 font-semibold">Title</th>
              <th className="px-4 py-3 font-semibold">Subject</th>
              <th className="px-4 py-3 font-semibold">Country</th>
              <th className="px-4 py-3 font-semibold">Duration</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Featured</th>
              <th className="px-4 py-3 font-semibold">Updated</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.id} className="border-b border-line last:border-0 hover:bg-ink/[.02]">
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/trips/${row.id}`}
                    className="font-medium text-ink hover:text-teal-deep"
                  >
                    {row.title}
                  </Link>
                  <div className="text-xs text-ink-soft">/trips/{row.slug}</div>
                </td>
                <td className="px-4 py-3">{row.subject}</td>
                <td className="px-4 py-3">{row.country}</td>
                <td className="px-4 py-3 whitespace-nowrap">{row.duration}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${STATUS_STYLES[row.status]}`}
                  >
                    {row.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleFeatured(row)}
                    role="switch"
                    aria-checked={row.featured}
                    aria-label={`Featured: ${row.title}`}
                    className={`w-9 h-5 rounded-full transition-colors relative ${
                      row.featured ? 'bg-teal' : 'bg-ink/20'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${
                        row.featured ? 'left-[18px]' : 'left-0.5'
                      }`}
                    />
                  </button>
                </td>
                <td className="px-4 py-3 text-ink-soft whitespace-nowrap">
                  {new Date(row.updatedAt).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-ink-soft">
                  No trips match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
